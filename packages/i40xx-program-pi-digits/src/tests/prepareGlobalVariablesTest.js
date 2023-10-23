/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToNum } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToStatusChars, VARIABLES } from '#utilities/memory.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5n;
const CYCLES_PER_SECOND = 92500n;

const runSingleTest = (romDump, { digitsCount, startingPiDigitsPosition }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { memory, registers } = system;

  const startingDigitsPositionHW = hexToHWNumber(startingPiDigitsPosition);
  writeValueToStatusChars(hexToHWNumber(digitsCount), memory, VARIABLES.STATUS_MEM_VARIABLE_DIGITS_COUNT);
  writeValueToStatusChars(startingDigitsPositionHW, memory, VARIABLES.STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION);

  registers.ramControl = 0b1110;
  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    elapsed: system.instructionCycles,
    result: {
      chunksCount: 0x100 - hwNumberToNum(memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_CHUNKS_COUNT_NEG].status),
      N: 0x10000 - hwNumberToNum(memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_N_NEG].status) - 1,
      doubledN: 0x10000 - hwNumberToNum(memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_DOUBLED_N_NEG].status),
      sqrtOfDoubledN: hwNumberToNum(memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_SQRT_OF_DOUBLE_N].status),
    },
  };
};

const TESTS = [
  {
    input: { digitsCount: '0x402', startingPiDigitsPosition: '0x0' },
    expected: { chunksCount: 114, N: 3444, doubledN: 6888, sqrtOfDoubledN: 83 },
  },
  {
    input: { digitsCount: '0x402', startingPiDigitsPosition: '0x402' },
    expected: { chunksCount: 114, N: 6852, doubledN: 13704, sqrtOfDoubledN: 118 },
  },
];

const VALUES_TO_CHECK = ['chunksCount', 'N', 'doubledN', 'sqrtOfDoubledN'];

(function main() {
  const { roms, sourceCode } = compileCodeForTest('submodules/prepareGlobalVariables.i4040', 'prepareGlobalVariables');

  let sum = 0n;
  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length}...`);
    const { result, elapsed } = runSingleTest(roms.map(({ data }) => data), input);
    const wrongValue = VALUES_TO_CHECK.find((valueName) => result[valueName] !== expected[valueName]);
    if (wrongValue) {
      console.log(`Test failed, wrong value for ${wrongValue}, result = ${result[wrongValue]}, expected = ${expected[wrongValue]}`);

      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(
          VARIABLES.STATUS_MEM_VARIABLE_DIGITS_COUNT,
          hexToHWNumber(input.digitsCount),
        ),
        generateMemoryStatusCharactersInitialization(
          VARIABLES.STATUS_MEM_VARIABLE_STARTING_PI_DIGITS_POSITION,
          hexToHWNumber(input.startingPiDigitsPosition),
        ),
      ];
      console.log('Code to reproduce:');
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));

      process.exit(1);
    }

    sum += (elapsed - PROLOGUE_CYCLES_COUNT);
  }

  console.log(`Total time = ${sum / CYCLES_PER_SECOND}s, ${sum} cycles`);
}());
