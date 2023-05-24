/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';
import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { numToHWNumber } from '#utilities/numbers.js';

import {
  generateMemoryBankSwitch, generateMemoryMainCharactersInitialization, generateMemoryStatusCharactersInitialization,
  updateCodeForUseInEmulator,
} from '#utilities/codeGenerator.js';

const CYCLES_PER_SECOND = 95000n;

const INITIAL_SEGMENT_PRIMES = [
  3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
];

const runTest = (romDump) => {
  let currentLowDigit = null;
  const result = [];
  const system = new Emulator({
    romDump,
    ramOutputHandler: ({ data }) => {
      if (currentLowDigit !== null) {
        result.push((data << 4) + currentLowDigit);
        currentLowDigit = null;
        return;
      }

      currentLowDigit = data;
    },
  });

  const { memory, registers } = system;

  writeValueToStatusChars(
    numToHWNumber(VARIABLES.MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START << 4),
    memory,
    VARIABLES.STATUS_MEM_VARIABLE_POINTER_TO_PRIME_FROM_INITIAL_SEGMENT,
  );

  for (const [primeIdx, prime] of [...INITIAL_SEGMENT_PRIMES, 0].entries()) {
    const segmentPtr = primeIdx * 2;
    const regNo = VARIABLES.MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START + (segmentPtr >> 4);
    const charNo = segmentPtr & 0xF;
    memory[7].registers[regNo].main[charNo] = prime & 0xF;
    memory[7].registers[regNo].main[charNo + 1] = prime >> 4;
  }

  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result, elapsed: system.instructionCycles };
};

const wrapSourceCode = (sourceCode) => `
entrypoint:
test_loop:
  JMS getNextPrimeFromInitialSegment
  JCN nz, test_end
  LD rr10
  WMP
  LD rr11
  WMP
  JUN test_loop
test_end:
  HLT

${sourceCode}
`;

(function main() {
  const { roms, sourceCode } = compileCodeForTest('submodules/primeGenerator.i4040', '', { wrapSourceCode });

  const expected = INITIAL_SEGMENT_PRIMES;
  const { result, elapsed } = runTest(roms.map(({ data }) => data));
  if (expected.length !== result.length || expected.some((prime, idx) => result[idx] !== prime)) {
    console.log(`Test failed, result = ${result}`);
    console.log('Code to reproduce:');

    const regs = [];
    for (const [primeIdx, prime] of [...INITIAL_SEGMENT_PRIMES, 0].entries()) {
      const segmentPtr = primeIdx * 2;
      const regNo = (segmentPtr >> 4);
      const charNo = segmentPtr & 0xF;
      if (!regs[regNo]) {
        regs[regNo] = [];
      }

      regs[regNo][charNo] = prime & 0xF;
      regs[regNo][charNo + 1] = prime >> 4;
    }

    const initializators = [
      generateMemoryBankSwitch(0x7),
      generateMemoryStatusCharactersInitialization(
        VARIABLES.STATUS_MEM_VARIABLE_POINTER_TO_PRIME_FROM_INITIAL_SEGMENT,
        numToHWNumber(VARIABLES.MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START << 4),
      ),
      ...regs.map(
        (reg, idx) => (
          generateMemoryMainCharactersInitialization(idx + VARIABLES.MAIN_MEM_VARIABLE_INITIAL_SEGMENT_START, reg)
        ),
      ),
    ];
    console.log(updateCodeForUseInEmulator(sourceCode, initializators));
    process.exit(1);
  }

  const pureElapsed = elapsed - BigInt(result.length) * 11n - 1n;
  console.log(`Total time = ${pureElapsed / CYCLES_PER_SECOND}s, ${pureElapsed} cycles`);
}());
