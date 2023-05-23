/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';
import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { numToHWNumber } from '#utilities/numbers.js';

const PROLOGUE_CYCLES_COUNT = 5n;
const CYCLES_PER_SECOND = 95000n;

const INITIAL_SEGMENT_PRIMES = [
  3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
];

const runTest = (romDump, currentPrimeIdx) => {
  const system = new Emulator({ romDump });

  const { memory, registers } = system;

  writeValueToStatusChars(
    numToHWNumber(currentPrimeIdx * 2),
    memory,
    VARIABLES.STATUS_MEM_VARIABLE_POINTER_TO_PRIME_FROM_INITIAL_SEGMENT,
  );

  for (const [primeIdx, prime] of [...INITIAL_SEGMENT_PRIMES, 0].entries()) {
    const segmentPtr = primeIdx * 2;
    const regNo = segmentPtr >> 4;
    const charNo = segmentPtr & 0xF;
    memory[7].registers[regNo].main[charNo] = prime & 0xF;
    memory[7].registers[regNo].main[charNo + 1] = prime >> 4;
  }

  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: registers.acc === 1 ? 0 : (registers.indexBanks[0][10] + (registers.indexBanks[0][11] << 4)),
    elapsed: system.instructionCycles,
  };
};

(function main() {
  const { roms } = compileCodeForTest('submodules/primeGenerator.i4040', 'getNextPrimeFromInitialSegment');

  let sum = 0n;
  for (const [primeIdx, prime] of [...INITIAL_SEGMENT_PRIMES, 0].entries()) {
    const { result, elapsed } = runTest(roms.map(({ data }) => data), primeIdx);
    if (result !== prime) {
      console.log(`Test failed, expected = ${prime}, result = ${result}`);
      process.exit(1);
    }
    sum += elapsed;
  }

  console.log(`Total time = ${(sum - PROLOGUE_CYCLES_COUNT) / CYCLES_PER_SECOND}s, ${sum} cycles`);
}());
