/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilties/numbers.js';
import { compileCodeForTest } from '#utilties/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilties/memory.js';

const runSingleTest = (romDump, loopIterationCodeOffset, { N, v, vmax, m, a }) => {
  const system = new Emulator({ romDump });
  const { memory, registers } = system;

  writeValueToMainChars(hexToHWNumber(m), memory, 0x07);
  writeValueToMainChars(hexToHWNumber(a), memory, 0x09);
  writeValueToStatusChars(hexToHWNumber(N), memory, 0x0E);
  writeValueToStatusChars([0x0, 0x0, vmax, v], memory, 0x06);

  let iters = 0;
  while (!system.isFinished()) {
    if (registers.pc === loopIterationCodeOffset) {
      iters++;
      if (iters % 100 === 0) {
        console.log(`  Function inner loop iterations executed: ${iters} / ${parseInt(N, 16)}...`);
      }
    }

    system.instruction();
  }

  console.log(`  Cycles executed: ${system.instructionCycles.toString()}`);

  return hwNumberToHex(memory[0].registers[0x0B].status);
};

const TESTS = [
  { input: { N: '0xD74', v: 6, vmax: 8, m: '0x19A1', a: '0x3' }, expected: '0x1612' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x67', a: '0x67' }, expected: '0x25' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x107', a: '0x107' }, expected: '0xC9' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x287', a: '0x287' }, expected: '0xE5' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x32B', a: '0x32B' }, expected: '0x1F3' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x3A9', a: '0x3A9' }, expected: '0x2C9' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x41B', a: '0x41B' }, expected: '0x3D2' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x679', a: '0x679' }, expected: '0x22B' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0x95F', a: '0x95F' }, expected: '0x95D' },
  { input: { N: '0xD74', v: 0, vmax: 1, m: '0xB29', a: '0xB29' }, expected: '0x2' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0xE57', a: '0xE57' }, expected: '0x43C' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x1025', a: '0x1025' }, expected: '0x99A' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x1511', a: '0x1511' }, expected: '0x656' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x1A6B', a: '0x1A6B' }, expected: '0x117F' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x1AD7', a: '0x1AD7' }, expected: '0x1626' },
  { input: { N: '0xD74', v: 1, vmax: 1, m: '0x1AE3', a: '0x1AE3' }, expected: '0x328' },
  { input: { N: '0x1AC5', v: 1, vmax: 3, m: '0x533', a: '0xB' }, expected: '0x3D5' },
  { input: { N: '0x1AC5', v: 1, vmax: 2, m: '0x1189', a: '0x43' }, expected: '0x5FB' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0xC5', a: '0xC5' }, expected: '0x4F' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x3D7', a: '0x3D7' }, expected: '0x17' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x709', a: '0x709' }, expected: '0x325' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x9AD', a: '0x9AD' }, expected: '0x525' },
  { input: { N: '0x1AC5', v: 0, vmax: 1, m: '0xCEB', a: '0xCEB' }, expected: '0x89A' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x10B1', a: '0x10B1' }, expected: '0xB0B' },
  { input: { N: '0x1AC5', v: 0, vmax: 1, m: '0x12B9', a: '0x12B9' }, expected: '0x2' },
  { input: { N: '0x1AC5', v: 0, vmax: 1, m: '0x16F7', a: '0x16F7' }, expected: '0x16F5' },
  { input: { N: '0x1AC5', v: 0, vmax: 1, m: '0x1A51', a: '0x1A51' }, expected: '0x2' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x1F97', a: '0x1F97' }, expected: '0x17BE' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x2231', a: '0x2231' }, expected: '0x849' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x2683', a: '0x2683' }, expected: '0x13F6' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x2C09', a: '0x2C09' }, expected: '0xDE0' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x3071', a: '0x3071' }, expected: '0xCD5' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x3413', a: '0x3413' }, expected: '0x1996' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x357D', a: '0x357D' }, expected: '0x20F5' },
  { input: { N: '0x1AC5', v: 1, vmax: 1, m: '0x3581', a: '0x3581' }, expected: '0xFAA' },
];

const test = () => {
  const { rom, labelsOffsets } = compileCodeForTest('submodules/computeF.i4040', 'computeF');

  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length} : ${JSON.stringify(input)}...`);
    const result = runSingleTest(rom, labelsOffsets.computef_loop, input);
    if (parseInt(expected, 16) !== parseInt(result, 16)) {
      console.log(`Test failed, input = ${JSON.stringify(input)}, expected = ${expected}, result = ${result}`);
      process.exit(1);
    }
    console.log(`Test passed, output = ${result}`);
  }
};

await test();
