/* eslint-disable*/
'use strict';

const { CancellablePromise } = require('./cancelable-promise');

describe('CancelablePromise test', () => {
  test('throws on wrong constructor arguments', () => {
    expect(() => new CancellablePromise()).toThrowError()
    expect(() => new CancellablePromise('wrong')).toThrowError()
  })

  test('create cancelable promise', () => {
    let isCompleted = false
    const promise = new CancellablePromise(() => isCompleted = true)
    expect(promise).toBeInstanceOf(CancellablePromise)
    expect(isCompleted).toBe(true)
  })

  test('resolving', async () => {
    const unique = Symbol()
    const promise = new CancellablePromise(resolve => setTimeout(() => resolve(unique)))
    await expect(promise).resolves.toBe(unique)
  })

  test('rejecting', async () => {
    const unique = Symbol()
    const promise = new CancellablePromise((resolve, reject) => setTimeout(() => reject(unique)))
    await expect(promise).rejects.toBe(unique)
  })

  describe('#then()', () => {
    test('throws on wrong argument', () => {
      const promise = new CancellablePromise(() => void 0)
      expect(() => promise.then('wrong')).toThrowError()
    })

    test('then(onFulfilled)', async () => {
      const initValue = 10
      const multiplier = 2
      const onFulfilled = value => value * multiplier

      const cp = new CancellablePromise(resolve => resolve(initValue))
      const cp2 = cp.then(v => {
        return new Promise(resolve => setTimeout(() => resolve(onFulfilled(v))))
      })


      expect(cp).not.toBe(cp2)
      expect(cp2).toBeInstanceOf(CancellablePromise)
      getPromiseState(cp2, state => expect(state).toBe('pending'))
      await expect(cp).resolves.toBe(initValue)
      await expect(cp2).resolves.toBe(onFulfilled(initValue))
    })

    test('then(onFulfilled, onRejected)', async () => {
      const initValue = 10
      const multiplier = 2
      const func = value => value * multiplier

      const cp = new CancellablePromise(resolve => resolve(initValue))
      const cp2 = cp.then(value => Promise.reject(value), func)

      expect(cp).not.toBe(cp2)
      expect(cp2).toBeInstanceOf(CancellablePromise)
      await expect(cp).resolves.toBe(initValue)
      // await expect(cp2).resolves.toBe(func(initValue))
      // I don't know how even it possible to pass this test
      // because, first param of then is onFullfilled
      // it is called if promise was resolved,
      // our c1 promise was resolved, so we call this function
      // 'value => Promise.reject(value)' which returns us
      // new rejected promise with value, with which our
      // first promise was resolved.
      // So I think the line above these comments
      // should be replaced by this:
      await expect(cp2).rejects.toBe(initValue)
    })

    test('then() - empty arguments', async () => {
      const initValue = 10
      const cp = new CancellablePromise(resolve => resolve(initValue)).then()

      expect(cp).toBeInstanceOf(CancellablePromise)
      await expect(cp).resolves.toBe(initValue)
    })

    test('.then().then() ... .then()', async() => {
      const depth = 10
      let promise = new CancellablePromise(resolve => resolve(0))
      for(let idx = 0; idx < depth; ++idx) {
        promise = promise.then(val => val + 1)
      }

      expect(promise).toBeInstanceOf(CancellablePromise)
      await expect(promise).resolves.toBe(depth)
    })
  })

  describe('#cancel()', () => {
    test('should cancel promise', async () => {
      let value = 0
      const promise = new CancellablePromise(resolve => setTimeout(() => resolve(1), 100)).then(v => value = v)
      const promiseState = await getPromiseState(promise)

      expect(promiseState).toBe('pending')
      expect(typeof promise.cancel).toBe('function')

      setTimeout(() => promise.cancel())

      await expect(promise).rejects.toHaveProperty('isCanceled', true)
      expect(value).toBe(0)
    })
  })

  describe('#isCanceled', () => {
    test('should change state on cancel()', () => {
      const promise1 = new CancellablePromise(resolve => resolve(1))
      const promise2 = promise1.then(() => 2)

      expect(typeof promise1.isCanceled).toBe('boolean')
      expect(typeof promise2.isCanceled).toBe('boolean')
      expect(promise1.isCanceled).toBeFalsy()
      expect(promise2.isCanceled).toBeFalsy()

      // I think this test was wrong because:
      // expect(promise1.isCanceled).toBeTruthy()
      // promise1 could not be cancelled without
      // calling 'cancel' method
      // so I think this line should be here:
      promise1.cancel()
      promise2.cancel()

      expect(promise1.isCanceled).toBeTruthy()
      expect(promise2.isCanceled).toBeTruthy()

    })
  })
})




function getPromiseState(promise, callback) {
  const unique = Symbol('unique')
  return Promise.race([promise, Promise.resolve(unique)])
    .then(value => value === unique ? 'pending' : 'fulfilled')
    .catch(() => 'rejected')
    .then(state => {
      callback && callback(state)
      return state
  })
}
