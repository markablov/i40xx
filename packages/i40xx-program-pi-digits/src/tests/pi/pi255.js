/* eslint-disable no-console */

import Emulator from 'i40xx-emu';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compileCodeForTest } from '#utilities/compile.js';
import { hwNumberToHex } from '#utilities/numbers.js';
import { getMemoryBankFromAbsoluteAddr, VARIABLES } from '#utilities/memory.js';
import { runWithProfiler } from '#utilities/profiling.js';

const CYCLES_PER_SECOND = 92500n;
const LABELS_FOR_CHECKS = ['computepidigits_initialprimesegment_loop', 'computepidigits_onevmax_loop'];

const PROFILING = true;

const PI = '3141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117067982148086513282306647093844609550582231725359408128481117450284102701938521105559644622948954930381964428810975665933446128475648233786783165271201909145648566923';

(function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const intermediateChecks = JSON.parse(fs.readFileSync(path.resolve(dirname, './pi255.dat'), 'utf8'));

  const { roms } = compileCodeForTest('pi255.i4040', '', { wrapSourceCode: (sourceCode) => sourceCode });

  let res = '';
  const system = new Emulator({
    romDump: roms.map(({ data }) => data),
    ramOutputHandler: (({ data }) => {
      if (data !== 0xF) {
        res += String(data);
      }
    }),
  });

  const labelOffsetForChecks = new Set(
    roms[0].symbols.filter(({ label }) => LABELS_FOR_CHECKS.includes(label)).map(({ romAddress }) => romAddress),
  );

  if (PROFILING) {
    const { calls, stacktraces } = runWithProfiler(system, roms.map(({ symbols }) => symbols));
    console.log('Calls:');
    console.log([...calls.entries()].map(([functionName, times]) => `  ${functionName} ${times}`).join('\n'));
    console.log();
    console.log('Stacktraces:');
    console.log([...stacktraces.entries()].map(([stacktrace, cycles]) => `${stacktrace} ${cycles}`).join('\n'));
  } else {
    let checksDone = 0;
    while (!system.isFinished()) {
      if (labelOffsetForChecks.has(system.registers.pc) && system.registers.selectedRomBank === 0) {
        const m = hwNumberToHex(system.memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_MODULUS].status);
        const negN = hwNumberToHex(system.memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_N_NEG].status);
        console.log(`Check #${checksDone} for intermediate chunks...`);
        for (const [idx, expected] of intermediateChecks[`${m}_${negN}`].entries()) {
          const result = hwNumberToHex(system.memory[getMemoryBankFromAbsoluteAddr(idx)].registers[idx % 16].main);
          const f = hwNumberToHex(system.memory[0x7].registers[VARIABLES.STATUS_MEM_VARIABLE_F].status);
          if (result !== expected) {
            console.log(`  failed chunk #${idx}, f = ${f}, m = ${m}`);
            console.log(`  result = ${result}, expected = ${expected}`);
            process.exit();
          }
        }
        checksDone++;
      }
      system.instruction();
    }
  }

  if (res === PI) {
    console.log(`Correct digits of Pi has been received! ${res.slice(0, 10)}...${res.slice(-10)}`);
  } else {
    console.log('Computed Pi is not real Pi!');
  }

  console.log(`Elapsed ${system.instructionCycles / CYCLES_PER_SECOND}s`);
}());
