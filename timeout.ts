import { WeakTimeout } from './types'
export { WeakTimeout }

const reg = new FinalizationRegistry(tid => clearTimeout(tid))

export function setWeakTimeout<T extends object, U extends any[]>(
  obj: T,
  fn: (this: T, obj: T, ...args: U) => unknown,
  timeout: number,
   ...args: U
): Readonly<WeakTimeout> {
  const wr = new WeakRef(obj)
  const handle = {
    tid: setTimeout(() => {
      reg.unregister(handle)
      const obj = wr.deref()
      if (obj !== undefined) {
        fn.call(obj, obj, ...args)
      }
    }, timeout)
  }

  reg.register(obj, handle.tid, handle)
  return handle
}

export function clearWeakTimeout(handle: WeakTimeout) {
  clearTimeout(handle.tid as any)
  reg.unregister(handle)
}
