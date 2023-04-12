/* eslint-disable no-console */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { compileCodeForTest } from '#utilities/compile.js';
import TasksReader from '#utilities/taskReader.js';

import RAM_DUMP from '../data/ramWithLookupTables.json' assert { type: 'json' };

const WORKER_AMOUNT = 16;
const TESTS_PER_WORKER = 1000;

const wrapSourceCode = (sourceCode) => `
entrypoint:
  JCN z, regularCall 
  JMS mulMod_withSwaps
  HLT
regularCall:
  JMS mulMod
  HLT

${sourceCode}
`;

(async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');

  const tasks = new TasksReader(
    path.resolve(dirname, './tests.dat'),
    (line) => {
      const [, a, b, m, expected, allowSwaps] = line.match(/\s*\{ input: \{ a: '(0x[0-9A-F]+)', b: '(0x[0-9A-F]+)', m: '(0x[0-9A-F]+)' }, expected: '(0x[0-9A-F]+)', allowSwaps: (\w+) },/);
      return { input: { a, b, m }, expected, allowSwaps: allowSwaps === 'true' };
    },
  );

  const { rom } = compileCodeForTest('submodules/mulMod_binary_batch.i4040', 'mulMod', { wrapSourceCode });

  const stats = {};
  let processedTests = 0;
  let runningThreads = 0;

  const onMessage = async (worker, { elapsed, failedTest }) => {
    processedTests += elapsed.length;
    if (processedTests % 10000 === 0) {
      console.log(`[~] Processed ${processedTests}...`);
    }

    if (failedTest) {
      console.log(`[-] Test failed, input = ${JSON.stringify(failedTest)}`);
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

    const tests = await tasks.getTasks(TESTS_PER_WORKER);
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
      { workerData: { romDump: rom, ramDump: RAM_DUMP } },
    );

    worker.on('message', (data) => onMessage(worker, data));

    const initialTests = await tasks.getTasks(TESTS_PER_WORKER);
    worker.postMessage({ tests: initialTests });
    runningThreads++;
  }
}());
