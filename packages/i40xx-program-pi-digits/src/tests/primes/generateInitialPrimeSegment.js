/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';
import { VARIABLES, writeValueToMainChars } from '#utilities/memory.js';
import { numToHWNumber, hwNumberToNum } from '#utilities/numbers.js';

import {
  generateMemoryBankSwitch, generateMemoryMainCharactersInitialization, updateCodeForUseInEmulator,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5n;
const CYCLES_PER_SECOND = 95000n;

const runTest = (romDump, { segmentSize }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { memory, registers } = system;

  writeValueToMainChars(numToHWNumber(segmentSize), memory, VARIABLES.MAIN_MEM_VARIABLE_PRIME_SEGMENT_SIZE);
  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  const result = [];
  for (let initialSegmentPtr = VARIABLES.MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START * 0x10; ; initialSegmentPtr += 2) {
    const regNo = initialSegmentPtr >> 4;
    const charNo = initialSegmentPtr & 0xF;
    const firstDigit = memory[7].registers[regNo].main[charNo];
    const secondDigit = memory[7].registers[regNo].main[charNo + 1];
    if (firstDigit === 0x0) {
      break;
    }

    result.push(hwNumberToNum([firstDigit, secondDigit]));
  }

  return {
    result,
    elapsed: system.instructionCycles,
  };
};

const TESTS = [
  {
    input: { segmentSize: 118 },
    expected: [
      3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109,
      113,
    ],
  },
];

(function main() {
  const { roms, sourceCode } = compileCodeForTest('submodules/primeGenerator.i4040', 'generateInitialPrimeSegment');

  let sum = 0n;
  for (const { input, expected } of TESTS) {
    const { result, elapsed } = runTest(roms.map(({ data }) => data), input);

    if (expected.length !== result.length || expected.some((prime, idx) => result[idx] !== prime)) {
      console.log('Test failed');
      console.log(result);
      console.log('Code to reproduce:');
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryMainCharactersInitialization(
          VARIABLES.MAIN_MEM_VARIABLE_PRIME_SEGMENT_SIZE,
          numToHWNumber(input.segmentSize),
        ),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit(1);
    }

    sum += elapsed;
  }

  console.log(`Total time = ${(sum - PROLOGUE_CYCLES_COUNT) / CYCLES_PER_SECOND}s, ${sum} cycles`);
}());
