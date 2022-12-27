/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber } from '#utilties/numbers.js';
import { compileCodeForTest } from '#utilties/compile.js';
import { writeValueToMainChars } from '#utilties/memory.js';
import { runWithProfiler } from '#utilties/profiling.js';

const STARTING_VALUES = { value: '0x8234567890000000', shiftCount: 2 };

(function main() {
  const { rom, labelsOffsets } = compileCodeForTest('submodules/shiftMulti.i4040', 'shiftLeftVarFromMainMemory');

  const system = new Emulator({ romDump: rom });

  const { memory, registers } = system;

  const hwValue = hexToHWNumber(STARTING_VALUES.value);
  writeValueToMainChars(hwValue, memory, 8);
  registers.indexBanks[0][0] = 8;
  registers.indexBanks[0][1] = hwValue.length - 1;
  registers.indexBanks[0][2] = STARTING_VALUES.shiftCount;
  registers.indexBanks[0][3] = 4 - STARTING_VALUES.shiftCount;

  const stacktraces = runWithProfiler(system, labelsOffsets);

  console.log(`Cycles = ${system.instructionCycles.toString()}\n`);
  console.log('Stacktraces:');
  console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));
}());
