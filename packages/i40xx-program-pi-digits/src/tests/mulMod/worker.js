import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToHex } from '#utilities/numbers.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

const PROLOGUE_CYCLES_COUNT = 7n;

const { romDump, ramDump } = workerData;

const REGISTER_NUMBER_FOR_FIRST_FACTOR = 0x2;
const REGISTER_NUMBER_FOR_SECOND_FACTOR = 0x3;

parentPort.on('message', ({ tests }) => {
  const elapsed = [];
  let failedTest = null;

  for (const test of tests) {
    const { a, b, m } = test.input;

    const system = new Emulator({ romDump, ramDump });
    const { memory, registers } = system;

    putModulusBasedDataIntoMemory(memory, m);
    writeValueToStatusChars(hexToHWNumber(a), memory, REGISTER_NUMBER_FOR_FIRST_FACTOR);
    writeValueToStatusChars(hexToHWNumber(b), memory, REGISTER_NUMBER_FOR_SECOND_FACTOR);

    registers.ramControl = 0b1110;
    registers.indexBanks[0][4] = 0x0;
    registers.indexBanks[0][6] = 0x4;
    registers.indexBanks[0][13] = 0x0;
    registers.indexBanks[0][14] = REGISTER_NUMBER_FOR_SECOND_FACTOR;
    registers.indexBanks[0][15] = REGISTER_NUMBER_FOR_FIRST_FACTOR;
    registers.acc = test.allowSwaps ? 0x1 : 0x0;

    while (!system.isFinished()) {
      system.instruction();
    }

    const result = hwNumberToHex(memory[7].registers[REGISTER_NUMBER_FOR_FIRST_FACTOR].status);
    if (parseInt(test.expected, 16) !== parseInt(result, 16)) {
      failedTest = test;
      break;
    }

    elapsed.push({ a, b, m, cycles: system.instructionCycles - PROLOGUE_CYCLES_COUNT });
  }

  parentPort.postMessage({
    elapsed,
    failedTest,
  });
});
