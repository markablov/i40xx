import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToNum } from '#utilities/numbers.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

const PROLOGUE_CYCLES_COUNT = 5n;

const { romDump, ramDump } = workerData;

const REGISTER_NUMBER_FOR_SECOND_FACTOR = 0x3;

parentPort.on('message', ({ tests }) => {
  const elapsed = [];
  let failedTest = null;

  for (const test of tests) {
    const { a, b, m } = test.input;

    const system = new Emulator({ romDump, ramDump });
    const { memory, registers } = system;

    putModulusBasedDataIntoMemory(memory, parseInt(m, 16));
    writeValueToStatusChars(hexToHWNumber(b), memory, REGISTER_NUMBER_FOR_SECOND_FACTOR);

    const registersBank = registers.indexBanks[0];
    registers.ramControl = 0b1110;

    registersBank[12] = REGISTER_NUMBER_FOR_SECOND_FACTOR;
    registersBank[13] = 0x0;
    registersBank[6] = 0x0;
    registersBank[7] = 0x4;

    const aNumHW = hexToHWNumber(a);
    registersBank[0] = aNumHW[0] || 0;
    registersBank[1] = aNumHW[1] || 0;
    registersBank[3] = aNumHW[2] || 0;
    registersBank[2] = aNumHW[3] || 0;

    while (!system.isFinished()) {
      system.instruction();
    }

    const result = hwNumberToNum([registersBank[0], registersBank[1], registersBank[3], registersBank[2]]);
    if (parseInt(test.expected, 16) !== result) {
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
