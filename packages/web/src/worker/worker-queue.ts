export class IncomingEventsQueue {
  _priority: Promise<void>[];
  _background: Promise<void>[];
  _current: Promise<void>;

  constructor() {
    this._priority = [];
    this._background = [];
    this._current = Promise.resolve();
  }

  enqueuePriority(task: () => Promise<void>) {
    const taskPromise = this._current.then(() => task());
    this._priority.push(taskPromise);
    this._current = taskPromise.catch(() => {});
    return taskPromise;
  }

  enqueueBackground(task: () => Promise<void>) {
    const taskPromise = this._current.then(() => task());
    this._background.push(taskPromise);
    this._current = taskPromise.catch(() => {});
    return taskPromise;
  }

  clearPriority() {
    this._priority = [];
  }

  clearBackground() {
    this._background = [];
  }

  // Add a sleep function to introduce delay
  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Manually process the queue with throttling
   */
  async process(batchSize = 5, delay = 500) {
    while (this._priority.length > 0 || this._background.length > 0) {
      const tasksToRun = [];

      // Take `batchSize` tasks from priority queue or from the background queue
      while (
        tasksToRun.length < batchSize &&
        (this._priority.length > 0 || this._background.length > 0)
      ) {
        tasksToRun.push(this._priority.shift() || this._background.shift());
      }

      // Wait for the batch to complete
      await Promise.all(tasksToRun);

      // Introduce a delay before the next batch
      if (this._priority.length > 0 || this._background.length > 0) {
        await this.sleep(delay);
      }
    }

    this._current = Promise.resolve();
  }

  clear() {
    this._priority = [];
    this._background = [];
    this._current = Promise.resolve();
  }
}
