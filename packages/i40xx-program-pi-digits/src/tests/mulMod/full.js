/* eslint-disable no-console */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { compileCodeForTest } from '#utilities/compile.js';
import TasksReader from '#utilities/taskReader.js';

import RAM_DUMP from '#data/multiplicationStaticData/ramWithLookupTables.json' assert { type: 'json' };

const WORKER_AMOUNT = 16;
const TESTS_PER_WORKER = 1000;

const getTestsSliceSpec = () => {
  const sliceStr = process.argv[2];
  if (!sliceStr) {
    return null;
  }

  const [aLen, bLen, mLen] = sliceStr.split('/').map((len) => Number(len) + 2);
  return { aLen, bLen, mLen };
};

const getTestsBySlice = async (tasks, slice) => {
  while (!tasks.isFinished) {
    const tests = await tasks.getTasks(TESTS_PER_WORKER);
    const testsToRun = slice
      ? tests.filter(
        ({ input: { a, b, m } }) => a.length === slice.aLen && b.length === slice.bLen && m.length === slice.mLen,
      )
      : tests;

    if (testsToRun.length) {
      return testsToRun;
    }
  }

  return [];
};

(async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');
  const testsSlice = getTestsSliceSpec();

  if (testsSlice) {
    console.log(`[+] filter tests by a length = ${testsSlice.aLen - 2}, b length = ${testsSlice.bLen - 2} and m length = ${testsSlice.mLen - 2}`);
  }

  const tasks = new TasksReader(
    path.resolve(dirname, './tests.dat'),
    (line) => {
      const [, a, b, m, expected] = line.match(/\s*\{ input: \{ a: '(0x[0-9A-F]+)', b: '(0x[0-9A-F]+)', m: '(0x[0-9A-F]+)' }, expected: '(0x[0-9A-F]+)' },/);
      return { input: { a, b, m }, expected };
    },
  );

  const { roms } = compileCodeForTest('submodules/mulMod_binary_batch.i4040', 'mulMod');

  const stats = {};
  let processedTests = 0;
  let lastProcessedReport = 0;
  let runningThreads = 0;

  const onMessage = async (worker, { elapsed, failedTest }) => {
    processedTests += elapsed.length;
    if (processedTests - lastProcessedReport >= 10_000) {
      lastProcessedReport = processedTests;
      console.log(`[~] Processed ${processedTests}...`);
    }

    if (failedTest) {
      console.log(`[-] Test failed, test = ${JSON.stringify(failedTest)}`);
      process.exit();
    }

    for (const { a, b, m, cycles } of elapsed) {
      const key = `(${a.length - 2} words x ${b.length - 2} words) % ${m.length - 2} words`;
      if (!stats[key]) {
        stats[key] = { count: 0, total: 0n };
      }
      stats[key].total += cycles;
      stats[key].count += 1;
    }
    runningThreads--;

    const tests = await getTestsBySlice(tasks, testsSlice);
    if (!tests.length) {
      if (runningThreads === 0) {
        let totalAllVariants = 0n;
        let countAllVariants = 0n;
        console.log('[+] All done, stats:');
        const sortedStats = Object.entries(stats).sort((a, b) => (b[1].total > a[1].total ? 1 : -1));
        for (const [variant, { total, count }] of sortedStats) {
          console.log(`  ${variant}: ${count} calls, avg = ${total / BigInt(count)} cycles, total = ${total} cycles`);
          totalAllVariants += total;
          countAllVariants += BigInt(count);
        }
        console.log(`  Total: ${totalAllVariants} cycles`);
        console.log(`  Average: ${totalAllVariants / countAllVariants} cycles`);
        process.exit();
      }
      return;
    }
    worker.postMessage({ tests });
    runningThreads++;
  };

  for (let i = 0; i < WORKER_AMOUNT; i++) {
    const worker = new Worker(
      workerPath,
      { workerData: { romDump: roms.map(({ data }) => data), ramDump: RAM_DUMP } },
    );

    worker.on('message', (data) => onMessage(worker, data));

    const initialTests = await getTestsBySlice(tasks, testsSlice);
    worker.postMessage({ tests: initialTests });
    runningThreads++;
  }
}());
