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

  /**
   * Manually process the queue
   */
  async process() {
    while (this._priority.length > 0 || this._background.length > 0) {
      const taskToRun = this._priority.shift() || this._background.shift();
      if (taskToRun) {
        await taskToRun;
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
