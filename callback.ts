export function weakCallback<T extends object, U extends any[], V extends any>(
  obj: T,
  fn: (this: T, o: T, ...args: U) => V
): (...args: U) => V | undefined {
  const wr = new WeakRef(obj)
  return (...args: U): V | undefined => {
    const obj = wr.deref()
    if (obj !== undefined) {
      return fn.call(obj, obj, ...args)
    }
  }
}
