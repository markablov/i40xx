/* eslint-disable no-console */

import Emulator from 'i40xx-emu';

import { compileCodeForTest } from '#utilities/compile.js';

const CYCLES_PER_SECOND = 92500n;

const PI = '3141592653';

(function main() {
  const { roms } = compileCodeForTest('pi9.i4040', '', { wrapSourceCode: (sourceCode) => sourceCode });

  let res = '';
  const system = new Emulator({
    romDump: roms.map(({ data }) => data),
    ramOutputHandler: (({ data }) => {
      if (data !== 0xF) {
        res += String(data);
      }
    }),
  });

  while (!system.isFinished()) {
    system.instruction();
  }

  if (res === PI) {
    console.log(`Correct digits of Pi has been received! ${res}`);
  } else {
    console.log(`Computed Pi is not real Pi! ${res}`);
  }

  console.log(`Elapsed ${system.instructionCycles / CYCLES_PER_SECOND}s`);
}());
