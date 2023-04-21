/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToStatusChars, VARIABLES } from '#utilities/memory.js';

import {
  generateCodeToPrepareModulusBasedDataForEmulator, putModulusBasedDataIntoMemory,
} from '#data/multiplicationModulusData/multDataGenerator.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const jsser = (obj) => JSON.stringify(obj);

const runComputeFTest = (romDump, labelOffsetForProgress, { N, vmax, m, a }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(hexToHWNumber(N), memory, VARIABLES.STATUS_MEM_VARIABLE_N);
  writeValueToStatusChars([0x0, 0x0, vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  registers.ramControl = 0b1110;

  let iters = 0;
  while (!system.isFinished()) {
    if (registers.pc === labelOffsetForProgress) {
      iters++;
      if (iters % 100 === 0) {
        console.log(`  Function inner loop iterations executed: ${iters} / ${parseInt(N, 16)}...`);
      }
    }

    system.instruction();
  }

  console.log(`  Cycles executed: ${system.instructionCycles.toString()}`);

  return {
    result: hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status),
    elapsed: system.instructionCycles,
  };
};

const runUpdateBTest = (romDump, { m, v, k, b, a }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars([0x0, 0x0, 0x0, v], memory, VARIABLES.STATUS_MEM_VARIABLE_V, 7);
  writeValueToStatusChars(hexToHWNumber(k), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, 7);
  writeValueToStatusChars(hexToHWNumber(b), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_B, 7);
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, 7);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    b: hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_B].status),
    v: memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_V].status[3],
  };
};

const runUpdateATest = (romDump, { m, v, k, A, a }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars([0x0, 0x0, 0x0, v], memory, VARIABLES.STATUS_MEM_VARIABLE_V, 7);
  writeValueToStatusChars(hexToHWNumber(k), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, 7);
  writeValueToStatusChars(hexToHWNumber(A), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A, 7);
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, 7);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return {
    A: hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A].status),
    v: memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_V].status[3],
  };
};

const runUpdateFTest = (romDump, { k, f, v, vmax, m, b, A, a }) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(k), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, 7);
  writeValueToStatusChars(hexToHWNumber(f), memory, VARIABLES.STATUS_MEM_VARIABLE_F, 7);
  writeValueToStatusChars([0x0, 0x0, vmax, v], memory, VARIABLES.STATUS_MEM_VARIABLE_V, 7);
  writeValueToStatusChars(hexToHWNumber(A), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A, 7);
  writeValueToStatusChars(hexToHWNumber(b), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_B, 7);
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, 7);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  return hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);
};

const COMPUTE_F_TESTS = [
  { input: { N: '0xD74', vmax: 8, m: '0x19A1', a: '0x3' }, expected: '0x1612' },
  { input: { N: '0xD74', vmax: 1, m: '0x67', a: '0x67' }, expected: '0x25' },
  { input: { N: '0xD74', vmax: 1, m: '0x107', a: '0x107' }, expected: '0xC9' },
  { input: { N: '0xD74', vmax: 1, m: '0x287', a: '0x287' }, expected: '0xE5' },
  { input: { N: '0xD74', vmax: 1, m: '0x32B', a: '0x32B' }, expected: '0x1F3' },
  { input: { N: '0xD74', vmax: 1, m: '0x3A9', a: '0x3A9' }, expected: '0x2C9' },
  { input: { N: '0xD74', vmax: 1, m: '0x41B', a: '0x41B' }, expected: '0x3D2' },
  { input: { N: '0xD74', vmax: 1, m: '0x679', a: '0x679' }, expected: '0x22B' },
  { input: { N: '0xD74', vmax: 1, m: '0x95F', a: '0x95F' }, expected: '0x95D' },
  { input: { N: '0xD74', vmax: 1, m: '0xB29', a: '0xB29' }, expected: '0x2' },
  { input: { N: '0xD74', vmax: 1, m: '0xE57', a: '0xE57' }, expected: '0x43C' },
  { input: { N: '0xD74', vmax: 1, m: '0x1025', a: '0x1025' }, expected: '0x99A' },
  { input: { N: '0xD74', vmax: 1, m: '0x1511', a: '0x1511' }, expected: '0x656' },
  { input: { N: '0xD74', vmax: 1, m: '0x1A6B', a: '0x1A6B' }, expected: '0x117F' },
  { input: { N: '0xD74', vmax: 1, m: '0x1AD7', a: '0x1AD7' }, expected: '0x1626' },
  { input: { N: '0xD74', vmax: 1, m: '0x1AE3', a: '0x1AE3' }, expected: '0x328' },
  { input: { N: '0x1AC5', vmax: 3, m: '0x533', a: '0xB' }, expected: '0x3D5' },
  { input: { N: '0x1AC5', vmax: 2, m: '0x1189', a: '0x43' }, expected: '0x5FB' },
  { input: { N: '0x1AC5', vmax: 1, m: '0xC5', a: '0xC5' }, expected: '0x4F' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x3D7', a: '0x3D7' }, expected: '0x17' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x709', a: '0x709' }, expected: '0x325' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x9AD', a: '0x9AD' }, expected: '0x525' },
  { input: { N: '0x1AC5', vmax: 1, m: '0xCEB', a: '0xCEB' }, expected: '0x89A' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x10B1', a: '0x10B1' }, expected: '0xB0B' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x12B9', a: '0x12B9' }, expected: '0x2' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x16F7', a: '0x16F7' }, expected: '0x16F5' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x1A51', a: '0x1A51' }, expected: '0x2' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x1F97', a: '0x1F97' }, expected: '0x17BE' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x2231', a: '0x2231' }, expected: '0x849' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x2683', a: '0x2683' }, expected: '0x13F6' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x2C09', a: '0x2C09' }, expected: '0xDE0' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x3071', a: '0x3071' }, expected: '0xCD5' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x3413', a: '0x3413' }, expected: '0x1996' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x357D', a: '0x357D' }, expected: '0x20F5' },
  { input: { N: '0x1AC5', vmax: 1, m: '0x3581', a: '0x3581' }, expected: '0xFAA' },
];

const testComputeF = () => {
  console.log('Testing computeF routine...');

  const { rom, symbols, sourceMap, sourceCode } = compileCodeForTest('submodules/computeF.i4040', 'computeF');

  const labelOffsetForProgress = symbols.find(({ label }) => label === 'computef_loop').romAddress;
  let sum = 0n;
  for (const [idx, { input, expected }] of COMPUTE_F_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${COMPUTE_F_TESTS.length} : ${jsser(input)}...`);
    const { result, elapsed } = runComputeFTest(rom, labelOffsetForProgress, input);
    if (parseInt(expected, 16) !== parseInt(result, 16)) {
      console.log(`Test failed, input = ${jsser(input)}, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');
      const { N, m, a, vmax } = input;
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_V, [0x0, 0x0, vmax, 0x00]),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_N, hexToHWNumber(N)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(a)),
        ...generateCodeToPrepareModulusBasedDataForEmulator(parseInt(m, 16)),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators, sourceMap, symbols));
      process.exit(1);
    }
    sum += elapsed;
  }

  console.log(`Avg for computeF: ${sum / BigInt(COMPUTE_F_TESTS.length)}`);
};

