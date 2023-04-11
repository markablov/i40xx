import fs from 'node:fs';

export default class TasksReader {
  // start to read file if tasks amount reached that low boundary
  static #DRAIN_THRESHOLD = 50_000;

  // pause reading if we have that amount of tasks in list
  static #STOP_THRESHOLD = 100_000;

  #tasks = [];

  #lines;

  #isFinished = false;

  #readingPromise = null;

  #lineParser = null;

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
      while (this.#tasks.length < TasksReader.#STOP_THRESHOLD) {
        const { done, value: line } = await this.#lines.next();
        if (done) {
          this.#isFinished = true;
          return;
        }

        this.#tasks.push(this.#lineParser(line));
      }
    } finally {
      this.#readingPromise = null;
    }
  }

  async #readTasksOnce() {
    this.#readingPromise = this.#readingPromise || this.#readTasks();
    return this.#readingPromise;
  }

  constructor(filePath, lineParser) {
    const stream = fs.createReadStream(filePath);
    this.#lines = TasksReader.#linesGenerator(stream);
    this.#lineParser = lineParser;
  }

  async getTasks(amount) {
    if (this.#isFinished) {
      return this.#tasks.length ? this.#tasks.splice(0, amount) : [];
    }

    if (this.#tasks.length > amount) {
      const tasksToReturn = this.#tasks.splice(0, amount);
      if (this.#tasks.length < TasksReader.#DRAIN_THRESHOLD) {
        // floating
        this.#readTasksOnce();
      }
      return tasksToReturn;
    }

    await this.#readTasksOnce();
    return this.#tasks.splice(0, amount);
  }
}
