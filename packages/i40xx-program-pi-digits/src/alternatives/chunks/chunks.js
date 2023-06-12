/* eslint-disable no-console */

import { Worker } from 'node:worker_threads';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compileCodeForTest } from '#utilities/compile.js';
import { updateCodeForUseInEmulator, generateMemoryBankSwitch } from '#utilities/codeGenerator.js';
import { initMemoryWithInput } from './memory.js';

const CYCLES_PER_SECOND = 95000n;

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
  const tests = allTests.filter(({ input: { a, N } }) => !stats[`${a}_${N}`]);

  const { roms, sourceCode } = compileCodeForTest(
    'alternatives/chunks/chunks.i4040',
    '',
    { wrapSourceCode: (code) => code },
  );

  const onMessage = (worker, msg) => {
    const { type } = msg;

    if (type === 'output') {
      console.log(msg.log);
      return;
    }

    const { a, N } = tests[msg.testNo].input;

    if (type === 'failure') {
      console.log(updateCodeForUseInEmulator(sourceCode, [generateMemoryBankSwitch(0x7)]));
      console.log();

      const memory = Array.from(
        Array(8),
        () => Array.from(Array(16), () => ({ main: Array(16).fill(0), status: Array(4).fill(0) })),
      );
      initMemoryWithInput(memory, tests[msg.testNo].input);

      const dumpPath = path.resolve('./ram.dump');
      fs.writeFileSync(dumpPath, JSON.stringify(memory, undefined, 2));
      console.log(`RAM dump saved at path: ${dumpPath}`);

      process.exit();
    }

    // success
    const { elapsed, testNo } = msg;
    console.log(`Finished ${testNo}, a = ${a}, N = ${N}. Time = ${elapsed / CYCLES_PER_SECOND}s`);
    stats[`${a}_${N}`] = `${elapsed / CYCLES_PER_SECOND}s`;
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
      { workerData: { romDump: roms.map(({ data }) => data), symbols: roms[0].symbols } },
    );

    worker.on('message', (data) => onMessage(worker, data));
    worker.postMessage({ test: tests[processedTests], testNo: processedTests });
    processedTests++;
    runningThreads++;
  }
}());
