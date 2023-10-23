/* eslint-disable no-console */

import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compileCodeForTest } from '#utilities/compile.js';
import { hexToHWNumber, numToHWNumber } from '#utilities/numbers.js';

import {
  generateMemoryBankSwitch, updateCodeForUseInEmulator, generateMemoryMainCharactersInitialization,
  generateMemoryStatusCharactersInitialization,
} from '#utilities/codeGenerator.js';

const CYCLES_PER_SECOND = 92500n;

const WORKER_AMOUNT = 16;

(function () {
  let processedTests = 0;
  let runningThreads = 0;
  let total = 0n;

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');
  const statsPath = path.resolve(dirname, './stats.dat');
  const allTests = JSON.parse(fs.readFileSync(path.resolve(dirname, './tests.dat'), 'utf8'));
  const stats = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : {};
  const tests = allTests.filter(({ startingPosition }) => !stats[startingPosition]);

  const { roms, sourceCode } = compileCodeForTest(
    'alternatives/iterative/iterative.i4040',
    '',
    { wrapSourceCode: (code) => code },
  );

  const onMessage = (worker, msg) => {
    const { type } = msg;

    if (type === 'output') {
      console.log(msg.log);
      return;
    }

    const { startingPosition, N, iterations } = tests[msg.testNo];

    if (type === 'failure') {
      const { a, digits } = iterations[msg.failedIteration];
      console.log(`Test failed, a = ${a}, N = ${N} startingPosition = ${startingPosition}`);
      const numN = parseInt(N, 16);
      const initializators = [
        generateMemoryMainCharactersInitialization(0x0, hexToHWNumber(digits)),
        generateMemoryBankSwitch(0x7),
        generateMemoryMainCharactersInitialization(0x9, hexToHWNumber(a)),
        generateMemoryMainCharactersInitialization(0xB, numToHWNumber(2 * numN)),
        generateMemoryStatusCharactersInitialization(0xE, numToHWNumber(numN)),
        generateMemoryStatusCharactersInitialization(0xC, numToHWNumber(startingPosition)),
      ];
      console.log(updateCodeForUseInEmulator(sourceCode, initializators));
      process.exit();
    }

    // success
    const { elapsed, testNo } = msg;
    console.log(`Finished ${testNo}, startingPosition = ${startingPosition}. Time = ${elapsed / CYCLES_PER_SECOND}s`);
    stats[startingPosition] = `${elapsed / CYCLES_PER_SECOND}s`;
    fs.writeFileSync(statsPath, JSON.stringify(stats, undefined, 2));
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
      { workerData: { romDump: roms.map(({ data }) => data) } },
    );

    worker.on('message', (data) => onMessage(worker, data));
    worker.postMessage({ test: tests[processedTests], testNo: processedTests });
    processedTests++;
    runningThreads++;
  }
}());
