/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { hexToHWNumber, hwNumberToHex, numToHWNumber } from '#utilities/numbers.js';
import { compileCodeForTest } from '#utilities/compile.js';
import { VARIABLES, writeValueToStatusChars } from '#utilities/memory.js';
import { runWithProfiler } from '#utilities/profiling.js';
import { putModulusBasedDataIntoMemory } from '#data/multiplicationModulusData/multDataGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const CYCLES_PER_SECOND = 92500n;

const STARTING_VALUES = { N: '0x1AC5', vmax: 3, m: '0x533', a: '0xB' };
const EXPECTED_F = '0x3D5';

(function main() {
  const { rom, symbols } = compileCodeForTest('submodules/computeF.i4040', 'computeF');
  console.log('Code has been compiled, running test...');

  const system = new Emulator({ romDump: rom, ramDump: RAM_DUMP });
  const { memory, registers } = system;

  const { m, a, N, vmax } = STARTING_VALUES;
  writeValueToStatusChars(hexToHWNumber(a), memory, VARIABLES.STATUS_MEM_VARIABLE_CURRENT_PRIME);
  writeValueToStatusChars(numToHWNumber(0x10000 - (parseInt(N, 16) + 1)), memory, VARIABLES.STATUS_MEM_VARIABLE_N_NEG);
  writeValueToStatusChars([0x0, 0x0, vmax, 0x0], memory, VARIABLES.STATUS_MEM_VARIABLE_V);
  putModulusBasedDataIntoMemory(memory, parseInt(m, 16));

  registers.ramControl = 0b1110;

  const { stacktraces, calls } = runWithProfiler(system, symbols);

  const result = hwNumberToHex(memory[7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);
  if (parseInt(EXPECTED_F, 16) !== (parseInt(result, 16) % parseInt(m, 16))) {
    console.log('Wrong answer! Profile could be incorrect.');
    return;
  }

  console.log(`Cycles = ${system.instructionCycles.toString()}, seconds = ${system.instructionCycles / CYCLES_PER_SECOND}`);
  console.log('Calls:');
  console.log([...calls.entries()].map(([functionName, times]) => `  ${functionName} ${times}`).join('\n'));
  console.log();
  console.log('Stacktraces:');
  console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));
}());
