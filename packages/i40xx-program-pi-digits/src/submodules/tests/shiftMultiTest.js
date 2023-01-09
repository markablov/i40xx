/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars } from '#utilities/memory.js';

import {
  addInitializationWithTestValues, generateMemoryBankSwitch, generateMemoryMainCharactersInitialization,
  generateRegisterInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from './data/ramWithLookupTables.json' assert { type: 'json' };

const testLeftShift = (romDump, { value, shiftCount }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { memory, registers } = system;

  const hwValue = hexToHWNumber(value);
  writeValueToMainChars(hwValue, memory, 8, 7);

  registers.ramControl = 0b1110;
  // variable number
  registers.indexBanks[0][0] = 8;
  // index of most significant word
  registers.indexBanks[0][1] = hwValue.length - 1;
  // shift values
  registers.indexBanks[0][2] = shiftCount;
  registers.indexBanks[0][3] = 0x8;
  registers.indexBanks[0][4] = 4 - shiftCount;
  registers.indexBanks[0][5] = 0x0;

  while (!system.isFinished()) {
    system.instruction();
  }

  return hwNumberToHex(memory[7].registers[8].main);
};

const testRightShift = (romDump, { value, shiftCount }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });

  const { memory, registers } = system;

  const hwValue = hexToHWNumber(value);
  writeValueToMainChars(hwValue, memory, 8, 7);

  registers.ramControl = 0b1110;
  // variable number
  registers.indexBanks[0][0] = 8;
  registers.indexBanks[0][1] = 0;
  // shift values
  registers.indexBanks[0][2] = shiftCount;
  registers.indexBanks[0][3] = 0x0;
  registers.indexBanks[0][4] = 4 - shiftCount;
  registers.indexBanks[0][5] = 0x8;
  // index of MSW
  registers.indexBanks[0][6] = hwValue.length - 1;

  while (!system.isFinished()) {
    system.instruction();
  }

  return hwNumberToHex(memory[7].registers[8].main);
};

const TESTS_LEFT = [
  { input: { value: '0x1', shiftCount: 2 }, expected: '0x4' },
  { input: { value: '0x4', shiftCount: 2 }, expected: '0x10' },
  { input: { value: '0x82', shiftCount: 3 }, expected: '0x410' },
  // 0x8234567890000000 << 2 === 0x208d159e240000000, but MSD should be transferred to lowest word, because of bitwidth
  { input: { value: '0x8234567890000000', shiftCount: 2 }, expected: '0x8D159E240000002' },
];

const TESTS_RIGHT = [
  { input: { value: '0x4', shiftCount: 2 }, expected: '0x1' },
  { input: { value: '0x10', shiftCount: 2 }, expected: '0x4' },
  { input: { value: '0x410', shiftCount: 3 }, expected: '0x82' },
  { input: { value: '0x8234567890000000', shiftCount: 2 }, expected: '0x208D159E24000000' },
];

(function test() {
  const { rom: romLeft, sourceCode: sourceCodeLeft } = compileCodeForTest(
    'submodules/shiftMulti.i4040',
    'shiftLeftVarFromMainMemory',
  );

  for (const { input, expected } of TESTS_LEFT) {
    const result = testLeftShift(romLeft, input);
    if (expected.toLowerCase() !== result.toLowerCase()) {
      console.log(`Test for left shift failed, input = ${JSON.stringify(input)}, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');

      const hwValue = hexToHWNumber(input.value);
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryMainCharactersInitialization(8, hwValue),
        generateRegisterInitialization(0, 8),
        generateRegisterInitialization(1, hwValue.length - 1),
        generateRegisterInitialization(2, input.shiftCount),
        generateRegisterInitialization(3, 8),
        generateRegisterInitialization(4, 4 - input.shiftCount),
        generateRegisterInitialization(5, 0),
      ];

      console.log(addInitializationWithTestValues(sourceCodeLeft, initializators));
      process.exit(1);
    }
  }

  const { rom: romRight, sourceCode: sourceCodeRight } = compileCodeForTest(
    'submodules/shiftMulti.i4040',
    'shiftRightVarFromMainMemory',
  );

  for (const { input, expected } of TESTS_RIGHT) {
    const result = testRightShift(romRight, input);
    if (expected.toLowerCase() !== result.toLowerCase()) {
      console.log(`Test for right shift failed, input = ${JSON.stringify(input)}, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');

      const hwValue = hexToHWNumber(input.value);
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryMainCharactersInitialization(8, hwValue),
        generateRegisterInitialization(0, 8),
        generateRegisterInitialization(1, 0),
        generateRegisterInitialization(2, input.shiftCount),
        generateRegisterInitialization(3, 0),
        generateRegisterInitialization(4, 4 - input.shiftCount),
        generateRegisterInitialization(5, 8),
        generateRegisterInitialization(6, hwValue.length - 1),
      ];

      console.log(addInitializationWithTestValues(sourceCodeRight, initializators));
      process.exit(1);
    }
  }

  console.log('All tests are passed!');
}());
