/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToStatusChars, VARIABLES, writeValueToMainChars } from '#utilities/memory.js';

import {
  generateCodeToPrepareModulusBasedDataForEmulator, putModulusBasedDataIntoMemory,
} from '#data/multiplicationModulusData/multDataGenerator.js';

import {
  updateCodeForUseInEmulator, generateMemoryBankSwitch, generateMemoryStatusCharactersInitialization,
  generateAccumulatorInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const jsser = (obj) => JSON.stringify(obj);

const runComputeFTest = (romDump, { N, vmax, m, a }, symbols) => {
  const system = new Emulator({ romDump, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(numToHWNumber(0x10000 - (parseInt(N, 16) + 1)), memory, VARIABLES.STATUS_MEM_VARIABLE_N_NEG);
  writeValueToStatusChars([0x0, 0x0, vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  if (a !== m) {
    const aNum = parseInt(a, 16);
    writeValueToMainChars(
      [
        ...(aNum ** 2 < m ? numToHWNumber(aNum ** 2, 4) : [0, 0, 0, 0]),
        ...(aNum ** 3 < m ? numToHWNumber(aNum ** 3, 4) : [0, 0, 0, 0]),
        ...(aNum ** 4 < m ? numToHWNumber(aNum ** 4, 4) : [0, 0, 0, 0]),
        ...(aNum ** 5 < m ? numToHWNumber(aNum ** 5, 4) : [0, 0, 0, 0]),
      ],
      memory,
      2,
    );
    writeValueToMainChars(
      [
        ...(aNum ** 6 < m ? numToHWNumber(aNum ** 6, 4) : [0, 0, 0, 0]),
        ...(aNum ** 7 < m ? numToHWNumber(aNum ** 7, 4) : [0, 0, 0, 0]),
      ],
      memory,
      3,
    );
  }

  registers.ramControl = 0b1110;
  registers.acc = vmax === 1 ? 1 : 0;

  const labelForProgress = vmax === 1 ? 'computef_onevmax_loop' : 'computef_loop';
  const labelOffsetForProgress = symbols.find(({ label }) => label === labelForProgress).romAddress;
  const progressTrackingFrequency = vmax === 1 ? 10 : 100;
  let iters = 0;
  while (!system.isFinished()) {
    if (registers.pc === labelOffsetForProgress) {
      iters++;
      if (iters % progressTrackingFrequency === 0) {
        console.log(`  Function inner loop iterations executed: ${iters}...`);
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

const wrapSourceCode = (sourceCode) => `
entrypoint:
  JCN z, computeF_regular 
  DB1
  JMS computeF_oneVMax
  HLT
computeF_regular:
  DB1
  JMS computeF
  HLT

${sourceCode}
`;

const testComputeF = () => {
  const { roms, sourceCode } = compileCodeForTest(
    'submodules/computeF.i4040',
    '',
    { wrapSourceCode },
  );

  let sum = 0n;
  for (const [idx, { input, expected }] of COMPUTE_F_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${COMPUTE_F_TESTS.length} : ${jsser(input)}...`);
    const { result, elapsed } = runComputeFTest(roms.map(({ data }) => data), input, roms[1].symbols);
    if (parseInt(expected, 16) !== (parseInt(result, 16) % parseInt(input.m, 16))) {
      console.log(`Test failed, input = ${jsser(input)}, expected = ${expected}, result = ${result}`);
      console.log('Code to reproduce:');
      const { N, m, a, vmax } = input;
      const negativeN = numToHWNumber(0x10000 - (parseInt(N, 16) + 1));
      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_V, [0x0, 0x0, vmax, 0x00]),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_N_NEG, negativeN),
        generateMemoryStatusCharactersInitialization(VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, hexToHWNumber(a)),
        ...generateCodeToPrepareModulusBasedDataForEmulator(parseInt(m, 16)),
        generateAccumulatorInitialization(vmax === 1 ? 1 : 0),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit(1);
    }
    sum += elapsed;
  }

  console.log(`Avg for computeF: ${sum / BigInt(COMPUTE_F_TESTS.length)}`);
};

const UPDATE_B_TESTS = [
  { input: { k: '0x72A', v: 0, m: '0xE3', b: '0x4C', a: '0xE3' }, expected: { b: '0x6', v: 0 } },
  { input: { k: '0x305', v: 0, m: '0xEF', b: '0x21', a: '0xEF' }, expected: { b: '0xAF', v: 0 } },
  { input: { k: '0x94D', v: 2, m: '0xC35', b: '0x4E8', a: '0x5' }, expected: { b: '0xBDC', v: 2 } },
  { input: { k: '0xD9', v: 1, m: '0x895', b: '0x33D', a: '0xD' }, expected: { b: '0x790', v: 1 } },
  { input: { k: '0x9C7', v: 1, m: '0x895', b: '0x18F', a: '0xD' }, expected: { b: '0x4EB', v: 1 } },
  { input: { k: '0x16E1', v: 2, m: '0x1AE9', b: '0xB66', a: '0x53' }, expected: { b: '0x1776', v: 2 } },
  { input: { k: '0x14A5', v: 1, m: '0xF1', b: '0xED', a: '0xF1' }, expected: { b: '0x44', v: 1 } },
];

const testUpdateB = () => {
  console.log('Testing updateB routine...');

  const { sourceCode, roms } = compileCodeForTest('submodules/computeF.i4040', 'updateB');
  for (const [idx, { input, expected }] of UPDATE_B_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_B_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateBTest(roms.map(({ data }) => data), input);
    if (parseInt(expected.b, 16) !== (parseInt(result.b, 16) % parseInt(input.m, 16)) || result.v !== expected.v) {
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
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
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
  { input: { k: '0x7E5', v: 1, m: '0x559', A: '0x417', a: '0x25' }, expected: { A: '0x2CD', v: 1 } },
  { input: { k: '0x43B', v: 0, m: '0xB3', A: '0x13', a: '0xB3' }, expected: { A: '0x90', v: 0 } },
];

const testUpdateA = () => {
  console.log('Testing updateA routine...');

  const { sourceCode, roms } = compileCodeForTest('submodules/computeF.i4040', 'updateA');
  for (const [idx, { input, expected }] of UPDATE_A_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_A_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateATest(roms.map(({ data }) => data), input);
    if (parseInt(expected.A, 16) !== (parseInt(result.A, 16) % parseInt(input.m, 16)) || result.v !== expected.v) {
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
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit(1);
    }
  }

  console.log('All tests for updateA routine has been passed');
};

const UPDATE_F_TESTS = [
  { input: { k: '0xD7F', f: '0x62', v: 2, vmax: 3, m: '0x533', b: '0x468', A: '0x4A1', a: '0xB' }, expected: { f: '0x1B7' } },
];

const testUpdateF = () => {
  console.log('Testing updateF routine...');

  const { sourceCode, roms } = compileCodeForTest('submodules/computeF.i4040', 'updateF');
  for (const [idx, { input, expected }] of UPDATE_F_TESTS.entries()) {
    console.log(`Run test ${idx + 1} / ${UPDATE_F_TESTS.length} : ${jsser(input)}...`);
    const result = runUpdateFTest(roms.map(({ data }) => data), input);
    if (parseInt(expected.f, 16) !== (parseInt(result, 16) % parseInt(input.m, 16))) {
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
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
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
