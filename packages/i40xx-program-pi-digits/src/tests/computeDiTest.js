/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';

const TESTS = [
  { input: { m: '0x19A1', f: '0x1612', digitPosition: '0x1B0' }, expected: '0x1379EECF4D801' },
];

const runSingleTest = (romDump, { m, f, digitPosition }) => {
  const system = new Emulator({ romDump });
  const { memory, registers } = system;

  writeValueToMainChars(hexToHWNumber(m), memory, 0x07, 7);
  writeValueToStatusChars(hexToHWNumber(f), memory, 0x0B, 7);
  writeValueToStatusChars(hexToHWNumber(digitPosition), memory, 0x0A, 7);

  // select 7th memory bank
  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return hwNumberToHex(memory[7].registers[0x0A].main);
};

const test = () => {
  const { rom } = compileCodeForTest('submodules/digitsChunks.i4040', 'computeDi');

  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length} : m = ${input.m}, f = ${input.f}, digitPosition = ${input.digitPosition}`);
    const result = runSingleTest(rom, input);
    if (expected.toLowerCase() !== result.toLowerCase()) {
      console.log(`Test failed, expected = ${expected}, received = ${result}!`);
      process.exit(1);
    }
  }
};

await test();
