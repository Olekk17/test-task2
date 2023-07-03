'use strict';

class CancellablePromise extends Promise {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new Error('Executor must be a function');
    }

    let rejector;

    super((resolve, reject) => {
      rejector = reject;

      executor(
        (value) => {
          resolve(value);
        },
        (reason) => {
          reject(reason);
        }
      );
    });

    this.rejector = rejector;
    this.isCanceled = false;

    this.cancel = () => {
      this.isCanceled = true;
      this.rejector({ isCanceled: this.isCanceled });
    };

    this.oldThen = this.then;

    this.then = (...args) => {
      if (args.length > 0 && typeof args[0] !== 'function') {
        throw new Error();
      }

      return this.oldThen(...args);
    };
  }
}

module.exports = { CancellablePromise };
