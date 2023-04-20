import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';

const PROLOGUE_CYCLES_COUNT = 5n;

const { romDump, ramDump } = workerData;

parentPort.on('message', ({ tests }) => {
  const elapsed = [];
  let failedTest = null;

  for (const test of tests) {
    const { a, m } = test.input;

    const system = new Emulator({ romDump, ramDump });
    const { memory, registers } = system;

    const mNum = parseInt(m, 16);
    writeValueToStatusChars(numToHWNumber(mNum), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS);
    writeValueToStatusChars(numToHWNumber(0x10000 - mNum), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV);
    writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_A);

    registers.ramControl = 0b1110;

    while (!system.isFinished()) {
      system.instruction();
    }

    const result = hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F_COMPUTATION_FK].status);
    if (parseInt(test.expected, 16) !== parseInt(result, 16)) {
      failedTest = test.input;
      break;
    }

    elapsed.push({ a, m, cycles: system.instructionCycles - PROLOGUE_CYCLES_COUNT });
  }

  parentPort.postMessage({
    elapsed,
    failedTest,
  });
});
