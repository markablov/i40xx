/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';

const PROLOGUE_CYCLES_COUNT = 5;

const runSingleTestStandard = (romDump, { dividend, divisor }) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = dividend;
  registers.indexBanks[0][11] = divisor;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      quotient: registers.indexBanks[0][12],
      reminder: registers.indexBanks[0][13],
    },
    elapsed: system.instructionCycles,
  };
};

const runSingleTestFast = (romDump, { dividend, divisor }) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = dividend;
  registers.indexBanks[0][10] = divisor;
  registers.indexBanks[0][11] = 0x0;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      quotient: registers.indexBanks[0][12],
      reminder: registers.indexBanks[0][13],
    },
    elapsed: system.instructionCycles,
  };
};

(function main() {
  const variant = process.argv[2];

  if (!['fast', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  const { rom } = compileCodeForTest(
    variant === 'fast' ? 'submodules/div4_fast.i4040' : 'submodules/div4.i4040',
    'div4x4',
  );

  const runSingleTest = variant === 'fast' ? runSingleTestFast : runSingleTestStandard;

  let sum = 0;
  for (let dividend = 0; dividend < 16; dividend++) {
    for (let divisor = 1; divisor < 16; divisor++) {
      const expectedQuotient = Math.trunc(dividend / divisor);
      const expectedReminder = dividend % divisor;
      const { result: { quotient, reminder }, elapsed } = runSingleTest(rom, { dividend, divisor });
      if (quotient !== expectedQuotient || reminder !== expectedReminder) {
        console.log(`Test failed, result: quotient = ${quotient}, reminder = ${reminder}`, { dividend, divisor });
        process.exit(1);
      }

      sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
    }
  }

  console.log('All tests are passed!');
  console.log(`Avg execution time: ${Math.round((sum / (16 * 15)) * 100) / 100} cycles`);
}());
