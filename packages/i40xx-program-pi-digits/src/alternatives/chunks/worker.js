import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { hwNumberToHex } from '#utilities/numbers.js';
import { initMemoryWithInput } from './memory.js';
import { getMemoryBankFromAbsoluteAddr } from '#utilities/memory.js';

const { romDump, symbols } = workerData;

parentPort.on('message', ({ test, testNo }) => {
  const system = new Emulator({ romDump });
  const { memory, registers } = system;

  initMemoryWithInput(memory, test.input);

  const labelOffsetForProgress = symbols.find(({ label }) => label === 'computef_loop').romAddress;
  let iterations = 0;

  registers.ramControl = 0b1110;
  while (!system.isFinished()) {
    if (registers.pc === labelOffsetForProgress) {
      iterations++;
      if (iterations % 100 === 0) {
        const k = hwNumberToHex(memory[0x7].registers[0x6].main);
        parentPort.postMessage({
          type: 'output',
          log: `  test #${testNo}, iteration #${iterations}, k = ${k}`,
        });
      }
    }

    system.instruction();
  }

  const f = hwNumberToHex(memory[0x7].registers[0xB].status);
  if (f !== test.expected.f) {
    parentPort.postMessage({
      type: 'output',
      log: `Test #${testNo} expected f = ${test.expected.f}, received = ${f}\n`,
    });

    parentPort.postMessage({ type: 'failure', testNo });
  }

  for (const [idx, expectedChunk] of test.expected.chunks.entries()) {
    const chunk = hwNumberToHex(memory[getMemoryBankFromAbsoluteAddr(idx)].registers[idx % 16].main);
    if (chunk !== expectedChunk) {
      parentPort.postMessage({
        type: 'output',
        log: `Test #${testNo} expected chunk #${idx} = ${expectedChunk}, received = ${chunk}\n`,
      });

      parentPort.postMessage({ type: 'failure', testNo });
      return;
    }
  }

  parentPort.postMessage({ type: 'success', elapsed: system.instructionCycles, testNo });
});