const UPDATE_B_TESTS = [
  { input: { k: '0x72A', v: 0, m: '0xE3', b: '0x4C', a: '0xE3' }, expected: { b: '0x6', v: 0 } },
  { input: { k: '0x305', v: 0, m: '0xEF', b: '0x21', a: '0xEF' }, expected: { b: '0xAF', v: 0 } },
  { input: { k: '0xCE7', v: 0, m: '0x209', b: '0x1CC', a: '0x209' }, expected: { b: '0x90', v: 0 } },
  { input: { k: '0xCE7', v: 1, m: '0x251', b: '0x55', a: '0x251' }, expected: { b: '0x10A', v: 1 } },
  { input: { k: '0x423', v: 0, m: '0x347', b: '0x58', a: '0x347' }, expected: { b: '0x3F', v: 0 } },
  { input: { k: '0x715', v: 1, m: '0x3CB', b: '0x12C', a: '0x3CB' }, expected: { b: '0x8C', v: 1 } },
  { input: { k: '0x523', v: 0, m: '0x419', b: '0x20A', a: '0x419' }, expected: { b: '0x180', v: 0 } },
  { input: { k: '0x97B', v: 1, m: '0x50B', b: '0x2CB', a: '0x50B' }, expected: { b: '0xC9', v: 1 } },
  { input: { k: '0x186', v: 0, m: '0x58F', b: '0x2A9', a: '0x58F' }, expected: { b: '0x390', v: 0 } },
  { input: { k: '0x6FC', v: 0, m: '0x5BF', b: '0x5B2', a: '0x5BF' }, expected: { b: '0x124', v: 0 } },
  { input: { k: '0x72F', v: 0, m: '0x6F1', b: '0x64C', a: '0x6F1' }, expected: { b: '0x1B0', v: 0 } },
  { input: { k: '0xF5', v: 0, m: '0x833', b: '0x4A3', a: '0x833' }, expected: { b: '0x481', v: 0 } },
  { input: { k: '0xDF', v: 0, m: '0x8AD', b: '0x268', a: '0x8AD' }, expected: { b: '0x75F', v: 0 } },
  { input: { k: '0x25', v: 0, m: '0x8BD', b: '0x4A9', a: '0x8BD' }, expected: { b: '0x666', v: 0 } },
  { input: { k: '0xA0E', v: 0, m: '0x8DD', b: '0x8AC', a: '0x8DD' }, expected: { b: '0x3AA', v: 0 } },
  { input: { k: '0x91E', v: 1, m: '0x955', b: '0x1F', a: '0x955' }, expected: { b: '0x2AC', v: 1 } },
  { input: { k: '0x957', v: 1, m: '0xA13', b: '0x47D', a: '0xA13' }, expected: { b: '0x270', v: 1 } },
  { input: { k: '0x7C0', v: 1, m: '0xA61', b: '0xF6', a: '0xA61' }, expected: { b: '0x729', v: 1 } },
  { input: { k: '0xC7E', v: 1, m: '0xD79', b: '0xB43', a: '0xD79' }, expected: { b: '0x291', v: 1 } },
  { input: { k: '0x3B', v: 0, m: '0xDCD', b: '0x3F5', a: '0xDCD' }, expected: { b: '0xCA7', v: 0 } },
  { input: { k: '0x867', v: 1, m: '0xDE7', b: '0x671', a: '0xDE7' }, expected: { b: '0x8BB', v: 1 } },
  { input: { k: '0xD46', v: 1, m: '0xEEF', b: '0xBEA', a: '0xEEF' }, expected: { b: '0xDF2', v: 1 } },
  { input: { k: '0x9F', v: 0, m: '0x1021', b: '0x790', a: '0x1021' }, expected: { b: '0x8E6', v: 0 } },
  { input: { k: '0x736', v: 0, m: '0x11AB', b: '0x91', a: '0x11AB' }, expected: { b: '0x32D', v: 0 } },
  { input: { k: '0x9D3', v: 1, m: '0x11D1', b: '0x8E', a: '0x11D1' }, expected: { b: '0x55C', v: 1 } },
  { input: { k: '0x7F4', v: 0, m: '0x11E7', b: '0xFBA', a: '0x11E7' }, expected: { b: '0x9E4', v: 0 } },
  { input: { k: '0xAFA', v: 1, m: '0x121F', b: '0xD79', a: '0x121F' }, expected: { b: '0x333', v: 1 } },
  { input: { k: '0x6C', v: 0, m: '0x1271', b: '0x58E', a: '0x1271' }, expected: { b: '0x9C8', v: 0 } },
  { input: { k: '0xAF4', v: 1, m: '0x12B5', b: '0x115B', a: '0x12B5' }, expected: { b: '0x7BF', v: 1 } },
  { input: { k: '0xD6B', v: 1, m: '0x13D5', b: '0x1A7', a: '0x13D5' }, expected: { b: '0x3D7', v: 1 } },
  { input: { k: '0x7DE', v: 0, m: '0x142F', b: '0x1095', a: '0x142F' }, expected: { b: '0xC8C', v: 0 } },
  { input: { k: '0xD22', v: 1, m: '0x14D5', b: '0x34B', a: '0x14D5' }, expected: { b: '0x927', v: 1 } },
  { input: { k: '0xCA8', v: 1, m: '0x16BD', b: '0x11FE', a: '0x16BD' }, expected: { b: '0x1079', v: 1 } },
  { input: { k: '0x8EC', v: 0, m: '0x16E1', b: '0x1549', a: '0x16E1' }, expected: { b: '0x1480', v: 0 } },
  { input: { k: '0x1C3', v: 0, m: '0x1733', b: '0x753', a: '0x1733' }, expected: { b: '0x8EF', v: 0 } },
  { input: { k: '0x880', v: 0, m: '0x1777', b: '0xEDF', a: '0x1777' }, expected: { b: '0x17B', v: 0 } },
  { input: { k: '0xC2A', v: 1, m: '0x17A5', b: '0x1635', a: '0x17A5' }, expected: { b: '0x1016', v: 1 } },
  { input: { k: '0xBE2', v: 0, m: '0x189B', b: '0xF68', a: '0x189B' }, expected: { b: '0x1100', v: 0 } },
  { input: { k: '0x94D', v: 2, m: '0xC35', b: '0x4E8', a: '0x5' }, expected: { b: '0xBDC', v: 2 } },
  { input: { k: '0xD9', v: 1, m: '0x895', b: '0x33D', a: '0xD' }, expected: { b: '0x790', v: 1 } },
  { input: { k: '0x9C7', v: 1, m: '0x895', b: '0x18F', a: '0xD' }, expected: { b: '0x4EB', v: 1 } },
  { input: { k: '0x16E1', v: 2, m: '0x1AE9', b: '0xB66', a: '0x53' }, expected: { b: '0x1776', v: 2 } },
  { input: { k: '0x14A5', v: 1, m: '0xF1', b: '0xED', a: '0xF1' }, expected: { b: '0x44', v: 1 } },
  { input: { k: '0x1764', v: 0, m: '0x139', b: '0xEC', a: '0x139' }, expected: { b: '0x11E', v: 0 } },
  { input: { k: '0x1317', v: 0, m: '0x175', b: '0x151', a: '0x175' }, expected: { b: '0x7C', v: 0 } },
  { input: { k: '0x1539', v: 0, m: '0x17B', b: '0x64', a: '0x17B' }, expected: { b: '0xC1', v: 0 } },
  { input: { k: '0xB0E', v: 1, m: '0x241', b: '0x20F', a: '0x241' }, expected: { b: '0x1BA', v: 1 } },
  { input: { k: '0xFD', v: 0, m: '0x25F', b: '0x21', a: '0x25F' }, expected: { b: '0x1CA', v: 0 } },
  { input: { k: '0xFD6', v: 1, m: '0x269', b: '0x87', a: '0x269' }, expected: { b: '0xB', v: 1 } },
  { input: { k: '0x455', v: 1, m: '0x2A1', b: '0x18B', a: '0x2A1' }, expected: { b: '0x25D', v: 1 } },
  { input: { k: '0x98E', v: 1, m: '0x2B3', b: '0x171', a: '0x2B3' }, expected: { b: '0x80', v: 1 } },
  { input: { k: '0x13DF', v: 1, m: '0x2EF', b: '0xC6', a: '0x2EF' }, expected: { b: '0x87', v: 1 } },
  { input: { k: '0x4E0', v: 1, m: '0x335', b: '0xE4', a: '0x335' }, expected: { b: '0x1DE', v: 1 } },
  { input: { k: '0x1963', v: 1, m: '0x35F', b: '0x21B', a: '0x35F' }, expected: { b: '0x2C', v: 1 } },
  { input: { k: '0x3E2', v: 0, m: '0x373', b: '0x125', a: '0x373' }, expected: { b: '0x2DF', v: 0 } },
  { input: { k: '0xB9', v: 0, m: '0x4EB', b: '0x369', a: '0x4EB' }, expected: { b: '0x161', v: 0 } },
  { input: { k: '0x166C', v: 0, m: '0x509', b: '0x320', a: '0x509' }, expected: { b: '0x246', v: 0 } },
  { input: { k: '0x8D', v: 0, m: '0x51B', b: '0x2A9', a: '0x51B' }, expected: { b: '0x262', v: 0 } },
  { input: { k: '0x709', v: 0, m: '0x581', b: '0x28E', a: '0x581' }, expected: { b: '0x53B', v: 0 } },
  { input: { k: '0x1947', v: 0, m: '0x59F', b: '0x443', a: '0x59F' }, expected: { b: '0x7F', v: 0 } },
  { input: { k: '0x1318', v: 0, m: '0x61F', b: '0x34D', a: '0x61F' }, expected: { b: '0x523', v: 0 } },
  { input: { k: '0x53E', v: 1, m: '0x78D', b: '0x607', a: '0x78D' }, expected: { b: '0x1CF', v: 1 } },
  { input: { k: '0xDF6', v: 1, m: '0x79F', b: '0x425', a: '0x79F' }, expected: { b: '0x4C5', v: 1 } },
  { input: { k: '0x8D2', v: 0, m: '0x7CD', b: '0x3B7', a: '0x7CD' }, expected: { b: '0x247', v: 0 } },
  { input: { k: '0xD5E', v: 1, m: '0x805', b: '0x136', a: '0x805' }, expected: { b: '0x5C0', v: 1 } },
  { input: { k: '0xC57', v: 0, m: '0x949', b: '0x398', a: '0x949' }, expected: { b: '0x632', v: 0 } },
  { input: { k: '0x1A2E', v: 1, m: '0x959', b: '0x925', a: '0x959' }, expected: { b: '0x36A', v: 1 } },
  { input: { k: '0x15DA', v: 0, m: '0x9EF', b: '0x688', a: '0x9EF' }, expected: { b: '0xE', v: 0 } },
  { input: { k: '0x95D', v: 1, m: '0xA6F', b: '0x7E3', a: '0xA6F' }, expected: { b: '0x93A', v: 1 } },
  { input: { k: '0x15E5', v: 0, m: '0xACF', b: '0x9CD', a: '0xACF' }, expected: { b: '0x41B', v: 0 } },
  { input: { k: '0x16CA', v: 0, m: '0xB2D', b: '0x98B', a: '0xB2D' }, expected: { b: '0x71D', v: 0 } },
  { input: { k: '0x19AA', v: 0, m: '0xB57', b: '0x3EA', a: '0xB57' }, expected: { b: '0x7F7', v: 0 } },
  { input: { k: '0x1014', v: 0, m: '0xB8D', b: '0xC6', a: '0xB8D' }, expected: { b: '0x701', v: 0 } },
  { input: { k: '0x1915', v: 0, m: '0xBDD', b: '0xB1B', a: '0xBDD' }, expected: { b: '0x9E5', v: 0 } },
  { input: { k: '0x17FD', v: 1, m: '0xD2B', b: '0x2BB', a: '0xD2B' }, expected: { b: '0x4FC', v: 1 } },
  { input: { k: '0x1447', v: 1, m: '0xD4F', b: '0x904', a: '0xD4F' }, expected: { b: '0x718', v: 1 } },
  { input: { k: '0x55D', v: 0, m: '0xDA3', b: '0xD5F', a: '0xDA3' }, expected: { b: '0x37D', v: 0 } },
  { input: { k: '0x620', v: 0, m: '0xDB7', b: '0x242', a: '0xDB7' }, expected: { b: '0x1D2', v: 0 } },
  { input: { k: '0x1687', v: 0, m: '0xF0D', b: '0xC2', a: '0xF0D' }, expected: { b: '0x594', v: 0 } },
  { input: { k: '0x1242', v: 0, m: '0xF29', b: '0x8CB', a: '0xF29' }, expected: { b: '0xE50', v: 0 } },
  { input: { k: '0x13AF', v: 0, m: '0xFA3', b: '0x948', a: '0xFA3' }, expected: { b: '0xE6E', v: 0 } },
  { input: { k: '0xA1', v: 0, m: '0xFD3', b: '0xEAA', a: '0xFD3' }, expected: { b: '0x31B', v: 0 } },
  { input: { k: '0x196E', v: 1, m: '0x1085', b: '0x6B4', a: '0x1085' }, expected: { b: '0x943', v: 1 } },
  { input: { k: '0xF5A', v: 1, m: '0x112D', b: '0xA62', a: '0x112D' }, expected: { b: '0xBF9', v: 1 } },
  { input: { k: '0x6DE', v: 0, m: '0x11A7', b: '0x826', a: '0x11A7' }, expected: { b: '0x8E7', v: 0 } },
  { input: { k: '0x186F', v: 0, m: '0x1253', b: '0x833', a: '0x1253' }, expected: { b: '0xEF3', v: 0 } },
  { input: { k: '0xA0', v: 0, m: '0x1297', b: '0x36E', a: '0x1297' }, expected: { b: '0x9A5', v: 0 } },
  { input: { k: '0x164F', v: 0, m: '0x12BF', b: '0xBE3', a: '0x12BF' }, expected: { b: '0x572', v: 0 } },
  { input: { k: '0x523', v: 0, m: '0x13BB', b: '0x69E', a: '0x13BB' }, expected: { b: '0x77', v: 0 } },
  { input: { k: '0x1447', v: 0, m: '0x13EB', b: '0x8B3', a: '0x13EB' }, expected: { b: '0x39C', v: 0 } },
  { input: { k: '0x9F9', v: 0, m: '0x13F9', b: '0xFEA', a: '0x13F9' }, expected: { b: '0x438', v: 0 } },
  { input: { k: '0x6A5', v: 0, m: '0x146B', b: '0xB65', a: '0x146B' }, expected: { b: '0x572', v: 0 } },
  { input: { k: '0xEC0', v: 1, m: '0x1499', b: '0x243', a: '0x1499' }, expected: { b: '0xCD2', v: 1 } },
  { input: { k: '0xB1F', v: 1, m: '0x14B1', b: '0x552', a: '0x14B1' }, expected: { b: '0xD2', v: 1 } },
  { input: { k: '0x94F', v: 0, m: '0x14D5', b: '0xFB2', a: '0x14D5' }, expected: { b: '0x86F', v: 0 } },
  { input: { k: '0x19D9', v: 0, m: '0x152B', b: '0x1380', a: '0x152B' }, expected: { b: '0xCBB', v: 0 } },
  { input: { k: '0xC2B', v: 1, m: '0x155F', b: '0x3EF', a: '0x155F' }, expected: { b: '0x782', v: 1 } },
  { input: { k: '0xE34', v: 1, m: '0x1565', b: '0xAA3', a: '0x1565' }, expected: { b: '0xF31', v: 1 } },
  { input: { k: '0x49', v: 0, m: '0x157D', b: '0xB5F', a: '0x157D' }, expected: { b: '0xD89', v: 0 } },
  { input: { k: '0x19C6', v: 0, m: '0x158F', b: '0x1161', a: '0x158F' }, expected: { b: '0x116C', v: 0 } },
  { input: { k: '0x1A38', v: 0, m: '0x15D7', b: '0x1008', a: '0x15D7' }, expected: { b: '0x12AE', v: 0 } },
  { input: { k: '0x8A3', v: 0, m: '0x163D', b: '0x117E', a: '0x163D' }, expected: { b: '0x2DB', v: 0 } },
  { input: { k: '0x162F', v: 1, m: '0x1645', b: '0xCF5', a: '0x1645' }, expected: { b: '0x473', v: 1 } },
  { input: { k: '0xF80', v: 1, m: '0x16AF', b: '0xD75', a: '0x16AF' }, expected: { b: '0x52', v: 1 } },
  { input: { k: '0x17A4', v: 0, m: '0x16E5', b: '0x6AE', a: '0x16E5' }, expected: { b: '0x109F', v: 0 } },
  { input: { k: '0x135D', v: 1, m: '0x1807', b: '0x142E', a: '0x1807' }, expected: { b: '0x4E1', v: 1 } },
  { input: { k: '0x9D2', v: 0, m: '0x18C7', b: '0xB33', a: '0x18C7' }, expected: { b: '0x7C6', v: 0 } },
  { input: { k: '0x322', v: 0, m: '0x18D9', b: '0x979', a: '0x18D9' }, expected: { b: '0x1289', v: 0 } },
  { input: { k: '0x1270', v: 1, m: '0x1997', b: '0x8B0', a: '0x1997' }, expected: { b: '0xA12', v: 1 } },
  { input: { k: '0x5A2', v: 0, m: '0x1A7B', b: '0xCD2', a: '0x1A7B' }, expected: { b: '0x386', v: 0 } },
  { input: { k: '0x25D', v: 0, m: '0x1A89', b: '0x4FB', a: '0x1A89' }, expected: { b: '0xEB6', v: 0 } },
  { input: { k: '0x373', v: 0, m: '0x1B83', b: '0x10EE', a: '0x1B83' }, expected: { b: '0xA0D', v: 0 } },
  { input: { k: '0xB76', v: 0, m: '0x1C09', b: '0x94C', a: '0x1C09' }, expected: { b: '0x1ADC', v: 0 } },
  { input: { k: '0xA6F', v: 0, m: '0x1D35', b: '0x1B9', a: '0x1D35' }, expected: { b: '0xFB6', v: 0 } },
  { input: { k: '0x1D', v: 0, m: '0x1D39', b: '0x3D8', a: '0x1D39' }, expected: { b: '0x17CD', v: 0 } },
  { input: { k: '0x6BD', v: 0, m: '0x1D87', b: '0x4C0', a: '0x1D87' }, expected: { b: '0xEAD', v: 0 } },
  { input: { k: '0x13AA', v: 1, m: '0x1E01', b: '0xF37', a: '0x1E01' }, expected: { b: '0x158E', v: 1 } },
  { input: { k: '0xFB0', v: 0, m: '0x20B9', b: '0x6F8', a: '0x20B9' }, expected: { b: '0x8A1', v: 0 } },
  { input: { k: '0xD39', v: 0, m: '0x2149', b: '0x17F1', a: '0x2149' }, expected: { b: '0x1997', v: 0 } },
  { input: { k: '0x556', v: 0, m: '0x21A1', b: '0x196B', a: '0x21A1' }, expected: { b: '0xFEA', v: 0 } },
  { input: { k: '0x18D9', v: 1, m: '0x21A1', b: '0x1DF2', a: '0x21A1' }, expected: { b: '0x802', v: 1 } },
  { input: { k: '0x1215', v: 1, m: '0x21D7', b: '0x1CA9', a: '0x21D7' }, expected: { b: '0xFAD', v: 1 } },
  { input: { k: '0x112A', v: 1, m: '0x224F', b: '0x893', a: '0x224F' }, expected: { b: '0x448', v: 1 } },
  { input: { k: '0x20F', v: 0, m: '0x238F', b: '0x22D', a: '0x238F' }, expected: { b: '0x8C3', v: 0 } },
  { input: { k: '0xB68', v: 0, m: '0x2527', b: '0x248B', a: '0x2527' }, expected: { b: '0x3F0', v: 0 } },
  { input: { k: '0x110C', v: 0, m: '0x2573', b: '0x1A1E', a: '0x2573' }, expected: { b: '0x116F', v: 0 } },
  { input: { k: '0x459', v: 0, m: '0x25D9', b: '0x1133', a: '0x25D9' }, expected: { b: '0x1DAA', v: 0 } },
  { input: { k: '0xD23', v: 0, m: '0x263B', b: '0x2288', a: '0x263B' }, expected: { b: '0x16A9', v: 0 } },
  { input: { k: '0x5BE', v: 0, m: '0x28BB', b: '0x1800', a: '0x28BB' }, expected: { b: '0x76A', v: 0 } },
  { input: { k: '0x18AF', v: 1, m: '0x28C1', b: '0x1B41', a: '0x28C1' }, expected: { b: '0x202E', v: 1 } },
  { input: { k: '0x13AD', v: 0, m: '0x2987', b: '0x212F', a: '0x2987' }, expected: { b: '0x27BB', v: 0 } },
  { input: { k: '0xA1B', v: 0, m: '0x299B', b: '0x120B', a: '0x299B' }, expected: { b: '0x256E', v: 0 } },
  { input: { k: '0x10E5', v: 0, m: '0x29A7', b: '0xFD3', a: '0x29A7' }, expected: { b: '0x4F2', v: 0 } },
  { input: { k: '0x17C6', v: 1, m: '0x2B4B', b: '0x967', a: '0x2B4B' }, expected: { b: '0x20A7', v: 1 } },
  { input: { k: '0x971', v: 0, m: '0x2BF3', b: '0x26D4', a: '0x2BF3' }, expected: { b: '0xFFF', v: 0 } },
  { input: { k: '0x439', v: 0, m: '0x2CAD', b: '0x1598', a: '0x2CAD' }, expected: { b: '0x1616', v: 0 } },
  { input: { k: '0x165A', v: 0, m: '0x2D1D', b: '0x2BAA', a: '0x2D1D' }, expected: { b: '0x86A', v: 0 } },
  { input: { k: '0x71B', v: 0, m: '0x2F0B', b: '0x2D85', a: '0x2F0B' }, expected: { b: '0x467', v: 0 } },
  { input: { k: '0x1499', v: 0, m: '0x2F4B', b: '0x2700', a: '0x2F4B' }, expected: { b: '0x112C', v: 0 } },
  { input: { k: '0x47A', v: 0, m: '0x3001', b: '0x2CB8', a: '0x3001' }, expected: { b: '0x1B85', v: 0 } },
  { input: { k: '0x2FB', v: 0, m: '0x3023', b: '0x21A3', a: '0x3023' }, expected: { b: '0x7F2', v: 0 } },
  { input: { k: '0x2F', v: 0, m: '0x3095', b: '0x2768', a: '0x3095' }, expected: { b: '0x5FA', v: 0 } },
  { input: { k: '0x1085', v: 0, m: '0x3119', b: '0x2AD', a: '0x3119' }, expected: { b: '0x176B', v: 0 } },
  { input: { k: '0x1690', v: 0, m: '0x32CF', b: '0x2A43', a: '0x32CF' }, expected: { b: '0x1334', v: 0 } },
  { input: { k: '0x106C', v: 0, m: '0x33AD', b: '0x5B6', a: '0x33AD' }, expected: { b: '0x1F38', v: 0 } },
  { input: { k: '0x14F4', v: 0, m: '0x341B', b: '0x5F3', a: '0x341B' }, expected: { b: '0x1710', v: 0 } },
  { input: { k: '0x135B', v: 0, m: '0x349D', b: '0x91F', a: '0x349D' }, expected: { b: '0x36', v: 0 } },
  { input: { k: '0x731', v: 1, m: '0x107', b: '0x45', a: '0x107' }, expected: { b: '0xDC', v: 0 } },
];

