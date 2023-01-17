/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { VARIABLES, writeValueToMainChars, writeValueToStatusChars } from '#utilities/memory.js';
import { runWithProfiler } from '#utilities/profiling.js';

import RAM_DUMP from '../tests/data/ramWithLookupTables.json' assert { type: 'json' };

const CYCLES_PER_SECOND = 95000n;

const STARTING_VALUES = { N: '0x1AC5', vmax: 3, m: '0x533', a: '0xB' };

(function main() {
  const { rom, labelsOffsets } = compileCodeForTest('submodules/computeF.i4040', 'computeF');
  console.log('Code has been compiled, running test...');

  const loopIterationCodeOffset = labelsOffsets.computef_loop;

  const system = new Emulator({ romDump: rom, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  writeValueToStatusChars(hexToHWNumber(STARTING_VALUES.m), memory, VARIABLES.STATUS_MEM_VARIABLE_MODULUS, 7);
  writeValueToStatusChars(hexToHWNumber(STARTING_VALUES.a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME, 7);
  writeValueToStatusChars(hexToHWNumber(STARTING_VALUES.N), memory, VARIABLES.STATUS_MEM_VARIABLE_N, 7);
  writeValueToStatusChars([0x0, 0x0, STARTING_VALUES.vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V, 7);
  writeValueToMainChars(hexToHWNumber(STARTING_VALUES.a), memory, VARIABLES.MAIN_MEM_VARIABLE_DIV_DIVISOR, 7);

  registers.ramControl = 0b1110;

  const { stacktraces, functionCalls } = runWithProfiler(system, labelsOffsets, loopIterationCodeOffset);

  console.log(`Cycles = ${system.instructionCycles.toString()}, seconds = ${system.instructionCycles / CYCLES_PER_SECOND}`);
  console.log('Stacktraces:');
  console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));

  console.log('Function calls:');
  console.log([...functionCalls.entries()].map(([name, times]) => `${name} ${times}`).join('\n'));
}());
