# weaklings

A library to make your code stronger by making it a little weaker.

## Motivation

We recently discovered a memory leak due to the use of a of short-lived
(per-HTTP request) cache that had periodic item expiry. The item expiry
was controlled by a setTimeout. We forgot to close out the cache, assuming
garbage collection would do all of the work we needed. Of course, it didn't,
and `setTimeout` maintained a reference to the object so it was never GC'd.

This library is a small attempt to create some weak primitives that can be
used to avoid this problem in the future.

Like all libraries around GC, it's probably better if you don't use these
at all, but there could be use-cases where such tooling comes in handy.

## API

Note that you although you can import straight from the `weaklings` package,
the `weaklings/timeout` and `weaklings/interval` have some memory overhead
in bookkeeping. You should import from those directly to only incur the
costs that you need.

### weakCallback

Behavior:

Accepting an object and a function (typically a callback) such that the
function will only be called if the object still exists.

Import:

```javascript
import { weakCallback } from 'weaklings/callback'
```

Declaration:

```typescript
export function weakCallback<T, U, V>(obj: T, fn: (obj: T, ...args: U) => V): (...args: U) => V
```

Example, when run with `node --expose-gc`:

```javascript
let someObj = { val: 0 }

const cb = weakCallback(someObj, (someObj, inc) => {
  someObj.val += inc
  console.log('val incremented', someObj.val)
})

// Note that the first argument to the wrapped function will always be the
// object, and the remaining arguments will be passed afterwards so that you
// don't hold a closure to it in your function.
cb(10)
// val incremented 10
cb(2)
// val incremented 12

someObj = null
gc() // force gc collection

cb(3)
// wrapped callback never called
```

Note: If you're using this from within a class, be sure that you do not
form an arrow-closure over the class instance. For example:

```javascript
class SomeTransientThing {
  doThing() { /* ... */ }

  makeTransientCallback() {
    // First parameter to the wrapped function cannot be called `this` -- it's
    // a syntax error. Thus `self`.
    return weakCallback(this, self => {
      self.doThing()
    })
  }
}
```

If the above used:

```javascript
makeTransientCallback() {
  return weakCallback(this, () => {
    this.doThing()
  })
}
```

Then the lambda function itself would contain a closure over `this`, thus
holding a reference to the object.

### setWeakTimeout, clearWeakTimeout

Behavior:

Creates a timeout that will only trigger if the referenced object hasn't been
GC'd.

Import:

```javascript
import { setWeakTimeout, clearWeakTimeout } from 'weaklings/timeout'
```

Declaration:

```typescript
export function setWeakTimeout<T extends object, U>(obj: T, fn: (obj: T, ...args: U) => unknown, timeout: number, ...args: U): WeakTimeout
export function clearWeakTimeout(timeout: WeakTimeout)
```

Use:

```javascript
class EasilyGarbageCollectedCache {
  constructor(lifetime, fetch) {
    this.lifetime = lifetime
    this.fetch = fetch
    this.cache = new Map()
  }

  get(key) {
    let cached = this.cache.get(key)
    if (cached) {
      clearWeakTimeout(cached.timeout)
    }
    if (!cached) {
      cached = {
        value: this.fetch(key),
        timeout: undefined
      }
    }
    cached.timeout = setWeakTimeout(this, self => {
      self.clear(key)
    }, this.lifetime)
    return cached.value
  }

  clear(key) {
    const cached = this.cache.get(key)
    if (cached) {
      clearWeakTimeout(cached.timeout)
      this.cache.delete(key)
    }
  }
}
```

The above will create a cache that auto-purges entries at a given interval to
reduce memory usage, and itself should be garbage-collectable without needing
to remember to clear all of the associated timeouts.

### setWeakInterval, clearWeakInterval

Behavior:

Similar to setWeakTimeout and clearWeakTimeout, but operates with intervals.

Import:

```javascript
import { setWeakInterval, clearWeakInterval } from 'weaklings/interval'
```

Declaration:

```typescript
export function setWeakInterval<T extends object, U>(obj: T, fn: (obj: T, ...args: U) => unknown, timeout: number, ...args: U): WeakTimeout
export function clearWeakInterval(timeout: WeakTimeout)
```

No example, use the the same as you would with `setInterval`.
