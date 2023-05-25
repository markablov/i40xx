import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { initMemoryWithInput } from './memory.js';
import { VARIABLES, getMemoryBankFromAbsoluteAddr } from '#utilities/memory.js';

const { romDump, ramDump } = workerData;

parentPort.on('message', ({ test, testNo }) => {
  const system = new Emulator({ romDump, ramDump });
  const { memory, registers } = system;

  const aNum = parseInt(test.input.a, 16);
  const vmaxIsOne = aNum ** 2 > (2 * parseInt(test.input.N, 16));

  initMemoryWithInput(memory, test.input);

  registers.ramControl = 0b1110;
  registers.acc = vmaxIsOne ? 1 : 0;
  if (vmaxIsOne) {
    const regBank = registers.indexBanks[0];
    [regBank[0], regBank[1], regBank[2], regBank[3]] = numToHWNumber(aNum, 4);
  } else {
    registers.indexBanks[0][10] = aNum & 0xF;
    registers.indexBanks[0][11] = aNum >> 4;
  }

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
