/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';
import { updateCodeForUseInEmulator } from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const PROLOGUE_CYCLES_COUNT = 5n;
const CYCLES_PER_SECOND = 95000n;

const runTest = (romDump) => {
  const system = new Emulator({ romDump });

  while (!system.isFinished()) {
    system.instruction();
  }

  return { memory: system.memory, elapsed: system.instructionCycles };
};

(function main() {
  const { roms, sourceCode } = compileCodeForTest('submodules/mulTableGeneration.i4040', 'generateMulTables');

  const { memory, elapsed } = runTest(roms.map(({ data }) => data));
  for (let bankNo = 1; bankNo <= 6; bankNo++) {
    for (let regNo = 0; regNo <= 0xF; regNo++) {
      if (memory[bankNo].registers[regNo].status.some((char, idx) => char !== RAM_DUMP[bankNo][regNo].status[idx])) {
        console.log(`Test failed, bank = ${bankNo}, reg = ${regNo}`);
        console.log('Code to reproduce:');
        console.log(updateCodeForUseInEmulator(sourceCode));
        process.exit(1);
      }
    }
  }

  console.log(`Total time = ${(elapsed - PROLOGUE_CYCLES_COUNT) / CYCLES_PER_SECOND}s, ${elapsed} cycles`);
}());
