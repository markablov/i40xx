/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToStatusChars, VARIABLES } from '#utilities/memory.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
  generateRegisterInitialization, generateAccumulatorInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from './data/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5;

const runSingleTest = (romDump, { base, exp }, variant) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(base), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, 7);

  registers.ramControl = 0b1110;

  if (variant === 'standard') {
    registers.indexBanks[0][6] = exp;
  } else {
    registers.acc = exp - 1;
  }

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: hwNumberToHex(memory[7].registers[0x5].status), elapsed: system.instructionCycles };
};

const TESTS = [
  { input: { base: '0x3', exp: 7 }, expected: '0x88B' },
  { input: { base: '0x3', exp: 6 }, expected: '0x2D9' },
  { input: { base: '0x3', exp: 5 }, expected: '0xF3' },
  { input: { base: '0x3', exp: 4 }, expected: '0x51' },
  { input: { base: '0x5', exp: 4 }, expected: '0x271' },
  { input: { base: '0x3', exp: 3 }, expected: '0x1B' },
  { input: { base: '0x7', exp: 3 }, expected: '0x157' },
  { input: { base: '0x5', exp: 3 }, expected: '0x7D' },
  { input: { base: '0x3', exp: 2 }, expected: '0x9' },
  { input: { base: '0x5', exp: 2 }, expected: '0x19' },
  { input: { base: '0x7', exp: 2 }, expected: '0x31' },
  { input: { base: '0xB', exp: 2 }, expected: '0x79' },
  { input: { base: '0xD', exp: 2 }, expected: '0xA9' },
  { input: { base: '0x11', exp: 2 }, expected: '0x121' },
  { input: { base: '0x13', exp: 2 }, expected: '0x169' },
  { input: { base: '0x17', exp: 2 }, expected: '0x211' },
];

(function () {
  const variant = process.argv[2];

  if (!['fast', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  const { sourceCode, rom } = compileCodeForTest(
    variant === 'standard' ? 'submodules/powerMod.i4040' : 'submodules/power8.i4040',
    variant === 'standard' ? 'modularPowerForCurrentPrimeByExp' : 'powerCurrentPrime',
  );

  let sum = 0;
  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length} : ${JSON.stringify(input)}...`);
    const { result, elapsed } = runSingleTest(rom, input, variant);
    if (parseInt(expected, 16) !== parseInt(result, 16)) {
      console.log(`Test failed, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');
      const { exp, base } = input;
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(base)),
        variant === 'standard' ? generateRegisterInitialization(6, exp) : generateAccumulatorInitialization(exp - 1),
      ];

      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit(1);
    }

    sum += (Number(elapsed) - PROLOGUE_CYCLES_COUNT);
  }

  console.log(`Avg: ${sum / TESTS.length}`);
}());
