/* eslint-disable no-console */

import Emulator from 'i40xx-emu';
import { compile } from 'i40xx-asm';
import * as fs from 'node:fs';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { updateCodeForUseInEmulator, generateMemoryBankSwitch } from '#utilities/codeGenerator.js';

import TESTS from './updateDigitsChunksTestData.json' assert { type: 'json' };

const getMemoryBankFromAbsoluteAddr = (addr) => {
  const bankNo = Math.floor(addr / 16);
  // when you are doing DCL 0x3, RAM bank 0x4 is selected and vice versa
  switch (bankNo) {
    case 3:
      return 4;
    case 4:
      return 3;
    default:
      return bankNo;
  }
};

const initMemoryWithInput = (memory, input) => {
  const { m, f, chunks, startingPosition, chunksCount } = input;

  writeValueToMainChars(hexToHWNumber(m), memory, 0x07, 7);
  writeValueToStatusChars(hexToHWNumber(f), memory, 0x0B, 7);
  writeValueToStatusChars(hexToHWNumber(startingPosition), memory, 0x0C, 7);
  writeValueToStatusChars(hexToHWNumber(chunksCount), memory, 0x06, 7);

  // write chunks
  for (const [idx, chunk] of chunks.entries()) {
    writeValueToMainChars(hexToHWNumber(chunk), memory, idx % 16, getMemoryBankFromAbsoluteAddr(idx));
  }
};

const runSingleTest = (romDump, input) => {
  const system = new Emulator({ romDump });
  const { memory, registers } = system;

  initMemoryWithInput(memory, input);
  // select 7th memory bank
  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  console.log(`  Cycles executed: ${system.instructionCycles.toString()}`);

  const res = [];
  for (let idx = 0; idx < input.chunksCount; idx++) {
    res.push(hwNumberToHex(memory[getMemoryBankFromAbsoluteAddr(idx)].registers[idx % 16].main));
  }

  return res;
};

const test = () => {
  const { rom, sourceCode } = compileCodeForTest('submodules/digitsChunks.i4040', 'updateDigitsChunks');

  for (const [idx, { input, expected }] of TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${TESTS.length} : m = ${input.m}, f = ${input.f}`);
    const result = runSingleTest(rom, input);
    const firstDiffIdx = expected.findIndex((exp, chunkIdx) => BigInt(exp) !== BigInt(result[chunkIdx]));
    const digitPosition = parseInt(input.startingPosition, 16) + firstDiffIdx * 9;
    if (firstDiffIdx !== -1) {
      console.log(`Test failed, first difference is on position ${digitPosition}: expected = ${expected[firstDiffIdx]}, received = ${result[firstDiffIdx]}!`);
      console.log('Code to reproduce (with initial memory dump stored at ram.json):');

      const emuCode = updateCodeForUseInEmulator(sourceCode, [generateMemoryBankSwitch(0x07)]);
      const { sourceCode: rearrangedEmuCode, errors } = compile(emuCode, { tryRearrange: true });
      if (errors.length) {
        console.log('COULD NOT COMPILE CODE FOR EMULATOR!');
        console.log(errors);
        process.exit(1);
      }

      const ramDump = Array.from(
        Array(8),
        () => Array.from(Array(16), () => ({ main: Array(16).fill(0), status: Array(4).fill(0) })),
      );
      initMemoryWithInput(ramDump, input);
      fs.writeFileSync('./ram.dump', JSON.stringify(ramDump, undefined, 2));

      console.log(rearrangedEmuCode);
      process.exit(1);
    }
  }
};

await test();