const testUpdateB = () => {
  console.log('Testing updateB routine...');

  const { sourceCode, rom, sourceMap, symbols } = compileCodeForTest('submodules/computeF.i4040', 'updateB');
  for (const [idx, { input, expected }] of UPDATE_B_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_B_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateBTest(rom, input);
    if (parseInt(expected.b, 16) !== parseInt(result.b, 16) || result.v !== expected.v) {
      console.log(`Test failed, input = ${jsser(input)}, expected = ${jsser(expected)}, result = ${jsser(result)}`);
      console.log('Code to reproduce:');
      const { m, v, k, b, a } = input;
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_V, [0x0, 0x0, 0x0, v]),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, hexToHWNumber(k)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_B, hexToHWNumber(b)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(a)),
        ...generateCodeToPrepareModulusBasedDataForEmulator(parseInt(m, 16)),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators, sourceMap, symbols));
      process.exit(1);
    }
  }

  console.log('All tests for updateB routine has been passed');
};

const UPDATE_A_TESTS = [
  { input: { k: '0x8C5', v: 0, m: '0x1189', A: '0x42', a: '0x43' }, expected: { A: '0x42', v: 2 } },
  { input: { k: '0x65', v: 0, m: '0x1189', A: '0x10C1', a: '0x43' }, expected: { A: '0xF31', v: 1 } },
  { input: { k: '0x938', v: 2, m: '0xE89', A: '0x918', a: '0x3D' }, expected: { A: '0x5A0', v: 2 } },
  { input: { k: '0xB8', v: 1, m: '0xC7', A: '0xA9', a: '0xC7' }, expected: { A: '0x86', v: 1 } },
  { input: { k: '0xD2F', v: 0, m: '0x463', A: '0x1A8', a: '0x463' }, expected: { A: '0xAC', v: 0 } },
  { input: { k: '0xAE2', v: 1, m: '0x5FB', A: '0x209', a: '0x5FB' }, expected: { A: '0x4DE', v: 1 } },
  { input: { k: '0x3B2', v: 1, m: '0x67F', A: '0x292', a: '0x67F' }, expected: { A: '0x162', v: 1 } },
  { input: { k: '0x3C8', v: 1, m: '0x71F', A: '0x6A5', a: '0x71F' }, expected: { A: '0x398', v: 1 } },
  { input: { k: '0x379', v: 0, m: '0x8DD', A: '0x7F2', a: '0x8DD' }, expected: { A: '0x87A', v: 0 } },
  { input: { k: '0xAB1', v: 0, m: '0x977', A: '0x8E6', a: '0x977' }, expected: { A: '0x487', v: 0 } },
  { input: { k: '0x5AE', v: 1, m: '0xAE5', A: '0x9B0', a: '0xAE5' }, expected: { A: '0xA18', v: 1 } },
  { input: { k: '0xD06', v: 1, m: '0xDC7', A: '0x8E2', a: '0xDC7' }, expected: { A: '0x6B0', v: 1 } },
  { input: { k: '0x491', v: 0, m: '0xDCD', A: '0xC36', a: '0xDCD' }, expected: { A: '0xABF', v: 0 } },
  { input: { k: '0x105', v: 0, m: '0xEED', A: '0x37C', a: '0xEED' }, expected: { A: '0x957', v: 0 } },
  { input: { k: '0x250', v: 0, m: '0xF43', A: '0xF23', a: '0xF43' }, expected: { A: '0x4BE', v: 0 } },
  { input: { k: '0x2BB', v: 0, m: '0xF53', A: '0x6', a: '0xF53' }, expected: { A: '0x218', v: 0 } },
  { input: { k: '0x460', v: 0, m: '0xF67', A: '0x2B1', a: '0xF67' }, expected: { A: '0x3BE', v: 0 } },
  { input: { k: '0x70D', v: 0, m: '0x1087', A: '0x1F9', a: '0x1087' }, expected: { A: '0xC8F', v: 0 } },
  { input: { k: '0xB63', v: 1, m: '0x112D', A: '0x77F', a: '0x112D' }, expected: { A: '0x10B8', v: 1 } },
  { input: { k: '0xC07', v: 1, m: '0x13F9', A: '0xF20', a: '0x13F9' }, expected: { A: '0xC1A', v: 1 } },
  { input: { k: '0x75B', v: 0, m: '0x14CB', A: '0x65', a: '0x14CB' }, expected: { A: '0x91C', v: 0 } },
  { input: { k: '0x43F', v: 0, m: '0x1517', A: '0x17F', a: '0x1517' }, expected: { A: '0x32D', v: 0 } },
  { input: { k: '0x32', v: 0, m: '0x1525', A: '0x3CE', a: '0x1525' }, expected: { A: '0x1135', v: 0 } },
  { input: { k: '0xD1E', v: 1, m: '0x1525', A: '0x1096', a: '0x1525' }, expected: { A: '0x653', v: 1 } },
  { input: { k: '0x9AD', v: 0, m: '0x15D7', A: '0xB89', a: '0x15D7' }, expected: { A: '0x99', v: 0 } },
  { input: { k: '0x184', v: 0, m: '0x1633', A: '0x68C', a: '0x1633' }, expected: { A: '0xC68', v: 0 } },
  { input: { k: '0x336', v: 0, m: '0x164F', A: '0x1251', a: '0x164F' }, expected: { A: '0x15DF', v: 0 } },
  { input: { k: '0x370', v: 0, m: '0x169F', A: '0x45E', a: '0x169F' }, expected: { A: '0xD55', v: 0 } },
  { input: { k: '0xCCB', v: 1, m: '0x16F9', A: '0x540', a: '0x16F9' }, expected: { A: '0xF28', v: 1 } },
  { input: { k: '0xA5B', v: 0, m: '0x1835', A: '0x11A5', a: '0x1835' }, expected: { A: '0x15E6', v: 0 } },
  { input: { k: '0xCE3', v: 1, m: '0x1945', A: '0x628', a: '0x1945' }, expected: { A: '0x4A5', v: 1 } },
  { input: { k: '0xAAB', v: 0, m: '0x1A7D', A: '0x8B2', a: '0x1A7D' }, expected: { A: '0x121A', v: 0 } },
  { input: { k: '0x7E5', v: 1, m: '0x559', A: '0x417', a: '0x25' }, expected: { A: '0x2CD', v: 1 } },
  { input: { k: '0x43B', v: 0, m: '0xB3', A: '0x13', a: '0xB3' }, expected: { A: '0x90', v: 0 } },
  { input: { k: '0x1809', v: 1, m: '0x1A5', A: '0x26', a: '0x1A5' }, expected: { A: '0x118', v: 1 } },
  { input: { k: '0x73D', v: 0, m: '0x1CF', A: '0x69', a: '0x1CF' }, expected: { A: '0x69', v: 0 } },
  { input: { k: '0x97C', v: 0, m: '0x223', A: '0x2B', a: '0x223' }, expected: { A: '0x166', v: 0 } },
  { input: { k: '0x17AC', v: 1, m: '0x233', A: '0x1C8', a: '0x233' }, expected: { A: '0x1A3', v: 1 } },
  { input: { k: '0x690', v: 0, m: '0x2CF', A: '0xF9', a: '0x2CF' }, expected: { A: '0xC2', v: 0 } },
  { input: { k: '0x1261', v: 0, m: '0x301', A: '0x45', a: '0x301' }, expected: { A: '0xB9', v: 0 } },
  { input: { k: '0x5DE', v: 1, m: '0x36D', A: '0x266', a: '0x36D' }, expected: { A: '0x184', v: 1 } },
  { input: { k: '0x194F', v: 0, m: '0x38F', A: '0x3F', a: '0x38F' }, expected: { A: '0x23', v: 0 } },
  { input: { k: '0x520', v: 0, m: '0x3C7', A: '0x229', a: '0x3C7' }, expected: { A: '0x13', v: 0 } },
  { input: { k: '0x3B3', v: 1, m: '0x409', A: '0x48', a: '0x409' }, expected: { A: '0x3CD', v: 1 } },
  { input: { k: '0x1552', v: 0, m: '0x409', A: '0x3EC', a: '0x409' }, expected: { A: '0x254', v: 0 } },
  { input: { k: '0x157B', v: 1, m: '0x4A9', A: '0x459', a: '0x4A9' }, expected: { A: '0x2A2', v: 1 } },
  { input: { k: '0x120', v: 0, m: '0x4C1', A: '0x485', a: '0x4C1' }, expected: { A: '0x319', v: 0 } },
  { input: { k: '0x482', v: 1, m: '0x4EB', A: '0x1BB', a: '0x4EB' }, expected: { A: '0x3B8', v: 1 } },
  { input: { k: '0x1740', v: 1, m: '0x529', A: '0x1CE', a: '0x529' }, expected: { A: '0x4A0', v: 1 } },
  { input: { k: '0x1511', v: 1, m: '0x557', A: '0x2C1', a: '0x557' }, expected: { A: '0xAB', v: 1 } },
  { input: { k: '0xC0', v: 0, m: '0x593', A: '0x3C0', a: '0x593' }, expected: { A: '0x3AD', v: 0 } },
  { input: { k: '0x1A23', v: 0, m: '0x607', A: '0x3FB', a: '0x607' }, expected: { A: '0x50B', v: 0 } },
  { input: { k: '0x192E', v: 0, m: '0x647', A: '0xB', a: '0x647' }, expected: { A: '0x181', v: 0 } },
  { input: { k: '0x146B', v: 0, m: '0x6A3', A: '0xBC', a: '0x6A3' }, expected: { A: '0x460', v: 0 } },
  { input: { k: '0x168', v: 0, m: '0x6B9', A: '0x17', a: '0x6B9' }, expected: { A: '0x418', v: 0 } },
  { input: { k: '0x3B3', v: 1, m: '0x745', A: '0x49D', a: '0x745' }, expected: { A: '0x23C', v: 1 } },
  { input: { k: '0x1101', v: 0, m: '0x751', A: '0x3CE', a: '0x751' }, expected: { A: '0x5C0', v: 0 } },
  { input: { k: '0x7B4', v: 1, m: '0x7C3', A: '0x54E', a: '0x7C3' }, expected: { A: '0x650', v: 1 } },
  { input: { k: '0xC95', v: 1, m: '0x83F', A: '0x5A7', a: '0x83F' }, expected: { A: '0x3E', v: 1 } },
  { input: { k: '0x201', v: 0, m: '0x871', A: '0x5E1', a: '0x871' }, expected: { A: '0x728', v: 0 } },
  { input: { k: '0x186A', v: 1, m: '0x89B', A: '0x9F', a: '0x89B' }, expected: { A: '0xEB', v: 1 } },
  { input: { k: '0x1828', v: 0, m: '0x9EB', A: '0x589', a: '0x9EB' }, expected: { A: '0x960', v: 0 } },
  { input: { k: '0x2B5', v: 0, m: '0xA7F', A: '0x496', a: '0xA7F' }, expected: { A: '0x163', v: 0 } },
  { input: { k: '0x4B2', v: 0, m: '0xB51', A: '0xA53', a: '0xB51' }, expected: { A: '0x389', v: 0 } },
  { input: { k: '0x49E', v: 0, m: '0xB57', A: '0x944', a: '0xB57' }, expected: { A: '0x8C6', v: 0 } },
  { input: { k: '0x1367', v: 1, m: '0xB57', A: '0x56F', a: '0xB57' }, expected: { A: '0x592', v: 1 } },
  { input: { k: '0x15D9', v: 1, m: '0xB99', A: '0x8B4', a: '0xB99' }, expected: { A: '0x553', v: 1 } },
  { input: { k: '0x1282', v: 1, m: '0xBDD', A: '0x99', a: '0xBDD' }, expected: { A: '0x402', v: 1 } },
  { input: { k: '0x18DC', v: 0, m: '0xC31', A: '0x26A', a: '0xC31' }, expected: { A: '0x16E', v: 0 } },
  { input: { k: '0x1691', v: 1, m: '0xC91', A: '0xAF3', a: '0xC91' }, expected: { A: '0x2E1', v: 1 } },
  { input: { k: '0xE77', v: 0, m: '0xCB9', A: '0x4A7', a: '0xCB9' }, expected: { A: '0xA60', v: 0 } },
  { input: { k: '0xE11', v: 0, m: '0xD55', A: '0x2A6', a: '0xD55' }, expected: { A: '0x698', v: 0 } },
  { input: { k: '0x1682', v: 1, m: '0xDAB', A: '0x9CD', a: '0xDAB' }, expected: { A: '0x9A5', v: 1 } },
  { input: { k: '0xEAC', v: 0, m: '0xDB7', A: '0xC88', a: '0xDB7' }, expected: { A: '0xAF6', v: 0 } },
  { input: { k: '0x6E4', v: 0, m: '0xDFF', A: '0x96D', a: '0xDFF' }, expected: { A: '0x402', v: 0 } },
  { input: { k: '0xFA1', v: 0, m: '0xE35', A: '0x17F', a: '0xE35' }, expected: { A: '0x7ED', v: 0 } },
  { input: { k: '0x8E9', v: 1, m: '0xE75', A: '0xC2', a: '0xE75' }, expected: { A: '0x127', v: 1 } },
  { input: { k: '0xC26', v: 1, m: '0x10E7', A: '0x7B4', a: '0x10E7' }, expected: { A: '0x47E', v: 1 } },
  { input: { k: '0x14E7', v: 0, m: '0x10F3', A: '0x44C', a: '0x10F3' }, expected: { A: '0xE94', v: 0 } },
  { input: { k: '0x11FD', v: 0, m: '0x10FD', A: '0xB68', a: '0x10FD' }, expected: { A: '0x19D', v: 0 } },
  { input: { k: '0x12D1', v: 0, m: '0x1297', A: '0xCFB', a: '0x1297' }, expected: { A: '0x591', v: 0 } },
  { input: { k: '0x5C', v: 0, m: '0x130D', A: '0x233', a: '0x130D' }, expected: { A: '0x264', v: 0 } },
  { input: { k: '0x15D7', v: 0, m: '0x141B', A: '0x6A3', a: '0x141B' }, expected: { A: '0xFF9', v: 0 } },
  { input: { k: '0xC5B', v: 1, m: '0x1433', A: '0x10FD', a: '0x1433' }, expected: { A: '0xB3C', v: 1 } },
  { input: { k: '0x176', v: 0, m: '0x149F', A: '0xC45', a: '0x149F' }, expected: { A: '0x993', v: 0 } },
  { input: { k: '0x15F7', v: 0, m: '0x1565', A: '0xB35', a: '0x1565' }, expected: { A: '0x947', v: 0 } },
  { input: { k: '0x44D', v: 0, m: '0x15C1', A: '0x14D2', a: '0x15C1' }, expected: { A: '0xBC8', v: 0 } },
  { input: { k: '0xE8C', v: 1, m: '0x16BD', A: '0x76D', a: '0x16BD' }, expected: { A: '0x4B', v: 1 } },
  { input: { k: '0x1ABA', v: 0, m: '0x16ED', A: '0x1557', a: '0x16ED' }, expected: { A: '0xA55', v: 0 } },
  { input: { k: '0xA4E', v: 0, m: '0x17C9', A: '0xC0F', a: '0x17C9' }, expected: { A: '0x793', v: 0 } },
  { input: { k: '0x1354', v: 1, m: '0x17F5', A: '0xDE5', a: '0x17F5' }, expected: { A: '0x14F1', v: 1 } },
  { input: { k: '0x5BF', v: 0, m: '0x18A7', A: '0xF13', a: '0x18A7' }, expected: { A: '0x85D', v: 0 } },
  { input: { k: '0x1800', v: 1, m: '0x19B1', A: '0x133', a: '0x19B1' }, expected: { A: '0xDA0', v: 1 } },
  { input: { k: '0x12FC', v: 1, m: '0x19DB', A: '0x449', a: '0x19DB' }, expected: { A: '0x1421', v: 1 } },
  { input: { k: '0x162B', v: 1, m: '0x1A11', A: '0x2E2', a: '0x1A11' }, expected: { A: '0x3B3', v: 1 } },
  { input: { k: '0x283', v: 0, m: '0x1A35', A: '0x7D9', a: '0x1A35' }, expected: { A: '0x14BD', v: 0 } },
  { input: { k: '0xFB0', v: 1, m: '0x1B25', A: '0x1790', a: '0x1B25' }, expected: { A: '0x5E9', v: 1 } },
  { input: { k: '0xA1F', v: 0, m: '0x1B7F', A: '0x7AE', a: '0x1B7F' }, expected: { A: '0x19D', v: 0 } },
  { input: { k: '0x14B', v: 0, m: '0x1BBF', A: '0x270', a: '0x1BBF' }, expected: { A: '0x1EA', v: 0 } },
  { input: { k: '0x3A5', v: 0, m: '0x1C19', A: '0x19FC', a: '0x1C19' }, expected: { A: '0x1480', v: 0 } },
  { input: { k: '0x1737', v: 1, m: '0x1C27', A: '0x11C3', a: '0x1C27' }, expected: { A: '0xBC1', v: 1 } },
  { input: { k: '0xE48', v: 0, m: '0x1D9F', A: '0x48', a: '0x1D9F' }, expected: { A: '0xC5D', v: 0 } },
  { input: { k: '0x200', v: 0, m: '0x1DC5', A: '0x2F2', a: '0x1DC5' }, expected: { A: '0x655', v: 0 } },
  { input: { k: '0x902', v: 0, m: '0x1EBB', A: '0x15B9', a: '0x1EBB' }, expected: { A: '0xC92', v: 0 } },
  { input: { k: '0xEB3', v: 0, m: '0x1F39', A: '0x65A', a: '0x1F39' }, expected: { A: '0x18D8', v: 0 } },
  { input: { k: '0x12C9', v: 1, m: '0x1F97', A: '0x632', a: '0x1F97' }, expected: { A: '0x1E0', v: 1 } },
  { input: { k: '0x436', v: 0, m: '0x1F9D', A: '0x1A3D', a: '0x1F9D' }, expected: { A: '0x12F3', v: 0 } },
  { input: { k: '0x1133', v: 1, m: '0x2011', A: '0x18A', a: '0x2011' }, expected: { A: '0x136C', v: 1 } },
  { input: { k: '0x320', v: 0, m: '0x21B5', A: '0x1D0', a: '0x21B5' }, expected: { A: '0x2117', v: 0 } },
  { input: { k: '0x1AB1', v: 1, m: '0x2203', A: '0x130C', a: '0x2203' }, expected: { A: '0x11E0', v: 1 } },
  { input: { k: '0xBDA', v: 0, m: '0x222B', A: '0x735', a: '0x222B' }, expected: { A: '0x183A', v: 0 } },
  { input: { k: '0x1645', v: 1, m: '0x2329', A: '0x1E01', a: '0x2329' }, expected: { A: '0x160', v: 1 } },
  { input: { k: '0x9A', v: 0, m: '0x2443', A: '0x132B', a: '0x2443' }, expected: { A: '0xA2B', v: 0 } },
  { input: { k: '0x1761', v: 1, m: '0x2485', A: '0xE8B', a: '0x2485' }, expected: { A: '0xCB5', v: 1 } },
  { input: { k: '0x70D', v: 0, m: '0x24BB', A: '0x192', a: '0x24BB' }, expected: { A: '0xAC4', v: 0 } },
  { input: { k: '0x16DB', v: 1, m: '0x253D', A: '0x933', a: '0x253D' }, expected: { A: '0x156D', v: 1 } },
  { input: { k: '0xFEF', v: 0, m: '0x254B', A: '0x1568', a: '0x254B' }, expected: { A: '0x51A', v: 0 } },
  { input: { k: '0x131B', v: 1, m: '0x258D', A: '0x143C', a: '0x258D' }, expected: { A: '0x13CE', v: 1 } },
  { input: { k: '0x598', v: 0, m: '0x25AB', A: '0x24B0', a: '0x25AB' }, expected: { A: '0x1204', v: 0 } },
  { input: { k: '0x433', v: 0, m: '0x25E1', A: '0x1F8F', a: '0x25E1' }, expected: { A: '0x102D', v: 0 } },
  { input: { k: '0xD05', v: 0, m: '0x264B', A: '0xDFE', a: '0x264B' }, expected: { A: '0xE8D', v: 0 } },
  { input: { k: '0x1121', v: 0, m: '0x264B', A: '0x1E39', a: '0x264B' }, expected: { A: '0x2321', v: 0 } },
  { input: { k: '0xB83', v: 0, m: '0x2669', A: '0x13B3', a: '0x2669' }, expected: { A: '0xC01', v: 0 } },
  { input: { k: '0xD5F', v: 0, m: '0x268F', A: '0x17D8', a: '0x268F' }, expected: { A: '0x1E80', v: 0 } },
  { input: { k: '0x1903', v: 1, m: '0x276B', A: '0xA35', a: '0x276B' }, expected: { A: '0x1E78', v: 1 } },
  { input: { k: '0x148A', v: 1, m: '0x27D1', A: '0x19DF', a: '0x27D1' }, expected: { A: '0x8DD', v: 1 } },
  { input: { k: '0x1304', v: 0, m: '0x2821', A: '0x1C5F', a: '0x2821' }, expected: { A: '0x1977', v: 0 } },
  { input: { k: '0x18C2', v: 1, m: '0x283F', A: '0x10A', a: '0x283F' }, expected: { A: '0x9A5', v: 1 } },
  { input: { k: '0xA4', v: 0, m: '0x28BD', A: '0x1BDE', a: '0x28BD' }, expected: { A: '0x1BEF', v: 0 } },
  { input: { k: '0x917', v: 0, m: '0x2911', A: '0x1490', a: '0x2911' }, expected: { A: '0x21A7', v: 0 } },
  { input: { k: '0xCDD', v: 0, m: '0x2911', A: '0x2449', a: '0x2911' }, expected: { A: '0xD67', v: 0 } },
  { input: { k: '0x15DA', v: 1, m: '0x2A25', A: '0x2A0F', a: '0x2A25' }, expected: { A: '0x7F1', v: 1 } },
  { input: { k: '0xEC1', v: 0, m: '0x2A65', A: '0xFF3', a: '0x2A65' }, expected: { A: '0x1596', v: 0 } },
  { input: { k: '0x11B8', v: 0, m: '0x2ACD', A: '0x17CD', a: '0x2ACD' }, expected: { A: '0x9BF', v: 0 } },
  { input: { k: '0x41F', v: 0, m: '0x2B13', A: '0x1DC5', a: '0x2B13' }, expected: { A: '0x18CE', v: 0 } },
  { input: { k: '0x72', v: 0, m: '0x2B27', A: '0x22D4', a: '0x2B27' }, expected: { A: '0x91B', v: 0 } },
  { input: { k: '0x1472', v: 0, m: '0x2B55', A: '0x54A', a: '0x2B55' }, expected: { A: '0x199D', v: 0 } },
  { input: { k: '0x14B3', v: 0, m: '0x2C17', A: '0x2959', a: '0x2C17' }, expected: { A: '0x2856', v: 0 } },
  { input: { k: '0x13A8', v: 0, m: '0x2CE1', A: '0x26F5', a: '0x2CE1' }, expected: { A: '0x75C', v: 0 } },
  { input: { k: '0xDEF', v: 0, m: '0x2D43', A: '0x1F3C', a: '0x2D43' }, expected: { A: '0x109E', v: 0 } },
  { input: { k: '0x579', v: 0, m: '0x2D9D', A: '0x22FC', a: '0x2D9D' }, expected: { A: '0xDE8', v: 0 } },
  { input: { k: '0xA07', v: 0, m: '0x2E07', A: '0xBCB', a: '0x2E07' }, expected: { A: '0x75A', v: 0 } },
  { input: { k: '0x1031', v: 0, m: '0x3059', A: '0x2B89', a: '0x3059' }, expected: { A: '0x2C5A', v: 0 } },
  { input: { k: '0x1089', v: 0, m: '0x3085', A: '0x39E', a: '0x3085' }, expected: { A: '0x3AB', v: 0 } },
  { input: { k: '0x44A', v: 0, m: '0x317F', A: '0x3D4', a: '0x317F' }, expected: { A: '0x25E5', v: 0 } },
  { input: { k: '0x1A51', v: 1, m: '0x3191', A: '0x1A45', a: '0x3191' }, expected: { A: '0x1941', v: 1 } },
  { input: { k: '0x2B6', v: 0, m: '0x319F', A: '0x3137', a: '0x319F' }, expected: { A: '0x1FFC', v: 0 } },
  { input: { k: '0x1AB2', v: 1, m: '0x31F7', A: '0x8D8', a: '0x31F7' }, expected: { A: '0x293', v: 1 } },
  { input: { k: '0x1688', v: 0, m: '0x34D3', A: '0x1980', a: '0x34D3' }, expected: { A: '0x1140', v: 0 } },
  { input: { k: '0x153B', v: 0, m: '0x3509', A: '0x1921', a: '0x3509' }, expected: { A: '0x3010', v: 0 } },
];

