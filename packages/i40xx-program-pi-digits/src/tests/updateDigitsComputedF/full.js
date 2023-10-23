/* eslint-disable no-console */

import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compileCodeForTest } from '#utilities/compile.js';
import { initMemoryWithInput } from './memory.js';
import {
  generateMemoryBankSwitch, updateCodeForUseInEmulator, generateRegisterInitialization, generateRegisterBankSwitch,
} from '#utilities/codeGenerator.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const CYCLES_PER_SECOND = 92500n;

const WORKER_AMOUNT = 16;

(function () {
  let processedTests = 0;
  let runningThreads = 0;
  let total = 0n;

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');
  const tests = JSON.parse(fs.readFileSync(path.resolve(dirname, './tests.dat'), 'utf8'));

  const { roms, sourceCode } = compileCodeForTest(
    'submodules/updateDigits.i4040',
    'updateDigits_computedF',
  );

  const onMessage = (worker, { elapsed, testNo, status }) => {
    // process result of finished test
    console.log(`Finished ${testNo}.`);
    if (status !== 'success') {
      const { input } = tests[testNo];
      console.log(`  failed, f = ${input.f}, status = ${status}`);

      const initializators = [
        generateMemoryBankSwitch(0x7),
        generateRegisterInitialization(6, 0x0),
        generateRegisterInitialization(7, 0x4),
        generateRegisterInitialization(13, 0x0),
        generateRegisterBankSwitch(1),
        generateRegisterInitialization(6, 0x0),
        generateRegisterInitialization(7, 0x4),
        generateRegisterBankSwitch(0),
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
