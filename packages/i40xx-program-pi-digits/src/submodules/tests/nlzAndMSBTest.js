/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilties/compile.js';

const PROLOGUE_CYCLES_COUNT = 4;

const runSingleTestStandard = (romDump, value) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      nlz: registers.indexBanks[0][2],
      shiftDirection0: 0x0,
      msb: registers.indexBanks[0][3],
      shiftDirection1: 0x8,
    },
    elapsed: system.instructionCycles,
  };
};

const runSingleTestFast = (romDump, value) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    result: {
      nlz: registers.indexBanks[0][2],
      shiftDirection0: registers.indexBanks[0][3],
      msb: registers.indexBanks[0][4],
      shiftDirection1: registers.indexBanks[0][5],
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
    variant === 'fast' ? 'submodules/nlz_fast.i4040' : 'submodules/nlz.i4040',
    'nlzAndMSB',
  );

  const runSingleTest = variant === 'fast' ? runSingleTestFast : runSingleTestStandard;

  let sum = 0;
  for (let value = 0; value < 16; value++) {
    const expectedNlz = value === 0 ? 4 : value.toString(2).padStart(4, '0').indexOf('1');
    const expectedMsb = 4 - expectedNlz;
    const { result: { nlz, shiftDirection0, msb, shiftDirection1 }, elapsed } = runSingleTest(rom, value);
    if (shiftDirection0 !== 0x0 || shiftDirection1 !== 0x8 || nlz !== expectedNlz || msb !== expectedMsb) {
      console.log(`Test failed, value = ${value}`, { nlz, shiftDirection0, msb, shiftDirection1 });
      process.exit(1);
    }

    sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
  }

  console.log('All tests are passed!');
  console.log(`Avg execution time: ${sum / 16} cycles`);
}());
