import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';

const { romDump } = workerData;

parentPort.on('message', ({ test, testNo }) => {
  let elapsed = 0n;

  const { startingPosition, N, iterations } = test;
  for (const [iterationIdx, { a, digits: initialDigits, expected }] of Object.entries(iterations)) {
    const system = new Emulator({ romDump });
    const { memory, registers } = system;

    const numN = parseInt(N, 16);
    writeValueToMainChars(hexToHWNumber(initialDigits), memory, 0x0, 0);
    writeValueToMainChars(hexToHWNumber(a), memory, 0x9);
    writeValueToMainChars(numToHWNumber(2 * numN), memory, 0xB);
    writeValueToStatusChars(numToHWNumber(numN), memory, 0xE);
    writeValueToStatusChars(numToHWNumber(startingPosition), memory, 0xC);

    registers.ramControl = 0b1110;
    while (!system.isFinished()) {
      system.instruction();
    }

    parentPort.postMessage({
      type: 'output',
      log: `  Test #${testNo}, iteration #${iterationIdx} finished, elapsed ${system.instructionCycles} cycles`,
    });

    elapsed += system.instructionCycles;

    const f = hwNumberToHex(memory[7].registers[0xB].status);
    const digits = hwNumberToHex(memory[0].registers[0].main);
    if (expected.f !== f || expected.digits !== digits) {
      parentPort.postMessage({
        type: 'output',
        log: `    expected f = ${expected.f}, received f = ${f}\n    expected digits = ${expected.digits}, received digits = ${digits}`,
      });

      parentPort.postMessage({
        type: 'failure',
        testNo,
        failedIteration: iterationIdx,
      });
    }
  }

  parentPort.postMessage({ type: 'success', elapsed, testNo });
});
