/* eslint-disable no-console */

import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compileCodeForTest } from '#utilities/compile.js';
import { numToHWNumber } from '#utilities/numbers.js';
import { initMemoryWithInput } from './memory.js';

import {
  generateMemoryBankSwitch, updateCodeForUseInEmulator, generateAccumulatorInitialization,
  generateRegisterInitialization,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const CYCLES_PER_SECOND = 92500n;

const WORKER_AMOUNT = 16;

const wrapSourceCode = (sourceCode) => `
entrypoint:
  JCN z, computeF_regular 
  JMS updateDigits_oneVMax
  HLT
computeF_regular:
  JMS updateDigits
  HLT

${sourceCode}
`;

(function () {
  let processedTests = 0;
  let runningThreads = 0;
  let total = 0n;

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');
  const tests = JSON.parse(fs.readFileSync(path.resolve(dirname, './tests.dat'), 'utf8'));

  const { roms, sourceCode } = compileCodeForTest(
    'submodules/updateDigits.i4040',
    '',
    { wrapSourceCode },
  );

  const onMessage = (worker, { elapsed, testNo, status }) => {
    // process result of finished test
    console.log(`Finished ${testNo}.`);
    if (status !== 'success') {
      const { input } = tests[testNo];
      const aNum = parseInt(input.a, 16);
      const aHW = numToHWNumber(aNum, 4);
      const vmaxIsOne = aNum ** 2 > (2 * parseInt(input.N, 16));

      console.log(`  failed, a = ${input.a}, N = ${input.N} status = ${status}`);

      const initializators = [
        generateMemoryBankSwitch(0x7),
        ...(vmaxIsOne
          ? [
            generateRegisterInitialization(0, aHW[0]),
            generateRegisterInitialization(1, aHW[1]),
            generateRegisterInitialization(2, aHW[2]),
            generateRegisterInitialization(3, aHW[3]),
          ]
          : [
            generateRegisterInitialization(10, aHW[0]),
            generateRegisterInitialization(11, aHW[1]),
          ]
        ),
        generateAccumulatorInitialization(vmaxIsOne ? 1 : 0),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      console.log();

      const dumpPath = path.resolve('./ram.dump');
      initMemoryWithInput(RAM_DUMP, input);
      fs.writeFileSync(dumpPath, JSON.stringify(RAM_DUMP, undefined, 2));
      console.log(`RAM dump saved at path: ${dumpPath}`);

      process.exit();
    }
    total += elapsed;
    runningThreads--;

    // run new test
    if (processedTests >= tests.length) {
      if (runningThreads === 0) {
        console.log(`All done, total time = ${total / CYCLES_PER_SECOND}s, avg. time = ${(total / BigInt(tests.length)) / CYCLES_PER_SECOND}s`);
        process.exit();
      }
      return;
    }
    worker.postMessage({ test: tests[processedTests], testNo: processedTests });
    processedTests++;
    runningThreads++;
  };

  console.log(`Tests to execute: ${tests.length}, worker threads = ${WORKER_AMOUNT}`);
  for (let i = 0; i < WORKER_AMOUNT; i++) {
    const worker = new Worker(
      workerPath,
      { workerData: { romDump: roms.map(({ data }) => data), ramDump: RAM_DUMP } },
    );

    worker.on('message', (data) => onMessage(worker, data));
    worker.postMessage({ test: tests[processedTests], testNo: processedTests });
    processedTests++;
    runningThreads++;
  }
}());
