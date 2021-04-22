import { WeakTimeout } from './types'
export { WeakTimeout }

const reg = new FinalizationRegistry(tid => clearInterval(tid))

export function setWeakInterval<T extends object, U extends any[]>(
  obj: T,
  fn: (this: T, obj: T, ...args: U) => unknown,
  timeout: number,
   ...args: U
): Readonly<WeakTimeout> {
  const wr = new WeakRef(obj)
  const handle = {
    tid: setInterval(() => {
      const obj = wr.deref()
      if (obj !== undefined) {
        fn.call(obj, obj, ...args)
      } else {
        clearWeakInterval(handle)
      }
    }, timeout)
  }

  reg.register(obj, handle.tid, handle)
  return handle
}

export function clearWeakInterval(handle: WeakTimeout) {
  clearInterval(handle.tid as any)
  reg.unregister(handle)
}
