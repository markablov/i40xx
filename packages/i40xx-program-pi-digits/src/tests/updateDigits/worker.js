import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { hwNumberToHex } from '#utilities/numbers.js';
import { initMemoryWithInput } from './memory.js';
import { VARIABLES, getMemoryBankFromAbsoluteAddr } from '#utilities/memory.js';

const { romDump, ramDump } = workerData;

parentPort.on('message', ({ test, testNo }) => {
  const system = new Emulator({ romDump, ramDump });
  const { memory, registers } = system;

  initMemoryWithInput(memory, test.input);

  registers.ramControl = 0b1110;
  registers.acc = parseInt(test.input.a, 16) ** 2 > (2 * parseInt(test.input.N, 16)) ? 1 : 0;

  while (!system.isFinished()) {
    system.instruction();
  }

  for (const [idx, expected] of test.expected.entries()) {
    const result = hwNumberToHex(memory[getMemoryBankFromAbsoluteAddr(idx)].registers[idx % 16].main);
    const f = hwNumberToHex(memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);
    if (result !== expected) {
      parentPort.postMessage({
        elapsed: system.instructionCycles,
        testNo,
        status: `failed chunk #${idx}, f = ${f}`,
      });
    }
  }

  parentPort.postMessage({ elapsed: system.instructionCycles, testNo, status: 'success' });
});
