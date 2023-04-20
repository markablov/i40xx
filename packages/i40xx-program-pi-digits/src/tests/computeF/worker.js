import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { runWithProfiler } from '#utilities/profiling.js';

const { romDump, ramDump, symbols, shouldProfile } = workerData;

const responseWithResult = (system, expected, testNo, stacktraces) => {
  const result = hwNumberToHex(system.memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);

  parentPort.postMessage({
    elapsed: system.instructionCycles,
    testNo,
    status: parseInt(expected, 16) === parseInt(result, 16) ? 'success' : 'failed',
    stacktraces,
  });
};

parentPort.on('message', ({ test, testNo }) => {
  const { N, vmax, m, a } = test.input;

  const system = new Emulator({ romDump, ramDump });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS);
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(hexToHWNumber(N), memory, VARIABLES.STATUS_MEM_VARIABLE_N);
  writeValueToStatusChars([0x0, 0x0, vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V);
  writeValueToStatusChars(numToHWNumber(0x10000 - parseInt(m, 16)), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS_INV);

  registers.ramControl = 0b1110;

  if (shouldProfile) {
    const { stacktraces } = runWithProfiler(system, symbols);
    responseWithResult(system, test.expected, testNo, stacktraces);
  } else {
    while (!system.isFinished()) {
      system.instruction();
    }

    responseWithResult(system, test.expected, testNo);
  }
});
