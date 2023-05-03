import { workerData, parentPort } from 'node:worker_threads';
import Emulator from 'i40xx-emu';

import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { runWithProfiler } from '#utilities/profiling.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

const { romDump, ramDump, symbols, shouldProfile } = workerData;

const responseWithResult = (system, expected, m, testNo, stacktraces, calls) => {
  const result = hwNumberToHex(system.memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);

  parentPort.postMessage({
    elapsed: system.instructionCycles,
    testNo,
    status: parseInt(expected, 16) === (parseInt(result, 16) % m) ? 'success' : 'failed',
    stacktraces,
    calls,
  });
};

parentPort.on('message', ({ test, testNo }) => {
  const { N, vmax, m, a } = test.input;
  const mNum = parseInt(m, 16);

  const system = new Emulator({ romDump, ramDump });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(numToHWNumber(0x10000 - (parseInt(N, 16) + 1)), memory, VARIABLES.STATUS_MEM_VARIABLE_N_NEG);
  writeValueToStatusChars([0x0, 0x0, vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V);
  putModulusBasedDataIntoMemory(memory, mNum);

  registers.acc = vmax === 1 ? 1 : 0;
  registers.ramControl = 0b1110;

  if (shouldProfile) {
    const { stacktraces, calls } = runWithProfiler(system, symbols);
    responseWithResult(system, test.expected, mNum, testNo, stacktraces, calls);
  } else {
    while (!system.isFinished()) {
      system.instruction();
    }

    responseWithResult(system, test.expected, mNum, testNo);
  }
});
