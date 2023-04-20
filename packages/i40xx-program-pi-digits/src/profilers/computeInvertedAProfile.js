/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { runWithProfiler } from '#utilities/profiling.js';

const STARTING_VALUES = { A: '0x4E2', vmax: 3, m: '0x533', a: '0xB' };

(function main() {
  const { rom, labelsOffsets } = compileCodeForTest('submodules/computeInvertedA_euler.i4040', 'computeInvertedA');

  console.log('Code has been compiled, running test...');

  const system = new Emulator({ romDump: rom });
  const { memory } = system;

  writeValueToMainChars(hexToHWNumber(STARTING_VALUES.m), memory, 0x07, 7);
  writeValueToMainChars(hexToHWNumber(STARTING_VALUES.a), memory, 0x09, 7);
  writeValueToStatusChars([0x0, 0x0, STARTING_VALUES.vmax, 0x00], memory, 0x06, 7);
  writeValueToStatusChars(hexToHWNumber(STARTING_VALUES.A), memory, 0x0A, 7);

  const stacktraces = runWithProfiler(system, labelsOffsets);

  console.log(`Cycles = ${system.instructionCycles.toString()}`);
  console.log('Stacktraces:');
  console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));
}());
