/* eslint-disable no-console */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { Worker } from 'node:worker_threads';

import { compileCodeForTest } from '#utilities/compile.js';

import RAM_DUMP from '../data/ramWithLookupTables.json' assert { type: 'json' };

const WORKER_AMOUNT = 16;
const TESTS_PER_WORKER = 1000;

class Tasks {
  // start to read file if tasks amount reached that low boundary
  static #DRAIN_THRESHOLD = 50_000;

  // pause reading if we have that amount of tasks in list
  static #STOP_THRESHOLD = 100_000;

  #tasks = [];

  #lines;

  #isFinished = false;

  #readingPromise = null;

  #addTask(line) {
    const [, a, b, m, expected] = line.match(/\s*\{ input: \{ a: '(0x[0-9A-F]+)', b: '(0x[0-9A-F]+)', m: '(0x[0-9A-F]+)' }, expected: '(0x[0-9A-F]+)' },/);
    this.#tasks.push({ input: { a, b, m }, expected });
  }

  static async* #linesGenerator(stream) {
    let reminder = '';

    for await (const chunk of stream) {
      const lines = (reminder + chunk.toString()).split(/\r?\n/g);
      reminder = lines.pop();
      for (const line of lines) {
        yield line;
      }
    }

    yield reminder;
  }

  async #readTasks() {
    try {
      while (this.#tasks.length < Tasks.#STOP_THRESHOLD) {
        const { done, value: line } = await this.#lines.next();
        if (done) {
          this.#isFinished = true;
          return;
        }

        this.#addTask(line);
      }
    } finally {
      this.#readingPromise = null;
    }
  }

  async #readTasksOnce() {
    this.#readingPromise = this.#readingPromise || this.#readTasks();
    return this.#readingPromise;
  }

  constructor(filePath) {
    const stream = fs.createReadStream(filePath);
    this.#lines = Tasks.#linesGenerator(stream);
  }

  async getTasks(amount) {
    if (this.#isFinished) {
      return this.#tasks.length ? this.#tasks.splice(0, amount) : [];
    }

    if (this.#tasks.length > amount) {
      const tasksToReturn = this.#tasks.splice(0, amount);
      if (this.#tasks.length < Tasks.#DRAIN_THRESHOLD) {
        // floating
        this.#readTasksOnce();
      }
      return tasksToReturn;
    }

    await this.#readTasksOnce();
    return this.#tasks.splice(0, amount);
  }
}

(async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const workerPath = path.resolve(dirname, './worker.js');

  const tasks = new Tasks(path.resolve(dirname, './tests.dat'));
  const { rom } = compileCodeForTest('submodules/mulMod_binary_batch.i4040', 'mulMod');

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
        console.log('[+] All done, stats:');
        const sortedStats = Object.entries(stats).sort((a, b) => (b[1].total > a[1].total ? 1 : -1));
        for (const [variant, { total, count }] of sortedStats) {
          console.log(`  ${variant}: ${count} calls, avg = ${total / BigInt(count)} cycles, total = ${total} cycles`);
          totalAllVariants += total;
        }
        console.log(`  Total: ${totalAllVariants} cycles`);
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
