/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilties/numbers.js';
import { compileCodeForTest } from '#utilties/compile.js';

import {
  addInitializationWithTestValues, generateMemoryMainCharactersInitialization, generateRegisterInitialization,
} from '#utilties/codeGenerator.js';

const runSingleTest = (romDump, { value, shiftCount }) => {
  const system = new Emulator({ romDump });

  const { memory, registers } = system;

  const hwValue = hexToHWNumber(value);
  // store value to memory
  for (const [idx, byte] of Object.entries(hwValue)) {
    memory[0].registers[8].main[idx] = byte;
  }

  // variable number
  registers.indexBanks[0][0] = 8;
  // index of most significant word
  registers.indexBanks[0][1] = hwValue.length - 1;
  // shift values
  registers.indexBanks[0][2] = shiftCount;
  registers.indexBanks[0][3] = 4 - shiftCount;

  while (!system.isFinished()) {
    system.instruction();
  }

  return hwNumberToHex(memory[0].registers[8].main);
};

const TESTS = [
  { input: { value: '0x1', shiftCount: 2 }, expected: '0x4' },
  { input: { value: '0x4', shiftCount: 2 }, expected: '0x10' },
  { input: { value: '0x82', shiftCount: 3 }, expected: '0x410' },
  // 0x8234567890000000 << 2 === 0x208d159e240000000, but MSD should be transferred to lowest word, because of bitwidth
  { input: { value: '0x8234567890000000', shiftCount: 2 }, expected: '0x8D159E240000002' },
];

const test = () => {
  const { rom, sourceCode } = compileCodeForTest(
    'submodules/shiftMulti.i4040',
    'shiftLeftVarFromMainMemory',
  );

  for (const { input, expected } of TESTS) {
    const result = runSingleTest(rom, input);
    if (expected.toLowerCase() !== result.toLowerCase()) {
      console.log(`Test failed, input = ${JSON.stringify(input)}, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');

      const hwValue = hexToHWNumber(input.value);
      const initializators = [
        generateMemoryMainCharactersInitialization(8, hwValue),
        generateRegisterInitialization(0, 8),
        generateRegisterInitialization(1, hwValue.length - 1),
        generateRegisterInitialization(2, input.shiftCount),
        generateRegisterInitialization(3, 4 - input.shiftCount),
      ];

      console.log(addInitializationWithTestValues(sourceCode, initializators));
      process.exit(1);
    }
  }

  console.log('All tests are passed!');
};

await test();
