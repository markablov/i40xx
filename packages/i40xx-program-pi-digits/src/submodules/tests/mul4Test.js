/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilties/compile.js';

import RAM_DUMP from './data/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 4;

const runSingleTestStandard = (romDump, { a, b }) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.indexBanks[0][10] = a;
  registers.indexBanks[0][11] = b;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: (registers.indexBanks[0][13] << 4) + registers.indexBanks[0][12],
    elapsed: system.instructionCycles,
  };
};

const runSingleTestTable = (romDump, { a, b }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { registers } = system;
  registers.acc = a;
  registers.indexBanks[0][4] = b;
  registers.indexBanks[0][5] = 0x0;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: (registers.indexBanks[0][7] << 4) + registers.indexBanks[0][6],
    elapsed: system.instructionCycles,
  };
};

(function main() {
  const variant = process.argv[2];

  if (!['table', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  const { rom } = compileCodeForTest(
    variant === 'table' ? 'submodules/mul4_table.i4040' : 'submodules/mul4.i4040',
    'mul4x4',
  );

  const runSingleTest = variant === 'table' ? runSingleTestTable : runSingleTestStandard;

  let sum = 0;
  for (let a = 0; a < 16; a++) {
    for (let b = 0; b < 16; b++) {
      const expected = a * b;
      const { result, elapsed } = runSingleTest(rom, { a, b });
      if (result !== expected) {
        console.log(`Test failed, a = ${a}, b = ${b}, result = ${result}`);
        process.exit(1);
      }

      sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
    }
  }

  console.log('All tests are passed!');
  console.log(`Avg execution time: ${sum / (16 * 16)} cycles`);
}());
