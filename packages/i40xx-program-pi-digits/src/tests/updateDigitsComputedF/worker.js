import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { hwNumberToHex } from '#utilities/numbers.js';
import { initMemoryWithInput, getMemoryBankFromAbsoluteAddr } from './memory.js';

const { romDump, ramDump } = workerData;

parentPort.on('message', ({ test, testNo }) => {
  const system = new Emulator({ romDump, ramDump });
  const { memory, registers } = system;

  initMemoryWithInput(memory, test.input);

  registers.indexBanks[0][13] = 0x0;
  registers.ramControl = 0b1110;

  while (!system.isFinished()) {
    system.instruction();
  }

  for (const [idx, expected] of test.expected.entries()) {
    const result = hwNumberToHex(memory[getMemoryBankFromAbsoluteAddr(idx)].registers[idx % 16].main);
    if (result !== expected) {
      parentPort.postMessage({ elapsed: system.instructionCycles, testNo, status: `failed chunk #${idx}` });
    }
  }

  parentPort.postMessage({ elapsed: system.instructionCycles, testNo, status: 'success' });
});