const testUpdateA = () => {
  console.log('Testing updateA routine...');

  const { sourceCode, rom, symbols, sourceMap } = compileCodeForTest('submodules/computeF.i4040', 'updateA');
  for (const [idx, { input, expected }] of UPDATE_A_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_A_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateATest(rom, input);
    if (parseInt(expected.A, 16) !== parseInt(result.A, 16) || result.v !== expected.v) {
      console.log(`Test failed, input = ${jsser(input)}, expected = ${jsser(expected)}, result = ${jsser(result)}`);
      console.log('Code to reproduce:');
      const { v, m, k, A, a } = input;
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_V, [0x0, 0x0, 0x0, v]),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, hexToHWNumber(k)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A, hexToHWNumber(A)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(a)),
        ...generateCodeToPrepareModulusBasedDataForEmulator(parseInt(m, 16)),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators, sourceMap, symbols));
      process.exit(1);
    }
  }

  console.log('All tests for updateA routine has been passed');
};

const UPDATE_F_TESTS = [
  { input: { k: '0x13F4', f: '0x5A1', v: 1, vmax: 1, m: '0x2231', b: '0x228', A: '0x221', a: '0x2231' }, expected: { f: '0x1B48' } },
  { input: { k: '0x863', f: '0xA3', v: 1, vmax: 1, m: '0x10D', b: '0xD2', A: '0x7', a: '0x10D' }, expected: { f: '0xD' } },
  { input: { k: '0x27C', f: '0x72', v: 1, vmax: 1, m: '0x15D', b: '0x59', A: '0x5A', a: '0x15D' }, expected: { f: '0x8A' } },
  { input: { k: '0x8BF', f: '0xF8', v: 1, vmax: 1, m: '0x557', b: '0x133', A: '0x397', a: '0x557' }, expected: { f: '0x1C8' } },
  { input: { k: '0x80C', f: '0x10E', v: 1, vmax: 1, m: '0x92F', b: '0x481', A: '0x2AC', a: '0x92F' }, expected: { f: '0x4E6' } },
  { input: { k: '0xA41', f: '0xC00', v: 1, vmax: 1, m: '0xFA1', b: '0x4E8', A: '0x9F3', a: '0xFA1' }, expected: { f: '0x361' } },
  { input: { k: '0xD7F', f: '0x62', v: 2, vmax: 3, m: '0x533', b: '0x468', A: '0x4A1', a: '0xB' }, expected: { f: '0x1B7' } },
  { input: { k: '0x331', f: '0x4', v: 1, vmax: 1, m: '0x133', b: '0x5', A: '0xEB', a: '0x133' }, expected: { f: '0xFA' } },
  { input: { k: '0x141', f: '0x75', v: 1, vmax: 1, m: '0x17B', b: '0x15F', A: '0x2F', a: '0x17B' }, expected: { f: '0xD0' } },
  { input: { k: '0x1703', f: '0x45', v: 1, vmax: 1, m: '0x1D3', b: '0x18B', A: '0xC2', a: '0x1D3' }, expected: { f: '0x1' } },
  { input: { k: '0xDBB', f: '0x1AE', v: 1, vmax: 1, m: '0x2DD', b: '0x164', A: '0x256', a: '0x2DD' }, expected: { f: '0xAE' } },
  { input: { k: '0x59F', f: '0x103', v: 1, vmax: 1, m: '0x31D', b: '0x11E', A: '0x2D9', a: '0x31D' }, expected: { f: '0x116' } },
  { input: { k: '0xFBB', f: '0xA4', v: 1, vmax: 1, m: '0x329', b: '0x107', A: '0xB9', a: '0x329' }, expected: { f: '0x2F3' } },
  { input: { k: '0x734', f: '0x1A1', v: 1, vmax: 1, m: '0x3A9', b: '0x306', A: '0x308', a: '0x3A9' }, expected: { f: '0x2DA' } },
  { input: { k: '0xF32', f: '0x2F8', v: 1, vmax: 1, m: '0x517', b: '0x2DA', A: '0x9D', a: '0x517' }, expected: { f: '0x63' } },
  { input: { k: '0x3AB', f: '0x49E', v: 1, vmax: 1, m: '0x581', b: '0x457', A: '0x188', a: '0x581' }, expected: { f: '0x240' } },
  { input: { k: '0x107E', f: '0x56B', v: 1, vmax: 1, m: '0x5B3', b: '0xAD', A: '0x108', a: '0x5B3' }, expected: { f: '0x444' } },
  { input: { k: '0x1A47', f: '0x10F', v: 1, vmax: 1, m: '0x5CB', b: '0x32C', A: '0x45B', a: '0x5CB' }, expected: { f: '0x234' } },
  { input: { k: '0x17AF', f: '0x56D', v: 1, vmax: 1, m: '0x617', b: '0x587', A: '0x58A', a: '0x617' }, expected: { f: '0x541' } },
  { input: { k: '0x1316', f: '0x96', v: 1, vmax: 1, m: '0x6B9', b: '0x389', A: '0x4FD', a: '0x6B9' }, expected: { f: '0x669' } },
  { input: { k: '0x12EF', f: '0x267', v: 1, vmax: 1, m: '0x6D3', b: '0x448', A: '0x2A0', a: '0x6D3' }, expected: { f: '0xE' } },
  { input: { k: '0x531', f: '0x603', v: 1, vmax: 1, m: '0x757', b: '0x454', A: '0x24', a: '0x757' }, expected: { f: '0x6C3' } },
  { input: { k: '0x639', f: '0x5F', v: 1, vmax: 1, m: '0x7DB', b: '0x28D', A: '0x102', a: '0x7DB' }, expected: { f: '0x56F' } },
  { input: { k: '0x14F5', f: '0xA78', v: 1, vmax: 1, m: '0xA7B', b: '0x1', A: '0xA78', a: '0xA7B' }, expected: { f: '0x6FA' } },
  { input: { k: '0x15AE', f: '0xC43', v: 1, vmax: 1, m: '0xC89', b: '0xB6E', A: '0x111', a: '0xC89' }, expected: { f: '0xA50' } },
  { input: { k: '0xB2D', f: '0x516', v: 1, vmax: 1, m: '0xCE3', b: '0x460', A: '0xB54', a: '0xCE3' }, expected: { f: '0xC9A' } },
  { input: { k: '0xB50', f: '0x2C2', v: 1, vmax: 1, m: '0xDBD', b: '0x6B1', A: '0xBB2', a: '0xDBD' }, expected: { f: '0xD47' } },
  { input: { k: '0x1ABE', f: '0x955', v: 1, vmax: 1, m: '0xEC3', b: '0xD64', A: '0xA2D', a: '0xEC3' }, expected: { f: '0xD34' } },
  { input: { k: '0x7FA', f: '0xC96', v: 1, vmax: 1, m: '0xED1', b: '0xDAF', A: '0x8D6', a: '0xED1' }, expected: { f: '0xE39' } },
  { input: { k: '0x8EC', f: '0x3D7', v: 1, vmax: 1, m: '0xEF9', b: '0x694', A: '0x48E', a: '0xEF9' }, expected: { f: '0xA20' } },
  { input: { k: '0xF46', f: '0x217', v: 1, vmax: 1, m: '0xFA1', b: '0xE4C', A: '0xA44', a: '0xFA1' }, expected: { f: '0x361' } },
  { input: { k: '0x9F8', f: '0x5E3', v: 1, vmax: 1, m: '0x1051', b: '0x157', A: '0x5D4', a: '0x1051' }, expected: { f: '0xFF7' } },
  { input: { k: '0xF57', f: '0xC72', v: 1, vmax: 1, m: '0x1051', b: '0xD21', A: '0xECF', a: '0x1051' }, expected: { f: '0xAF9' } },
  { input: { k: '0xCCE', f: '0xCC6', v: 1, vmax: 1, m: '0x1079', b: '0x963', A: '0xF14', a: '0x1079' }, expected: { f: '0x369' } },
  { input: { k: '0xAB8', f: '0x10F7', v: 1, vmax: 1, m: '0x136D', b: '0x4F', A: '0x109B', a: '0x136D' }, expected: { f: '0xF41' } },
  { input: { k: '0xFAF', f: '0x82E', v: 1, vmax: 1, m: '0x13EB', b: '0x912', A: '0x915', a: '0x13EB' }, expected: { f: '0x8AE' } },
  { input: { k: '0x14E8', f: '0xBDE', v: 1, vmax: 1, m: '0x157F', b: '0x1034', A: '0x68F', a: '0x157F' }, expected: { f: '0x19A' } },
  { input: { k: '0xE36', f: '0x9AF', v: 1, vmax: 1, m: '0x17F5', b: '0x76C', A: '0x8D8', a: '0x17F5' }, expected: { f: '0x7FB' } },
  { input: { k: '0x14B2', f: '0xB60', v: 1, vmax: 1, m: '0x188F', b: '0x16B0', A: '0xE7E', a: '0x188F' }, expected: { f: '0x12BD' } },
  { input: { k: '0x16F5', f: '0x81D', v: 1, vmax: 1, m: '0x18E5', b: '0x6C', A: '0xEB', a: '0x18E5' }, expected: { f: '0x39F' } },
  { input: { k: '0x1666', f: '0x150E', v: 1, vmax: 1, m: '0x1A87', b: '0x9C2', A: '0xB83', a: '0x1A87' }, expected: { f: '0x483' } },
  { input: { k: '0xF26', f: '0xB5A', v: 1, vmax: 1, m: '0x1AD5', b: '0xEDB', A: '0x372', a: '0x1AD5' }, expected: { f: '0x154D' } },
  { input: { k: '0x1157', f: '0x190D', v: 1, vmax: 1, m: '0x1B31', b: '0x1583', A: '0x94F', a: '0x1B31' }, expected: { f: '0x150E' } },
  { input: { k: '0xE5D', f: '0x18E6', v: 1, vmax: 1, m: '0x1B91', b: '0x138D', A: '0x1B05', a: '0x1B91' }, expected: { f: '0xB7' } },
  { input: { k: '0x1449', f: '0x6B7', v: 1, vmax: 1, m: '0x1D23', b: '0xE47', A: '0x132D', a: '0x1D23' }, expected: { f: '0x1B2C' } },
  { input: { k: '0x166A', f: '0x4DA', v: 1, vmax: 1, m: '0x1EDD', b: '0x10F5', A: '0x9E1', a: '0x1EDD' }, expected: { f: '0x14FE' } },
  { input: { k: '0x1444', f: '0xD3C', v: 1, vmax: 1, m: '0x21F1', b: '0x123A', A: '0x7E', a: '0x21F1' }, expected: { f: '0x15F' } },
  { input: { k: '0x15CF', f: '0xB7C', v: 1, vmax: 1, m: '0x24D7', b: '0x236A', A: '0x1444', a: '0x24D7' }, expected: { f: '0x21D1' } },
  { input: { k: '0x1ABF', f: '0xE98', v: 1, vmax: 1, m: '0x2527', b: '0x1500', A: '0x15F8', a: '0x2527' }, expected: { f: '0x1E11' } },
  { input: { k: '0x1701', f: '0x21A7', v: 1, vmax: 1, m: '0x2543', b: '0xA32', A: '0x1381', a: '0x2543' }, expected: { f: '0x1233' } },
  { input: { k: '0x196B', f: '0x1638', v: 1, vmax: 1, m: '0x29F3', b: '0xFC7', A: '0x2335', a: '0x29F3' }, expected: { f: '0x2784' } },
  { input: { k: '0x1AA1', f: '0x1EF8', v: 1, vmax: 1, m: '0x2CE1', b: '0x1093', A: '0x11E0', a: '0x2CE1' }, expected: { f: '0x24F5' } },
];

const testUpdateF = () => {
  console.log('Testing updateF routine...');

  const { sourceCode, rom, sourceMap, symbols } = compileCodeForTest('submodules/computeF.i4040', 'updateF');
  for (const [idx, { input, expected }] of UPDATE_F_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_F_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateFTest(rom, input);
    if (parseInt(expected.f, 16) !== parseInt(result, 16)) {
      console.log(`Test failed, input = ${jsser(input)}, expected = ${jsser(expected)}, result = ${result}`);
      console.log('Code to reproduce:');
      const { k, f, vmax, v, A, b, m, a } = input;
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_K, hexToHWNumber(k)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F, hexToHWNumber(f)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_V, [0x0, 0x0, vmax, v]),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A, hexToHWNumber(A)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_B, hexToHWNumber(b)),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(a)),
        ...generateCodeToPrepareModulusBasedDataForEmulator(parseInt(m, 16)),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators, sourceMap, symbols));
      process.exit(1);
    }
  }

  console.log('All tests for updateF routine has been passed');
};

const test = () => {
  testUpdateA();
  testUpdateB();
  testUpdateF();
  testComputeF();
};

await test();
