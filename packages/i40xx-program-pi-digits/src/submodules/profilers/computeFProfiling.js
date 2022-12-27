/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber } from '#utilties/numbers.js';
import { compileCodeForTest } from '#utilties/compile.js';
import { writeValueToMainChars, writeValueToStatusChars } from '#utilties/memory.js';
import { runWithProfiler } from '#utilties/profiling.js';

const CYCLES_PER_SECOND = 95000n;

const STARTING_VALUES = { N: '0x1AC5', v: 1, vmax: 3, m: '0x533', a: '0xB' };

(function main() {
  const { rom, labelsOffsets } = compileCodeForTest('submodules/computeF.i4040', 'computeF');
  console.log('Code has been compiled, running test...');

  const loopIterationCodeOffset = labelsOffsets.computef_loop;

  const system = new Emulator({ romDump: rom });
  const { memory } = system;

  writeValueToMainChars(hexToHWNumber(STARTING_VALUES.m), memory, 0x07);
  writeValueToMainChars(hexToHWNumber(STARTING_VALUES.a), memory, 0x09);
  writeValueToStatusChars(hexToHWNumber(STARTING_VALUES.N), memory, 0x0E);
  writeValueToStatusChars([0x0, 0x0, STARTING_VALUES.vmax, STARTING_VALUES.v], memory, 0x06);

  const stacktraces = runWithProfiler(system, labelsOffsets, loopIterationCodeOffset);

  console.log(`Cycles = ${system.instructionCycles.toString()}, seconds = ${system.instructionCycles / CYCLES_PER_SECOND}`);
  console.log('Stacktraces:');
  console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));
}());
