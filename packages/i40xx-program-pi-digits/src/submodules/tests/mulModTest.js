/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars, writeValueToStatusChars, VARIABLES } from '#utilities/memory.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
  generateRegisterInitialization, generateMemoryMainCharactersInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from './data/ramWithLookupTables.json' assert { type: 'json' };

const runSingleTest = (romDump, { a, b, m }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS, 7);
  writeValueToStatusChars(hexToHWNumber(a), memory, 0x03, 7);
  writeValueToStatusChars(hexToHWNumber(b), memory, 0x04, 7);

  // for binary
  writeValueToMainChars(hexToHWNumber(m), memory, 0x07, 7);

  registers.ramControl = 0b1110;
  registers.indexBanks[0][14] = 4;
  registers.indexBanks[0][15] = 3;
  registers.indexBanks[1][14] = 4;
  registers.indexBanks[1][15] = 3;

  while (!system.isFinished()) {
    system.instruction();
  }

  return { result: hwNumberToHex(memory[7].registers[0x3].status), elapsed: system.instructionCycles };
};

const TESTS = [
  { input: { a: '0xB', b: '0xB', m: '0x533' }, expected: '0x79' },
  { input: { a: '0x1', b: '0x79', m: '0x533' }, expected: '0x79' },
  { input: { a: '0x79', b: '0x79', m: '0x533' }, expected: '0x0' },
  { input: { a: '0x1', b: '0x4E2', m: '0x533' }, expected: '0x4E2' },
  { input: { a: '0x4E2', b: '0x4E2', m: '0x533' }, expected: '0x4D5' },
  { input: { a: '0x4D5', b: '0x4D5', m: '0x533' }, expected: '0x352' },
  { input: { a: '0x352', b: '0x352', m: '0x533' }, expected: '0x44A' },
  { input: { a: '0x4E2', b: '0x44A', m: '0x533' }, expected: '0xEF' },
  { input: { a: '0x44A', b: '0x44A', m: '0x533' }, expected: '0x419' },
  { input: { a: '0xEF', b: '0x419', m: '0x533' }, expected: '0x1E3' },
  { input: { a: '0x419', b: '0x419', m: '0x533' }, expected: '0x3E3' },
  { input: { a: '0x1E3', b: '0x3E3', m: '0x533' }, expected: '0x5E' },
  { input: { a: '0x3E3', b: '0x3E3', m: '0x533' }, expected: '0x444' },
  { input: { a: '0x444', b: '0x444', m: '0x533' }, expected: '0x4C3' },
  { input: { a: '0x5E', b: '0x4C3', m: '0x533' }, expected: '0x78' },
  { input: { a: '0x4C3', b: '0x4C3', m: '0x533' }, expected: '0x235' },
  { input: { a: '0x235', b: '0x235', m: '0x533' }, expected: '0x45C' },
  { input: { a: '0x45C', b: '0x45C', m: '0x533' }, expected: '0x3CB' },
  { input: { a: '0x78', b: '0x3CB', m: '0x533' }, expected: '0x2D3' },
  { input: { a: '0x3CB', b: '0x3CB', m: '0x533' }, expected: '0x1ED' },
];

(function () {
  const variant = process.argv[2];

  if (!['binary', 'binary_fast', 'standard'].includes(variant)) {
    console.log(`Unknown code variant "${variant}"!`);
    process.exit(0);
  }

  const { sourceCode, rom } = compileCodeForTest(
    variant === 'standard' ? 'submodules/mulMod.i4040' : `submodules/mulMod_${variant}.i4040`,
    'mulMod',
  );

  let sum = 0n;
  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length} : ${JSON.stringify(input)}...`);
    const { result, elapsed } = runSingleTest(rom, input);
    if (parseInt(expected, 16) !== parseInt(result, 16)) {
      console.log(`Test failed, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(0xD, hexToHWNumber(input.m)),
        generateMemoryStatusCharactersInitialization(0x3, hexToHWNumber(input.a)),
        generateMemoryStatusCharactersInitialization(0x4, hexToHWNumber(input.b)),
        generateMemoryMainCharactersInitialization(0x7, hexToHWNumber(input.m)),
        generateRegisterInitialization(14, 0x4),
        generateRegisterInitialization(15, 0x3),
      ];

      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit(1);
    }

    sum += elapsed;
  }

  console.log(`Avg: ${sum / BigInt(TESTS.length)}`);
}());
