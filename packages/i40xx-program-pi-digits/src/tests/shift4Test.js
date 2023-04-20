/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';
import { updateCodeForUseInEmulator, generateRegisterInitialization } from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5;

const runLeftShiftTestStandard = (romDump, { shiftValue, value }) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = shiftValue;
  registers.indexBanks[0][13] = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: registers.indexBanks[0][13], elapsed: system.instructionCycles };
};

const runRightShiftTestStandard = (romDump, { shiftValue, value }) => {
  const system = new Emulator({ romDump });

  const { registers } = system;
  registers.acc = shiftValue;
  registers.indexBanks[0][12] = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: registers.indexBanks[0][12], elapsed: system.instructionCycles };
};

const runLeftShiftTestTable = (romDump, { shiftValue, value }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { registers } = system;
  registers.indexBanks[0][2] = shiftValue;
  registers.indexBanks[0][3] = 0x8;
  registers.acc = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: registers.indexBanks[0][13], elapsed: system.instructionCycles };
};

const runRightShiftTestTable = (romDump, { shiftValue, value }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { registers } = system;
  registers.indexBanks[0][4] = shiftValue;
  registers.indexBanks[0][5] = 0x0;
  registers.acc = value;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: registers.indexBanks[0][12], elapsed: system.instructionCycles };
};

(function main() {
  const variant = process.argv[2];

  if (!['table', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  let sum = 0;

  const { rom: shiftLeftRom, sourceCode: sourceCodeLeft } = compileCodeForTest(
    variant === 'table' ? 'submodules/shift4_table.i4040' : 'submodules/shift4.i4040',
    variant === 'table' ? 'shift4ByR1' : 'shiftLeft',
  );
  const runLeftShiftTest = variant === 'table' ? runLeftShiftTestTable : runLeftShiftTestStandard;

  for (let value = 0; value < 16; value++) {
    for (let shiftValue = 1; shiftValue <= 4; shiftValue++) {
      const expected = (value << shiftValue) & 0xF;
      const { result, elapsed } = runLeftShiftTest(shiftLeftRom, { shiftValue, value });
      if (result !== expected) {
        console.log(`Test for left shift failed, value = ${value}, shiftValue = ${shiftValue}, result = ${result}`);
        if (variant === 'table') {
          console.log('Code to reproduce:');

          const initializators = [
            generateRegisterInitialization(2, shiftValue),
            generateRegisterInitialization(3, 0x8),
            generateRegisterInitialization(6, value),
          ];

          console.log(updateCodeForUseInEmulator(sourceCodeLeft, initializators));
        }
        process.exit(1);
      }
      sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
    }
  }

  const { rom: shiftRightRom } = compileCodeForTest(
    variant === 'table' ? 'submodules/shift4_table.i4040' : 'submodules/shift4.i4040',
    variant === 'table' ? 'shift4ByR2' : 'shiftRight',
  );
  const runRightShiftTest = variant === 'table' ? runRightShiftTestTable : runRightShiftTestStandard;

  for (let value = 0; value < 16; value++) {
    for (let shiftValue = 1; shiftValue <= 4; shiftValue++) {
      const expected = (value >> shiftValue) & 0xF;
      const { result, elapsed } = runRightShiftTest(shiftRightRom, { shiftValue, value });
      if (result !== expected) {
        console.log(`Test for right shift failed, value = ${value}, shiftValue = ${shiftValue}, result = ${result}`);
        process.exit(1);
      }
      sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
    }
  }

  console.log('All tests are passed!');
  console.log(`Avg execution time: ${sum / (16 * 4 * 2)} cycles`);
}());
