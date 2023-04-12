import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { VARIABLES, writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';

const PROLOGUE_CYCLES_COUNT = 7n;

const { romDump, ramDump } = workerData;

parentPort.on('message', ({ tests }) => {
  const elapsed = [];
  let failedTest = null;

  for (const test of tests) {
    const { a, b, m } = test.input;

    const system = new Emulator({ romDump, ramDump });
    const { memory, registers } = system;

    writeValueToStatusChars(hexToHWNumber(m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS);
    writeValueToStatusChars(hexToHWNumber(a), memory, 0x03);
    writeValueToStatusChars(hexToHWNumber(b), memory, 0x04);
    const mNum = parseInt(m, 16);
    const invertedM = 0x10000 - mNum;
    writeValueToStatusChars(numToHWNumber(invertedM), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV);
    writeValueToMainChars([mNum > 0x1000 ? 0x01 : 0x00], memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV);

    const highestModulusDigit = mNum >= 0x100 ? parseInt(m[2], 16) : 0x00;
    for (let highestFactorDigit = 0; highestFactorDigit < 16; highestFactorDigit++) {
      memory[7].registers[3].main[highestFactorDigit] = (highestFactorDigit < highestModulusDigit) ? 0x0 : 0x1;
    }

    registers.ramControl = 0b1110;
    registers.indexBanks[0][14] = 4;
    registers.indexBanks[0][15] = 3;
    registers.indexBanks[1][14] = 4;
    registers.indexBanks[1][15] = 3;
    registers.acc = test.allowSwaps ? 0x1 : 0x0;

    while (!system.isFinished()) {
      system.instruction();
    }

    const result = hwNumberToHex(memory[7].registers[0x3].status);
    if (parseInt(test.expected, 16) !== parseInt(result, 16)) {
      failedTest = test.input;
      break;
    }

    elapsed.push({ a, b, m, cycles: system.instructionCycles - PROLOGUE_CYCLES_COUNT });
  }

  parentPort.postMessage({
    elapsed,
    failedTest,
  });
});
