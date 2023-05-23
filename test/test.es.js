var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const SYMBOL_OBSERVABLE = Symbol("Observable");
const SYMBOL_OBSERVABLE_FROZEN = Symbol("Frozen");
const SYMBOL_OBSERVABLE_READABLE = Symbol("Readable");
const SYMBOL_OBSERVABLE_WRITABLE = Symbol("Writable");
const SYMBOL_STORE = Symbol("Store");
const SYMBOL_STORE_KEYS = Symbol("Keys");
const SYMBOL_STORE_OBSERVABLE = Symbol("Observable");
const SYMBOL_STORE_TARGET = Symbol("Target");
const SYMBOL_STORE_VALUES = Symbol("Values");
const SYMBOL_STORE_UNTRACKED = Symbol("Untracked");
const SYMBOL_UNCACHED = Symbol("Uncached");
const SYMBOL_UNTRACKED_UNWRAPPED = Symbol("Unwrapped");
const suspended = () => {
  return void 0;
};
const lazyArrayEach = (arr, fn) => {
  if (arr instanceof Array) {
    arr.forEach(fn);
  } else if (arr) {
    fn(arr);
  }
};
const lazyArrayEachRight = (arr, fn) => {
  if (arr instanceof Array) {
    for (let i = arr.length - 1; i >= 0; i--) {
      fn(arr[i]);
    }
  } else if (arr) {
    fn(arr);
  }
};
const lazyArrayPush = (obj, key, value) => {
  const arr = obj[key];
  if (arr instanceof Array) {
    arr.push(value);
  } else if (arr) {
    obj[key] = [arr, value];
  } else {
    obj[key] = value;
  }
};
const lazySetAdd = (obj, key, value) => {
  const set = obj[key];
  if (set instanceof Set) {
    set.add(value);
  } else if (set) {
    if (value !== set) {
      const s = /* @__PURE__ */ new Set();
      s.add(set);
      s.add(value);
      obj[key] = s;
    }
  } else {
    obj[key] = value;
  }
};
const lazySetDelete = (obj, key, value) => {
  const set = obj[key];
  if (set instanceof Set) {
    set.delete(value);
  } else if (set === value) {
    obj[key] = void 0;
  }
};
const lazySetEach = (set, fn) => {
  if (set instanceof Set) {
    for (const value of set) {
      fn(value);
    }
  } else if (set) {
    fn(set);
  }
};
const lazySetHas = (set, value) => {
  if (set instanceof Set) {
    return set.has(value);
  } else {
    return set === value;
  }
};
const castArray$1 = (value) => {
  return isArray$1(value) ? value : [value];
};
const castError$1 = (error2) => {
  if (error2 instanceof Error)
    return error2;
  if (typeof error2 === "string")
    return new Error(error2);
  return new Error("Unknown error");
};
const { is } = Object;
const { isArray: isArray$1 } = Array;
const isFunction$1 = (value) => {
  return typeof value === "function";
};
const isNumber = (value) => {
  return typeof value === "number";
};
const isObject$1 = (value) => {
  return value !== null && typeof value === "object";
};
const max = (a, b) => {
  return a > b ? a : b;
};
const noop = () => {
  return;
};
const nope = () => {
  return false;
};
class Observer {
  constructor() {
    __publicField(this, "parent");
    __publicField(this, "signal");
    __publicField(this, "cleanups");
    __publicField(this, "contexts");
    __publicField(this, "errors");
    __publicField(this, "observables");
    __publicField(this, "observablesLeftover");
    __publicField(this, "observers");
    __publicField(this, "roots");
    __publicField(this, "inactive");
  }
  // Inactive observers should not be re-executed, if they can be
  /* REGISTRATION API */
  registerCleanup(cleanup2) {
    lazyArrayPush(this, "cleanups", cleanup2);
  }
  registerError(error2) {
    lazyArrayPush(this, "errors", error2);
  }
  registerObservable(observable2) {
    lazyArrayPush(this, "observables", observable2);
  }
  registerObserver(observer) {
    lazyArrayPush(this, "observers", observer);
  }
  registerRoot(root2) {
    lazySetAdd(this, "roots", root2);
  }
  unregisterRoot(root2) {
    lazySetDelete(this, "roots", root2);
  }
  /* API */
  catch(error2, silent) {
    const { errors, parent } = this;
    if (errors) {
      try {
        lazyArrayEach(errors, (fn) => fn.call(fn, error2));
      } catch (error22) {
        if (parent) {
          parent.catch(castError$1(error22), false);
        } else {
          throw error22;
        }
      }
      return true;
    } else {
      if (parent == null ? void 0 : parent.catch(error2, true))
        return true;
      if (silent) {
        return false;
      } else {
        throw error2;
      }
    }
  }
  dispose(deep, immediate) {
    const { observers, observables, cleanups, errors, contexts } = this;
    if (observers) {
      this.observers = void 0;
      lazyArrayEachRight(observers, (observer) => {
        observer.dispose(true, true);
      });
    }
    if (observables) {
      this.observables = void 0;
      if (immediate) {
        lazyArrayEach(observables, (observable2) => {
          if (!observable2.signal.disposed) {
            observable2.unregisterObserver(this);
          }
        });
      } else {
        this.observablesLeftover = observables;
      }
    }
    if (cleanups) {
      this.cleanups = void 0;
      this.inactive = true;
      lazyArrayEachRight(cleanups, (cleanup2) => cleanup2.call(cleanup2));
      this.inactive = false;
    }
    if (errors) {
      this.errors = void 0;
    }
    if (contexts) {
      this.contexts = void 0;
    }
  }
  postdispose() {
    const prev = this.observablesLeftover;
    if (!prev)
      return;
    this.observablesLeftover = void 0;
    const next = this.observables;
    if (prev === next)
      return;
    const a = prev instanceof Array ? prev : [prev];
    const b = next instanceof Array ? next : next ? [next] : [];
    let bSet;
    for (let ai = 0, al = a.length; ai < al; ai++) {
      const av = a[ai];
      if (av.signal.disposed)
        continue;
      if (av === b[ai])
        continue;
      bSet || (bSet = new Set(b));
      if (bSet.has(av))
        continue;
      av.unregisterObserver(this);
    }
  }
  read(symbol) {
    const { contexts, parent } = this;
    if (contexts && symbol in contexts)
      return contexts[symbol];
    return parent == null ? void 0 : parent.read(symbol);
  }
  write(symbol, value) {
    this.contexts || (this.contexts = {});
    this.contexts[symbol] = value;
  }
  wrap(fn, tracking = false) {
    const ownerPrev = OWNER;
    const trackingPrev = TRACKING;
    setOwner(this);
    setTracking(tracking);
    let result;
    try {
      result = fn();
    } catch (error2) {
      this.catch(castError$1(error2), false);
    } finally {
      setOwner(ownerPrev);
      setTracking(trackingPrev);
    }
    return result;
  }
}
class Root extends Observer {
  /* CONSTRUCTOR */
  constructor(pausable) {
    super();
    __publicField(this, "parent", OWNER);
    __publicField(this, "disposed");
    __publicField(this, "pausable");
    if (pausable && isNumber(suspended())) {
      this.pausable = true;
      this.parent.registerRoot(this);
    }
  }
  /* API */
  dispose(deep, immediate) {
    this.disposed = true;
    if (this.pausable) {
      this.parent.unregisterRoot(this);
    }
    super.dispose(deep, immediate);
  }
  wrap(fn) {
    const dispose = this.dispose.bind(this, true, true);
    const fnWithDispose = fn.bind(void 0, dispose);
    const rootPrev = ROOT;
    setRoot(this);
    try {
      return super.wrap(fnWithDispose);
    } finally {
      setRoot(rootPrev);
    }
  }
}
class SuperRoot extends Observer {
  constructor() {
    super(...arguments);
    __publicField(this, "disposed", false);
  }
}
let SUPER_OWNER = new SuperRoot();
let BATCH;
let OWNER = SUPER_OWNER;
let ROOT = SUPER_OWNER;
let ROOT_DISPOSED = Object.assign(new Root(), { disposed: true });
let TRACKING = false;
const setBatch = (value) => BATCH = value;
const setOwner = (value) => OWNER = value;
const setRoot = (value) => ROOT = value;
const setTracking = (value) => TRACKING = value;
const start = () => {
  setBatch(/* @__PURE__ */ new Map());
};
const stop = () => {
  const batch2 = BATCH;
  if (!batch2)
    return;
  setBatch();
  if (batch2.size > 1) {
    batch2.forEach(stale);
    batch2.forEach(write);
    batch2.forEach(unstale);
  } else {
    batch2.forEach(write);
  }
};
const wrap = (fn, onBefore, onAfter) => {
  onBefore();
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.finally(onAfter);
    } else {
      onAfter();
    }
    return result;
  } catch (error2) {
    onAfter();
    throw error2;
  }
};
const stale = (value, observable2) => {
  observable2.emit(1, false);
};
const unstale = (value, observable2) => {
  observable2.emit(-1, false);
};
const write = (value, observable2) => {
  observable2.write(value);
};
const batch = (fn) => {
  if (BATCH) {
    return fn();
  } else {
    return wrap(fn, start, stop);
  }
};
function frozenFunction() {
  if (arguments.length)
    throw new Error("A readonly Observable can not be updated");
  return this;
}
function readableFunction(symbol) {
  if (arguments.length) {
    if (symbol === SYMBOL_OBSERVABLE)
      return this;
    throw new Error("A readonly Observable can not be updated");
  }
  return this.read();
}
function writableFunction(fn) {
  if (arguments.length) {
    if (fn === SYMBOL_OBSERVABLE)
      return this;
    if (isFunction$1(fn))
      return this.update(fn);
    return this.write(fn);
  }
  return this.read();
}
const frozen = (value) => {
  const fn = frozenFunction.bind(value);
  fn[SYMBOL_OBSERVABLE] = true;
  fn[SYMBOL_OBSERVABLE_FROZEN] = true;
  return fn;
};
const readable = (value) => {
  if (value.signal === ROOT_DISPOSED)
    return frozen(value.value);
  const fn = readableFunction.bind(value);
  fn[SYMBOL_OBSERVABLE] = true;
  fn[SYMBOL_OBSERVABLE_READABLE] = true;
  return fn;
};
const writable = (value) => {
  const fn = writableFunction.bind(value);
  fn[SYMBOL_OBSERVABLE] = true;
  fn[SYMBOL_OBSERVABLE_WRITABLE] = true;
  return fn;
};
const getExecution = (status) => {
  return status & 3;
};
const setExecution = (status, execution) => {
  return status >>> 2 << 2 | execution;
};
const getFresh = (status) => {
  return !!(status & 4);
};
const setFresh = (status, fresh) => {
  return fresh ? status | 4 : status;
};
const getCount = (status) => {
  return status >>> 3;
};
const changeCount = (status, change) => {
  return status + (change << 3);
};
class Computation extends Observer {
  constructor() {
    super(...arguments);
    __publicField(this, "parent", OWNER);
    __publicField(this, "signal", ROOT);
    __publicField(this, "status", 0);
  }
  /* API */
  emit(change, fresh) {
    if (change < 0 && !getCount(this.status))
      return;
    this.status = changeCount(this.status, change);
    this.status = setFresh(this.status, fresh);
    if (getCount(this.status))
      return;
    fresh = getFresh(this.status);
    this.status = getExecution(this.status);
    if (this.inactive)
      return;
    this.update(fresh);
  }
  update(fresh) {
  }
  wrap(fn, tracking = true) {
    return super.wrap(fn, tracking);
  }
}
class Observable {
  /* CONSTRUCTOR */
  constructor(value, options, parent) {
    __publicField(this, "parent");
    __publicField(this, "signal", ROOT);
    __publicField(this, "value");
    __publicField(this, "equals");
    __publicField(this, "listeners");
    __publicField(this, "observers");
    this.value = value;
    if (parent) {
      this.parent = parent;
    }
    if ((options == null ? void 0 : options.equals) !== void 0) {
      this.equals = options.equals || nope;
    }
  }
  /* REGISTRATION API */
  registerListener(listener) {
    if (lazySetHas(this.listeners, listener))
      return;
    lazySetAdd(this, "listeners", listener);
  }
  registerObserver(observer) {
    lazySetAdd(this, "observers", observer);
  }
  registerSelf() {
    if (this.signal.disposed)
      return;
    if (TRACKING) {
      const owner2 = OWNER;
      if (owner2.observables !== this) {
        this.registerObserver(owner2);
        owner2.registerObservable(this);
      }
    }
    if (this.parent && getCount(this.parent.status)) {
      this.parent.status = getExecution(this.parent.status);
      this.parent.update(true);
    }
  }
  unregisterListener(listener) {
    lazySetDelete(this, "listeners", listener);
  }
  unregisterObserver(observer) {
    lazySetDelete(this, "observers", observer);
  }
  /* API */
  read() {
    this.registerSelf();
    return this.value;
  }
  write(value) {
    if (this.signal === ROOT_DISPOSED)
      throw new Error("A disposed Observable can not be updated");
    if (BATCH) {
      BATCH.set(this, value);
      return value;
    } else {
      const equals = this.equals || is;
      const fresh = !equals(value, this.value);
      if (!this.parent) {
        if (!fresh)
          return value;
        if (!this.signal.disposed) {
          this.emit(1, fresh);
        }
      }
      if (fresh) {
        const valuePrev = this.value;
        this.value = value;
        this.listened(valuePrev);
      }
      if (!this.signal.disposed) {
        this.emit(-1, fresh);
      }
      return value;
    }
  }
  update(fn) {
    const valueNext = fn(this.value);
    return this.write(valueNext);
  }
  emit(change, fresh) {
    if (this.signal.disposed)
      return;
    const computations = this.observers;
    if (computations) {
      if (computations instanceof Set) {
        for (const computation of computations) {
          computation.emit(change, fresh);
        }
      } else {
        computations.emit(change, fresh);
      }
    }
  }
  listened(valuePrev) {
    if (this.signal.disposed)
      return;
    const { listeners } = this;
    if (listeners) {
      if (listeners instanceof Set) {
        for (const listener of listeners) {
          listener.call(listener, this.value, valuePrev);
        }
      } else {
        listeners.call(listeners, this.value, valuePrev);
      }
    }
  }
  dispose() {
    this.signal = ROOT_DISPOSED;
  }
}
const isObservableFrozen = (value) => {
  return isFunction$1(value) && SYMBOL_OBSERVABLE_FROZEN in value;
};
const cleanup = (fn) => {
  OWNER.registerCleanup(fn);
};
function context(symbol, value) {
  if (arguments.length < 2) {
    return OWNER.read(symbol);
  } else {
    return OWNER.write(symbol, value);
  }
}
const disposed = () => {
  const observable2 = new Observable(false);
  cleanup(() => {
    observable2.write(true);
  });
  return readable(observable2);
};
class Reaction extends Computation {
  /* CONSTRUCTOR */
  constructor(fn, pausable) {
    super();
    __publicField(this, "fn");
    this.fn = fn;
    this.parent.registerObserver(this);
    if (pausable && suspended()) {
      this.emit(1, true);
    } else {
      this.update(true);
    }
  }
  /* API */
  update(fresh) {
    if (fresh && !this.signal.disposed) {
      const status = getExecution(this.status);
      if (status) {
        this.status = setExecution(this.status, fresh ? 3 : max(status, 2));
      } else {
        this.status = setExecution(this.status, 1);
        this.dispose();
        try {
          const cleanup2 = this.wrap(this.fn);
          this.postdispose();
          if (isFunction$1(cleanup2)) {
            this.registerCleanup(cleanup2);
          } else {
            if (!this.observers && !this.observables && !this.cleanups) {
              this.dispose(true, true);
            }
          }
        } catch (error2) {
          this.postdispose();
          this.catch(castError$1(error2), false);
        } finally {
          const status2 = getExecution(this.status);
          this.status = setExecution(this.status, 0);
          if (status2 > 1) {
            this.update(status2 === 3);
          } else if (!this.observables) {
            this.fn = noop;
          }
        }
      }
    }
  }
}
const isObservable = (value) => {
  return isFunction$1(value) && (SYMBOL_OBSERVABLE_FROZEN in value || SYMBOL_OBSERVABLE_READABLE in value || SYMBOL_OBSERVABLE_WRITABLE in value);
};
function get(value, getFunction = true) {
  const is2 = getFunction ? isFunction$1 : isObservable;
  if (is2(value)) {
    return value();
  } else {
    return value;
  }
}
const isStore = (value) => {
  return isObject$1(value) && SYMBOL_STORE in value;
};
function untrack(fn) {
  if (isFunction$1(fn)) {
    const trackingPrev = TRACKING;
    try {
      setTracking(false);
      return fn();
    } finally {
      setTracking(trackingPrev);
    }
  } else {
    return fn;
  }
}
frozen(-1);
frozen(-1);
const isBatching = () => {
  return !!BATCH;
};
const target$1 = (observable2) => {
  if (isFunction$1(observable2)) {
    return observable2(SYMBOL_OBSERVABLE);
  } else {
    return observable2;
  }
};
const off = (observable2, listener) => {
  if (!isObservableFrozen(observable2)) {
    target$1(observable2).unregisterListener(listener);
  }
};
const on = (observable2, listener) => {
  if (!isObservableFrozen(observable2)) {
    target$1(observable2).registerListener(listener);
  }
  return () => {
    off(observable2, listener);
  };
};
const reaction = (fn) => {
  const reaction2 = new Reaction(fn);
  const dispose = reaction2.dispose.bind(reaction2, true, true);
  return dispose;
};
frozen(false);
frozen(true);
class StoreMap extends Map {
  insert(key, value) {
    super.set(key, value);
    return value;
  }
}
class StoreCleanable {
  constructor() {
    __publicField(this, "count", 0);
  }
  listen() {
    this.count += 1;
    cleanup(this);
  }
  call() {
    this.count -= 1;
    if (this.count)
      return;
    this.dispose();
  }
  dispose() {
  }
}
class StoreKeys extends StoreCleanable {
  constructor(parent, observable2) {
    super();
    this.parent = parent;
    this.observable = observable2;
  }
  dispose() {
    this.parent.keys = void 0;
  }
}
class StoreValues extends StoreCleanable {
  constructor(parent, observable2) {
    super();
    this.parent = parent;
    this.observable = observable2;
  }
  dispose() {
    this.parent.values = void 0;
  }
}
class StoreHas extends StoreCleanable {
  constructor(parent, key, observable2) {
    super();
    this.parent = parent;
    this.key = key;
    this.observable = observable2;
  }
  dispose() {
    var _a2;
    (_a2 = this.parent.has) == null ? void 0 : _a2.delete(this.key);
  }
}
class StoreProperty extends StoreCleanable {
  constructor(parent, key, observable2, node) {
    super();
    this.parent = parent;
    this.key = key;
    this.observable = observable2;
    this.node = node;
  }
  dispose() {
    var _a2;
    (_a2 = this.parent.properties) == null ? void 0 : _a2.delete(this.key);
  }
}
const StoreListenersRegular = {
  /* VARIABLES */
  active: 0,
  listeners: /* @__PURE__ */ new Set(),
  nodes: /* @__PURE__ */ new Set(),
  /* API */
  prepare: () => {
    const { listeners, nodes } = StoreListenersRegular;
    const traversed = /* @__PURE__ */ new Set();
    const traverse = (node) => {
      if (traversed.has(node))
        return;
      traversed.add(node);
      lazySetEach(node.parents, traverse);
      lazySetEach(node.listenersRegular, (listener) => {
        listeners.add(listener);
      });
    };
    nodes.forEach(traverse);
    return () => {
      listeners.forEach((listener) => {
        listener();
      });
    };
  },
  register: (node) => {
    StoreListenersRegular.nodes.add(node);
    StoreScheduler.schedule();
  },
  reset: () => {
    StoreListenersRegular.listeners = /* @__PURE__ */ new Set();
    StoreListenersRegular.nodes = /* @__PURE__ */ new Set();
  }
};
const StoreListenersRoots = {
  /* VARIABLES */
  active: 0,
  nodes: /* @__PURE__ */ new Map(),
  /* API */
  prepare: () => {
    const { nodes } = StoreListenersRoots;
    return () => {
      nodes.forEach((rootsSet, store2) => {
        const roots = Array.from(rootsSet);
        lazySetEach(store2.listenersRoots, (listener) => {
          listener(roots);
        });
      });
    };
  },
  register: (store2, root2) => {
    const roots = StoreListenersRoots.nodes.get(store2) || /* @__PURE__ */ new Set();
    roots.add(root2);
    StoreListenersRoots.nodes.set(store2, roots);
    StoreScheduler.schedule();
  },
  registerWith: (current, parent, key) => {
    if (!parent.parents) {
      const root2 = (current == null ? void 0 : current.store) || untrack(() => parent.store[key]);
      StoreListenersRoots.register(parent, root2);
    } else {
      const traversed = /* @__PURE__ */ new Set();
      const traverse = (node) => {
        if (traversed.has(node))
          return;
        traversed.add(node);
        lazySetEach(node.parents, (parent2) => {
          if (!parent2.parents) {
            StoreListenersRoots.register(parent2, node.store);
          }
          traverse(parent2);
        });
      };
      traverse(current || parent);
    }
  },
  reset: () => {
    StoreListenersRoots.nodes = /* @__PURE__ */ new Map();
  }
};
const StoreScheduler = {
  /* VARIABLES */
  active: false,
  /* API */
  flush: () => {
    const flushRegular = StoreListenersRegular.prepare();
    const flushRoots = StoreListenersRoots.prepare();
    StoreScheduler.reset();
    flushRegular();
    flushRoots();
  },
  flushIfNotBatching: () => {
    if (isBatching()) {
      setTimeout(StoreScheduler.flushIfNotBatching, 0);
    } else {
      StoreScheduler.flush();
    }
  },
  reset: () => {
    StoreScheduler.active = false;
    StoreListenersRegular.reset();
    StoreListenersRoots.reset();
  },
  schedule: () => {
    if (StoreScheduler.active)
      return;
    StoreScheduler.active = true;
    queueMicrotask(StoreScheduler.flushIfNotBatching);
  }
};
const NODES = /* @__PURE__ */ new WeakMap();
const SPECIAL_SYMBOLS = /* @__PURE__ */ new Set([SYMBOL_STORE, SYMBOL_STORE_KEYS, SYMBOL_STORE_OBSERVABLE, SYMBOL_STORE_TARGET, SYMBOL_STORE_VALUES]);
const UNREACTIVE_KEYS = /* @__PURE__ */ new Set(["__proto__", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "prototype", "constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toSource", "toString", "valueOf"]);
const STORE_TRAPS = {
  /* API */
  get: (target2, key) => {
    var _a2, _b2;
    if (SPECIAL_SYMBOLS.has(key)) {
      if (key === SYMBOL_STORE)
        return true;
      if (key === SYMBOL_STORE_TARGET)
        return target2;
      if (key === SYMBOL_STORE_KEYS) {
        if (isListenable()) {
          const node2 = getNodeExisting(target2);
          node2.keys || (node2.keys = getNodeKeys(node2));
          node2.keys.listen();
          node2.keys.observable.read();
        }
        return;
      }
      if (key === SYMBOL_STORE_VALUES) {
        if (isListenable()) {
          const node2 = getNodeExisting(target2);
          node2.values || (node2.values = getNodeValues(node2));
          node2.values.listen();
          node2.values.observable.read();
        }
        return;
      }
      if (key === SYMBOL_STORE_OBSERVABLE) {
        return (key2) => {
          var _a22;
          key2 = typeof key2 === "number" ? String(key2) : key2;
          const node2 = getNodeExisting(target2);
          const getter2 = (_a22 = node2.getters) == null ? void 0 : _a22.get(key2);
          if (getter2)
            return getter2.bind(node2.store);
          node2.properties || (node2.properties = new StoreMap());
          const value2 = target2[key2];
          const property2 = node2.properties.get(key2) || node2.properties.insert(key2, getNodeProperty(node2, key2, value2));
          const options = node2.equals ? { equals: node2.equals } : void 0;
          property2.observable || (property2.observable = getNodeObservable(node2, value2, options));
          const observable2 = readable(property2.observable);
          return observable2;
        };
      }
    }
    if (UNREACTIVE_KEYS.has(key))
      return target2[key];
    const node = getNodeExisting(target2);
    const getter = (_a2 = node.getters) == null ? void 0 : _a2.get(key);
    const value = getter || target2[key];
    node.properties || (node.properties = new StoreMap());
    const listenable = isListenable();
    const proxiable = isProxiable(value);
    const property = listenable || proxiable ? node.properties.get(key) || node.properties.insert(key, getNodeProperty(node, key, value)) : void 0;
    if (property == null ? void 0 : property.node) {
      lazySetAdd(property.node, "parents", node);
    }
    if (property && listenable) {
      const options = node.equals ? { equals: node.equals } : void 0;
      property.listen();
      property.observable || (property.observable = getNodeObservable(node, value, options));
      property.observable.read();
    }
    if (getter) {
      return getter.call(node.store);
    } else {
      if (typeof value === "function" && value === Array.prototype[key]) {
        return function() {
          return batch(() => value.apply(node.store, arguments));
        };
      }
      return ((_b2 = property == null ? void 0 : property.node) == null ? void 0 : _b2.store) || value;
    }
  },
  set: (target2, key, value) => {
    var _a2;
    value = getTarget(value);
    const node = getNodeExisting(target2);
    const setter = (_a2 = node.setters) == null ? void 0 : _a2.get(key);
    if (setter) {
      batch(() => setter.call(node.store, value));
    } else {
      const valuePrev = target2[key];
      const hadProperty = !!valuePrev || key in target2;
      const equals = node.equals || is;
      if (hadProperty && equals(value, valuePrev) && (key !== "length" || !Array.isArray(target2)))
        return true;
      target2[key] = value;
      batch(() => {
        var _a22, _b2, _c, _d, _e, _f;
        (_a22 = node.values) == null ? void 0 : _a22.observable.write(0);
        if (!hadProperty) {
          (_b2 = node.keys) == null ? void 0 : _b2.observable.write(0);
          (_d = (_c = node.has) == null ? void 0 : _c.get(key)) == null ? void 0 : _d.observable.write(true);
        }
        const property = (_e = node.properties) == null ? void 0 : _e.get(key);
        if (property == null ? void 0 : property.node) {
          lazySetDelete(property.node, "parents", node);
        }
        if (property) {
          (_f = property.observable) == null ? void 0 : _f.write(value);
          property.node = isProxiable(value) ? NODES.get(value) || getNode(value, node) : void 0;
        }
        if (property == null ? void 0 : property.node) {
          lazySetAdd(property.node, "parents", node);
        }
        if (StoreListenersRoots.active) {
          StoreListenersRoots.registerWith(property == null ? void 0 : property.node, node, key);
        }
        if (StoreListenersRegular.active) {
          StoreListenersRegular.register(node);
        }
      });
    }
    return true;
  },
  deleteProperty: (target2, key) => {
    const hasProperty = key in target2;
    if (!hasProperty)
      return true;
    const deleted = Reflect.deleteProperty(target2, key);
    if (!deleted)
      return false;
    const node = getNodeExisting(target2);
    batch(() => {
      var _a2, _b2, _c, _d, _e, _f;
      (_a2 = node.keys) == null ? void 0 : _a2.observable.write(0);
      (_b2 = node.values) == null ? void 0 : _b2.observable.write(0);
      (_d = (_c = node.has) == null ? void 0 : _c.get(key)) == null ? void 0 : _d.observable.write(false);
      const property = (_e = node.properties) == null ? void 0 : _e.get(key);
      if (StoreListenersRoots.active) {
        StoreListenersRoots.registerWith(property == null ? void 0 : property.node, node, key);
      }
      if (property == null ? void 0 : property.node) {
        lazySetDelete(property.node, "parents", node);
      }
      if (property) {
        (_f = property.observable) == null ? void 0 : _f.write(void 0);
        property.node = void 0;
      }
      if (StoreListenersRegular.active) {
        StoreListenersRegular.register(node);
      }
    });
    return true;
  },
  defineProperty: (target2, key, descriptor) => {
    const node = getNodeExisting(target2);
    const equals = node.equals || is;
    const hadProperty = key in target2;
    const descriptorPrev = Reflect.getOwnPropertyDescriptor(target2, key);
    if (descriptorPrev && isEqualDescriptor(descriptorPrev, descriptor, equals))
      return true;
    const defined = Reflect.defineProperty(target2, key, descriptor);
    if (!defined)
      return false;
    batch(() => {
      var _a2, _b2, _c, _d, _e, _f, _g, _h;
      if (!descriptor.get) {
        (_a2 = node.getters) == null ? void 0 : _a2.delete(key);
      } else if (descriptor.get) {
        node.getters || (node.getters = new StoreMap());
        node.getters.set(key, descriptor.get);
      }
      if (!descriptor.set) {
        (_b2 = node.setters) == null ? void 0 : _b2.delete(key);
      } else if (descriptor.set) {
        node.setters || (node.setters = new StoreMap());
        node.setters.set(key, descriptor.set);
      }
      if (hadProperty !== !!descriptor.enumerable) {
        (_c = node.keys) == null ? void 0 : _c.observable.write(0);
        (_e = (_d = node.has) == null ? void 0 : _d.get(key)) == null ? void 0 : _e.observable.write(!!descriptor.enumerable);
      }
      const property = (_f = node.properties) == null ? void 0 : _f.get(key);
      if (StoreListenersRoots.active) {
        StoreListenersRoots.registerWith(property == null ? void 0 : property.node, node, key);
      }
      if (property == null ? void 0 : property.node) {
        lazySetDelete(property.node, "parents", node);
      }
      if (property) {
        if ("get" in descriptor) {
          (_g = property.observable) == null ? void 0 : _g.write(descriptor.get);
          property.node = void 0;
        } else {
          const value = descriptor["value"];
          (_h = property.observable) == null ? void 0 : _h.write(value);
          property.node = isProxiable(value) ? NODES.get(value) || getNode(value, node) : void 0;
        }
      }
      if (property == null ? void 0 : property.node) {
        lazySetAdd(property.node, "parents", node);
      }
      if (StoreListenersRoots.active) {
        StoreListenersRoots.registerWith(property == null ? void 0 : property.node, node, key);
      }
      if (StoreListenersRegular.active) {
        StoreListenersRegular.register(node);
      }
    });
    return true;
  },
  has: (target2, key) => {
    if (key === SYMBOL_STORE)
      return true;
    if (key === SYMBOL_STORE_TARGET)
      return true;
    const value = key in target2;
    if (isListenable()) {
      const node = getNodeExisting(target2);
      node.has || (node.has = new StoreMap());
      const has = node.has.get(key) || node.has.insert(key, getNodeHas(node, key, value));
      has.listen();
      has.observable.read();
    }
    return value;
  },
  ownKeys: (target2) => {
    const keys = Reflect.ownKeys(target2);
    if (isListenable()) {
      const node = getNodeExisting(target2);
      node.keys || (node.keys = getNodeKeys(node));
      node.keys.listen();
      node.keys.observable.read();
    }
    return keys;
  }
};
const STORE_UNTRACK_TRAPS = {
  /* API */
  has: (target2, key) => {
    if (key === SYMBOL_STORE_UNTRACKED)
      return true;
    return key in target2;
  }
};
const getNode = (value, parent, equals) => {
  const store2 = new Proxy(value, STORE_TRAPS);
  const signal = (parent == null ? void 0 : parent.signal) || ROOT;
  const gettersAndSetters = getGettersAndSetters(value);
  const node = { parents: parent, store: store2, signal };
  if (gettersAndSetters) {
    const { getters, setters } = gettersAndSetters;
    if (getters)
      node.getters = getters;
    if (setters)
      node.setters = setters;
  }
  if (equals === false) {
    node.equals = nope;
  } else if (equals) {
    node.equals = equals;
  } else if (parent == null ? void 0 : parent.equals) {
    node.equals = parent.equals;
  }
  NODES.set(value, node);
  return node;
};
const getNodeExisting = (value) => {
  const node = NODES.get(value);
  if (!node)
    throw new Error("Impossible");
  return node;
};
const getNodeFromStore = (store2) => {
  return getNodeExisting(getTarget(store2));
};
const getNodeKeys = (node) => {
  const observable2 = getNodeObservable(node, 0, { equals: false });
  const keys = new StoreKeys(node, observable2);
  return keys;
};
const getNodeValues = (node) => {
  const observable2 = getNodeObservable(node, 0, { equals: false });
  const values = new StoreValues(node, observable2);
  return values;
};
const getNodeHas = (node, key, value) => {
  const observable2 = getNodeObservable(node, value);
  const has = new StoreHas(node, key, observable2);
  return has;
};
const getNodeObservable = (node, value, options) => {
  const observable2 = new Observable(value, options);
  observable2.signal = node.signal;
  return observable2;
};
const getNodeProperty = (node, key, value) => {
  const observable2 = void 0;
  const propertyNode = isProxiable(value) ? NODES.get(value) || getNode(value, node) : void 0;
  const property = new StoreProperty(node, key, observable2, propertyNode);
  node.properties || (node.properties = new StoreMap());
  node.properties.set(key, property);
  return property;
};
const getGettersAndSetters = (value) => {
  if (isArray$1(value))
    return void 0;
  let getters;
  let setters;
  const keys = Object.keys(value);
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i];
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor)
      continue;
    const { get: get2, set } = descriptor;
    if (get2) {
      getters || (getters = new StoreMap());
      getters.set(key, get2);
    }
    if (set) {
      setters || (setters = new StoreMap());
      setters.set(key, set);
    }
  }
  if (!getters && !setters)
    return void 0;
  return { getters, setters };
};
const getStore = (value, options) => {
  if (isStore(value))
    return value;
  const node = NODES.get(value) || getNode(value, void 0, options == null ? void 0 : options.equals);
  return node.store;
};
const getTarget = (value) => {
  if (isStore(value))
    return value[SYMBOL_STORE_TARGET];
  return value;
};
const getUntracked = (value) => {
  if (!isObject$1(value))
    return value;
  if (isUntracked(value))
    return value;
  return new Proxy(value, STORE_UNTRACK_TRAPS);
};
const isEqualDescriptor = (a, b, equals) => {
  return !!a.configurable === !!b.configurable && !!a.enumerable === !!b.enumerable && !!a["writable"] === !!b["writable"] && equals(a["value"], b["value"]) && a.get === b.get && a.set === b.set;
};
const isListenable = () => {
  return TRACKING;
};
const isProxiable = (value) => {
  if (value === null || typeof value !== "object")
    return false;
  if (SYMBOL_STORE in value)
    return true;
  if (SYMBOL_STORE_UNTRACKED in value)
    return false;
  if (isArray$1(value))
    return true;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null)
    return true;
  return Object.getPrototypeOf(prototype) === null;
};
const isUntracked = (value) => {
  if (value === null || typeof value !== "object")
    return false;
  return SYMBOL_STORE_UNTRACKED in value;
};
const store = (value, options) => {
  if (!isObject$1(value))
    return value;
  if (isUntracked(value))
    return value;
  return getStore(value, options);
};
store.on = (target2, listener) => {
  const targets = castArray$1(target2);
  const selectors = targets.filter(isFunction$1);
  const nodes = targets.filter(isStore).map(getNodeFromStore);
  StoreListenersRegular.active += 1;
  const disposers = selectors.map((selector2) => {
    let inited = false;
    return reaction(() => {
      if (inited) {
        StoreListenersRegular.listeners.add(listener);
        StoreScheduler.schedule();
      }
      inited = true;
      selector2();
    });
  });
  nodes.forEach((node) => {
    lazySetAdd(node, "listenersRegular", listener);
  });
  return () => {
    StoreListenersRegular.active -= 1;
    disposers.forEach((disposer) => {
      disposer();
    });
    nodes.forEach((node) => {
      lazySetDelete(node, "listenersRegular", listener);
    });
  };
};
store._onRoots = (target2, listener) => {
  if (!isStore(target2))
    return noop;
  const node = getNodeFromStore(target2);
  if (node.parents)
    throw new Error("Only top-level stores are supported");
  StoreListenersRoots.active += 1;
  lazySetAdd(node, "listenersRoots", listener);
  return () => {
    StoreListenersRoots.active -= 1;
    lazySetDelete(node, "listenersRoots", listener);
  };
};
store.reconcile = (() => {
  const getType = (value) => {
    if (isArray$1(value))
      return 1;
    if (isProxiable(value))
      return 2;
    return 0;
  };
  const reconcileOuter = (prev, next) => {
    const uprev = getTarget(prev);
    const unext = getTarget(next);
    reconcileInner(prev, next);
    const prevType = getType(uprev);
    const nextType = getType(unext);
    if (prevType === 1 || nextType === 1) {
      prev.length = next.length;
    }
    return prev;
  };
  const reconcileInner = (prev, next) => {
    const uprev = getTarget(prev);
    const unext = getTarget(next);
    const prevKeys = Object.keys(uprev);
    const nextKeys = Object.keys(unext);
    for (let i = 0, l = nextKeys.length; i < l; i++) {
      const key = nextKeys[i];
      const prevValue = uprev[key];
      const nextValue = unext[key];
      if (!is(prevValue, nextValue)) {
        const prevType = getType(prevValue);
        const nextType = getType(nextValue);
        if (prevType && prevType === nextType) {
          reconcileInner(prev[key], nextValue);
          if (prevType === 1) {
            prev[key].length = nextValue.length;
          }
        } else {
          prev[key] = nextValue;
        }
      } else if (prevValue === void 0 && !(key in uprev)) {
        prev[key] = void 0;
      }
    }
    for (let i = 0, l = prevKeys.length; i < l; i++) {
      const key = prevKeys[i];
      if (!(key in unext)) {
        delete prev[key];
      }
    }
    return prev;
  };
  const reconcile = (prev, next) => {
    return batch(() => {
      return untrack(() => {
        return reconcileOuter(prev, next);
      });
    });
  };
  return reconcile;
})();
store.untrack = (value) => {
  return getUntracked(value);
};
store.unwrap = (value) => {
  return getTarget(value);
};
function observable(value, options) {
  return writable(new Observable(value, options));
}
const _with = () => {
  const owner2 = OWNER;
  return (fn) => {
    return owner2.wrap(() => fn());
  };
};
const HMR = !!globalThis.VOBY_HMR;
const SYMBOL_TEMPLATE_ACCESSOR = Symbol("Template Accessor");
const SYMBOLS_DIRECTIVES = {};
const { assign } = Object;
const castArray = (value) => {
  return isArray(value) ? value : [value];
};
const flatten = (arr) => {
  for (let i = 0, l = arr.length; i < l; i++) {
    if (!isArray(arr[i]))
      continue;
    return arr.flat(Infinity);
  }
  return arr;
};
const { isArray } = Array;
const isBoolean = (value) => {
  return typeof value === "boolean";
};
const isFunction = (value) => {
  return typeof value === "function";
};
const isNil = (value) => {
  return value === null || value === void 0;
};
const isNode = (value) => {
  return value instanceof Node;
};
const isString = (value) => {
  return typeof value === "string";
};
const isSVG = (value) => {
  return !!value["isSVG"];
};
const isSVGElement = (() => {
  const svgRe = /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/;
  const svgCache = {};
  return (element) => {
    const cached = svgCache[element];
    return cached !== void 0 ? cached : svgCache[element] = !element.includes("-") && svgRe.test(element);
  };
})();
const isTemplateAccessor = (value) => {
  return isFunction(value) && SYMBOL_TEMPLATE_ACCESSOR in value;
};
const isVoidChild = (value) => {
  return value === null || value === void 0 || typeof value === "boolean" || typeof value === "symbol";
};
const useMicrotask = (fn) => {
  const disposed$1 = disposed();
  const runWithOwner = _with();
  queueMicrotask(() => {
    if (disposed$1())
      return;
    runWithOwner(fn);
  });
};
const useMicrotask$1 = useMicrotask;
var n = function(t2, s, r, e) {
  var u;
  s[0] = 0;
  for (var h = 1; h < s.length; h++) {
    var p = s[h++], a = s[h] ? (s[0] |= p ? 1 : 2, r[s[h++]]) : s[++h];
    3 === p ? e[0] = a : 4 === p ? e[1] = Object.assign(e[1] || {}, a) : 5 === p ? (e[1] = e[1] || {})[s[++h]] = a : 6 === p ? e[1][s[++h]] += a + "" : p ? (u = t2.apply(a, n(t2, a, r, ["", null])), e.push(u), a[0] ? s[0] |= 2 : (s[h - 2] = 0, s[h] = u)) : e.push(a);
  }
  return e;
}, t = /* @__PURE__ */ new Map();
function htm(s) {
  var r = t.get(this);
  return r || (r = /* @__PURE__ */ new Map(), t.set(this, r)), (r = n(this, r.get(s) || (r.set(s, r = function(n2) {
    for (var t2, s2, r2 = 1, e = "", u = "", h = [0], p = function(n3) {
      1 === r2 && (n3 || (e = e.replace(/^\s*\n\s*|\s*\n\s*$/g, ""))) ? h.push(0, n3, e) : 3 === r2 && (n3 || e) ? (h.push(3, n3, e), r2 = 2) : 2 === r2 && "..." === e && n3 ? h.push(4, n3, 0) : 2 === r2 && e && !n3 ? h.push(5, 0, true, e) : r2 >= 5 && ((e || !n3 && 5 === r2) && (h.push(r2, 0, e, s2), r2 = 6), n3 && (h.push(r2, n3, 0, s2), r2 = 6)), e = "";
    }, a = 0; a < n2.length; a++) {
      a && (1 === r2 && p(), p(a));
      for (var l = 0; l < n2[a].length; l++)
        t2 = n2[a][l], 1 === r2 ? "<" === t2 ? (p(), h = [h], r2 = 3) : e += t2 : 4 === r2 ? "--" === e && ">" === t2 ? (r2 = 1, e = "") : e = t2 + e[0] : u ? t2 === u ? u = "" : e += t2 : '"' === t2 || "'" === t2 ? u = t2 : ">" === t2 ? (p(), r2 = 1) : r2 && ("=" === t2 ? (r2 = 5, s2 = e, e = "") : "/" === t2 && (r2 < 5 || ">" === n2[a][l + 1]) ? (p(), 3 === r2 && (h = h[0]), r2 = h, (h = h[0]).push(2, 0, r2), r2 = 0) : " " === t2 || "	" === t2 || "\n" === t2 || "\r" === t2 ? (p(), r2 = 2) : e += t2), 3 === r2 && "!--" === e && (r2 = 4, h = h[0]);
    }
    return p(), h;
  }(s)), r), arguments, [])).length > 1 ? r : r[0];
}
const wrapElement = (element) => {
  element[SYMBOL_UNTRACKED_UNWRAPPED] = true;
  return element;
};
const wrapElement$1 = wrapElement;
const { createComment, createHTMLNode, createSVGNode, createText, createDocumentFragment } = (() => {
  if (typeof via !== "undefined") {
    const document2 = via.document;
    const createComment2 = document2.createComment;
    const createHTMLNode2 = document2.createElement;
    const createSVGNode2 = (name) => document2.createElementNS("http://www.w3.org/2000/svg", name);
    const createText2 = document2.createTextNode;
    const createDocumentFragment2 = document2.createDocumentFragment;
    return { createComment: createComment2, createHTMLNode: createHTMLNode2, createSVGNode: createSVGNode2, createText: createText2, createDocumentFragment: createDocumentFragment2 };
  } else {
    const createComment2 = document.createComment.bind(document, "");
    const createHTMLNode2 = document.createElement.bind(document);
    const createSVGNode2 = document.createElementNS.bind(document, "http://www.w3.org/2000/svg");
    const createText2 = document.createTextNode.bind(document);
    const createDocumentFragment2 = document.createDocumentFragment.bind(document);
    return { createComment: createComment2, createHTMLNode: createHTMLNode2, createSVGNode: createSVGNode2, createText: createText2, createDocumentFragment: createDocumentFragment2 };
  }
})();
const target = (observable2) => SYMBOL_OBSERVABLE_FROZEN in observable2 ? observable2 : observable2(SYMBOL_OBSERVABLE);
class Callable {
  /* CONSTRUCTOR */
  constructor(observable2) {
    this.observable = target(observable2);
  }
  /* API */
  init(observable2) {
    on(this.observable, this);
    this.call(observable2, untrack(observable2));
    cleanup(this);
  }
  call() {
    if (arguments.length === 1) {
      this.cleanup();
    } else {
      this.update(arguments[1], arguments[2]);
    }
  }
  cleanup() {
    off(this.observable, this);
  }
}
class CallableAttributeStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, key) {
    super(observable2);
    this.element = element;
    this.key = key;
    this.init(observable2);
  }
  /* API */
  update(value) {
    setAttributeStatic(this.element, this.key, value);
  }
}
class CallableClassStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, key) {
    super(observable2);
    this.element = element;
    this.key = key;
    this.init(observable2);
  }
  /* API */
  update(value) {
    setClassStatic(this.element, this.key, value);
  }
}
class CallableClassBooleanStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, value) {
    super(observable2);
    this.element = element;
    this.value = value;
    this.init(observable2);
  }
  /* API */
  update(key, keyPrev) {
    setClassBooleanStatic(this.element, this.value, key, keyPrev);
  }
}
class CallableEventStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, event) {
    super(observable2);
    this.element = element;
    this.event = event;
    this.init(observable2);
  }
  /* API */
  update(value) {
    setEventStatic(this.element, this.event, value);
  }
}
class CallablePropertyStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, key) {
    super(observable2);
    this.element = element;
    this.key = key;
    this.init(observable2);
  }
  /* API */
  update(value) {
    setPropertyStatic(this.element, this.key, value);
  }
}
class CallableStyleStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element, key) {
    super(observable2);
    this.element = element;
    this.key = key;
    this.init(observable2);
  }
  /* API */
  update(value) {
    setStyleStatic(this.element, this.key, value);
  }
}
class CallableStylesStatic extends Callable {
  /* CONSTRUCTOR */
  constructor(observable2, element) {
    super(observable2);
    this.element = element;
    this.init(observable2);
  }
  /* API */
  update(object, objectPrev) {
    setStylesStatic(this.element, object, objectPrev);
  }
}
const classesToggle = (element, classes, force) => {
  const { className } = element;
  if (isString(className)) {
    if (!className) {
      if (force) {
        element.className = classes;
        return;
      } else {
        return;
      }
    } else if (!force && className === classes) {
      element.className = "";
      return;
    }
  }
  if (classes.includes(" ")) {
    classes.split(" ").forEach((cls) => {
      if (!cls.length)
        return;
      element.classList.toggle(cls, !!force);
    });
  } else {
    element.classList.toggle(classes, !!force);
  }
};
const dummyNode = createComment("");
const beforeDummyWrapper = [dummyNode];
const afterDummyWrapper = [dummyNode];
const diff = (parent, before, after, nextSibling) => {
  if (before === after)
    return;
  if (before instanceof Node) {
    beforeDummyWrapper[0] = before;
    before = beforeDummyWrapper;
  }
  if (after instanceof Node) {
    afterDummyWrapper[0] = after;
    after = afterDummyWrapper;
  }
  const bLength = after.length;
  let aEnd = before.length;
  let bEnd = bLength;
  let aStart = 0;
  let bStart = 0;
  let map = null;
  let removable;
  while (aStart < aEnd || bStart < bEnd) {
    if (aEnd === aStart) {
      const node = bEnd < bLength ? bStart ? after[bStart - 1].nextSibling : after[bEnd - bStart] : nextSibling;
      if (bStart < bEnd) {
        if (node) {
          node.before.apply(node, after.slice(bStart, bEnd));
        } else {
          parent.append.apply(parent, after.slice(bStart, bEnd));
        }
        bStart = bEnd;
      }
    } else if (bEnd === bStart) {
      while (aStart < aEnd) {
        if (!map || !map.has(before[aStart])) {
          removable = before[aStart];
          parent.removeChild(removable);
        }
        aStart++;
      }
    } else if (before[aStart] === after[bStart]) {
      aStart++;
      bStart++;
    } else if (before[aEnd - 1] === after[bEnd - 1]) {
      aEnd--;
      bEnd--;
    } else if (before[aStart] === after[bEnd - 1] && after[bStart] === before[aEnd - 1]) {
      const node = before[--aEnd].nextSibling;
      parent.insertBefore(
        after[bStart++],
        before[aStart++].nextSibling
      );
      parent.insertBefore(after[--bEnd], node);
      before[aEnd] = after[bEnd];
    } else {
      if (!map) {
        map = /* @__PURE__ */ new Map();
        let i = bStart;
        while (i < bEnd)
          map.set(after[i], i++);
      }
      if (map.has(before[aStart])) {
        const index = map.get(before[aStart]);
        if (bStart < index && index < bEnd) {
          let i = aStart;
          let sequence = 1;
          while (++i < aEnd && i < bEnd && map.get(before[i]) === index + sequence)
            sequence++;
          if (sequence > index - bStart) {
            const node = before[aStart];
            if (bStart < index) {
              if (node) {
                node.before.apply(node, after.slice(bStart, index));
              } else {
                parent.append.apply(parent, after.slice(bStart, index));
              }
              bStart = index;
            }
          } else {
            parent.replaceChild(
              after[bStart++],
              before[aStart++]
            );
          }
        } else
          aStart++;
      } else {
        removable = before[aStart++];
        parent.removeChild(removable);
      }
    }
  }
  beforeDummyWrapper[0] = dummyNode;
  afterDummyWrapper[0] = dummyNode;
};
const diff$1 = diff;
const NOOP_CHILDREN = [];
const FragmentUtils = {
  make: () => {
    return {
      values: void 0,
      length: 0
    };
  },
  makeWithNode: (node) => {
    return {
      values: node,
      length: 1
    };
  },
  makeWithFragment: (fragment) => {
    return {
      values: fragment,
      fragmented: true,
      length: 1
    };
  },
  getChildrenFragmented: (thiz, children = []) => {
    const { values, length } = thiz;
    if (!length)
      return children;
    if (values instanceof Array) {
      for (let i = 0, l = values.length; i < l; i++) {
        const value = values[i];
        if (value instanceof Node) {
          children.push(value);
        } else {
          FragmentUtils.getChildrenFragmented(value, children);
        }
      }
    } else {
      if (values instanceof Node) {
        children.push(values);
      } else {
        FragmentUtils.getChildrenFragmented(values, children);
      }
    }
    return children;
  },
  getChildren: (thiz) => {
    if (!thiz.length)
      return NOOP_CHILDREN;
    if (!thiz.fragmented)
      return thiz.values;
    if (thiz.length === 1)
      return FragmentUtils.getChildren(thiz.values);
    return FragmentUtils.getChildrenFragmented(thiz);
  },
  pushFragment: (thiz, fragment) => {
    FragmentUtils.pushValue(thiz, fragment);
    thiz.fragmented = true;
  },
  pushNode: (thiz, node) => {
    FragmentUtils.pushValue(thiz, node);
  },
  pushValue: (thiz, value) => {
    const { values, length } = thiz;
    if (length === 0) {
      thiz.values = value;
    } else if (length === 1) {
      thiz.values = [values, value];
    } else {
      values.push(value);
    }
    thiz.length += 1;
  },
  replaceWithNode: (thiz, node) => {
    thiz.values = node;
    delete thiz.fragmented;
    thiz.length = 1;
  },
  replaceWithFragment: (thiz, fragment) => {
    thiz.values = fragment.values;
    thiz.fragmented = fragment.fragmented;
    thiz.length = fragment.length;
  }
};
const FragmentUtils$1 = FragmentUtils;
const resolveChild = (value, setter, _dynamic = false) => {
  if (isFunction(value)) {
    if (SYMBOL_UNTRACKED_UNWRAPPED in value || SYMBOL_OBSERVABLE_FROZEN in value)
      resolveChild(value(), setter, _dynamic);
    else
      reaction(() => {
        resolveChild(value(), setter, true);
      });
  } else if (isArray(value)) {
    const [values, hasObservables] = resolveArraysAndStatics(value);
    values[SYMBOL_UNCACHED] = value[SYMBOL_UNCACHED];
    setter(values, hasObservables || _dynamic);
  } else {
    setter(value, _dynamic);
  }
};
const resolveClass = (classes, resolved = {}) => {
  if (isString(classes)) {
    classes.split(/\s+/g).filter(Boolean).filter((cls) => {
      resolved[cls] = true;
    });
  } else if (isFunction(classes)) {
    resolveClass(classes(), resolved);
  } else if (isArray(classes)) {
    classes.forEach((cls) => {
      resolveClass(cls, resolved);
    });
  } else if (classes) {
    for (const key in classes) {
      const value = classes[key];
      const isActive = !!get(value);
      if (!isActive)
        continue;
      resolved[key] = true;
    }
  }
  return resolved;
};
const resolveArraysAndStatics = (() => {
  const DUMMY_RESOLVED = [];
  const resolveArraysAndStaticsInner = (values, resolved, hasObservables) => {
    for (let i = 0, l = values.length; i < l; i++) {
      const value = values[i];
      const type = typeof value;
      if (type === "string" || type === "number" || type === "bigint") {
        if (resolved === DUMMY_RESOLVED)
          resolved = values.slice(0, i);
        resolved.push(createText(value));
      } else if (type === "object" && isArray(value)) {
        if (resolved === DUMMY_RESOLVED)
          resolved = values.slice(0, i);
        hasObservables = resolveArraysAndStaticsInner(value, resolved, hasObservables)[1];
      } else if (type === "function" && isObservable(value)) {
        if (resolved !== DUMMY_RESOLVED)
          resolved.push(value);
        hasObservables = true;
      } else {
        if (resolved !== DUMMY_RESOLVED)
          resolved.push(value);
      }
    }
    if (resolved === DUMMY_RESOLVED)
      resolved = values;
    return [resolved, hasObservables];
  };
  return (values) => {
    return resolveArraysAndStaticsInner(values, DUMMY_RESOLVED, false);
  };
})();
const setAttributeStatic = (() => {
  const attributesBoolean = /* @__PURE__ */ new Set(["allowfullscreen", "async", "autofocus", "autoplay", "checked", "controls", "default", "disabled", "formnovalidate", "hidden", "indeterminate", "ismap", "loop", "multiple", "muted", "nomodule", "novalidate", "open", "playsinline", "readonly", "required", "reversed", "seamless", "selected"]);
  const attributeCamelCasedRe = /e(r[HRWrv]|[Vawy])|Con|l(e[Tcs]|c)|s(eP|y)|a(t[rt]|u|v)|Of|Ex|f[XYa]|gt|hR|d[Pg]|t[TXYd]|[UZq]/;
  const attributesCache = {};
  const uppercaseRe = /[A-Z]/g;
  const normalizeKeySvg = (key) => {
    return attributesCache[key] || (attributesCache[key] = attributeCamelCasedRe.test(key) ? key : key.replace(uppercaseRe, (char) => `-${char.toLowerCase()}`));
  };
  return (element, key, value) => {
    if (isSVG(element)) {
      key = key === "xlinkHref" || key === "xlink:href" ? "href" : normalizeKeySvg(key);
      if (isNil(value) || value === false && attributesBoolean.has(key)) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, String(value));
      }
    } else {
      if (isNil(value) || value === false && attributesBoolean.has(key)) {
        element.removeAttribute(key);
      } else {
        value = value === true ? "" : String(value);
        element.setAttribute(key, value);
      }
    }
  };
})();
const setAttribute = (element, key, value) => {
  if (isFunction(value)) {
    if (isObservable(value)) {
      new CallableAttributeStatic(value, element, key);
    } else {
      reaction(() => {
        setAttributeStatic(element, key, value());
      });
    }
  } else {
    setAttributeStatic(element, key, value);
  }
};
const setChildReplacementText = (child, childPrev) => {
  if (childPrev.nodeType === 3) {
    childPrev.nodeValue = child;
    return childPrev;
  } else {
    const parent = childPrev.parentElement;
    if (!parent)
      throw new Error("Invalid child replacement");
    const textNode = createText(child);
    parent.replaceChild(textNode, childPrev);
    return textNode;
  }
};
const setChildStatic = (parent, fragment, child, dynamic) => {
  if (!dynamic && child === void 0)
    return;
  const prev = FragmentUtils$1.getChildren(fragment);
  const prevIsArray = prev instanceof Array;
  const prevLength = prevIsArray ? prev.length : 1;
  const prevFirst = prevIsArray ? prev[0] : prev;
  const prevLast = prevIsArray ? prev[prevLength - 1] : prev;
  const prevSibling = (prevLast == null ? void 0 : prevLast.nextSibling) || null;
  if (prevLength === 0) {
    const type = typeof child;
    if (type === "string" || type === "number" || type === "bigint") {
      const textNode = createText(child);
      parent.appendChild(textNode);
      FragmentUtils$1.replaceWithNode(fragment, textNode);
      return;
    } else if (type === "object" && child !== null && typeof child.nodeType === "number") {
      const node = child;
      parent.insertBefore(node, null);
      FragmentUtils$1.replaceWithNode(fragment, node);
      return;
    }
  }
  if (prevLength === 1) {
    const type = typeof child;
    if (type === "string" || type === "number" || type === "bigint") {
      const node = setChildReplacementText(String(child), prevFirst);
      FragmentUtils$1.replaceWithNode(fragment, node);
      return;
    }
  }
  const fragmentNext = FragmentUtils$1.make();
  const children = Array.isArray(child) ? child : [child];
  let nextHasStaticChildren = false;
  for (let i = 0, l = children.length; i < l; i++) {
    const child2 = children[i];
    const type = typeof child2;
    if (type === "string" || type === "number" || type === "bigint") {
      nextHasStaticChildren = true;
      FragmentUtils$1.pushNode(fragmentNext, createText(child2));
    } else if (type === "object" && child2 !== null && typeof child2.nodeType === "number") {
      nextHasStaticChildren = true;
      FragmentUtils$1.pushNode(fragmentNext, child2);
    } else if (type === "function") {
      const fragment2 = FragmentUtils$1.make();
      FragmentUtils$1.pushFragment(fragmentNext, fragment2);
      resolveChild(child2, setChildStatic.bind(void 0, parent, fragment2));
    }
  }
  let next = FragmentUtils$1.getChildren(fragmentNext);
  let nextLength = fragmentNext.length;
  let nextHasDynamicChildren = !nextHasStaticChildren && nextLength > 0;
  if (nextLength === 0 && prevLength === 1 && prevFirst.nodeType === 8) {
    return;
  }
  if (nextLength === 0 || prevLength === 1 && prevFirst.nodeType === 8 || children[SYMBOL_UNCACHED]) {
    const { childNodes } = parent;
    if (childNodes.length === prevLength) {
      parent.textContent = "";
      if (nextLength === 0) {
        const placeholder = createComment("");
        FragmentUtils$1.pushNode(fragmentNext, placeholder);
        if (next !== fragmentNext.values) {
          next = placeholder;
          nextLength += 1;
        }
      }
      if (prevSibling) {
        if (next instanceof Array) {
          prevSibling.before.apply(prevSibling, next);
        } else {
          parent.insertBefore(next, prevSibling);
        }
      } else {
        if (next instanceof Array) {
          parent.append.apply(parent, next);
        } else {
          parent.append(next);
        }
      }
      FragmentUtils$1.replaceWithFragment(fragment, fragmentNext);
      return;
    }
  }
  if (nextLength === 0) {
    const placeholder = createComment("");
    FragmentUtils$1.pushNode(fragmentNext, placeholder);
    if (next !== fragmentNext.values) {
      next = placeholder;
      nextLength += 1;
    }
  }
  if (prevLength > 0 || nextHasStaticChildren || !nextHasDynamicChildren) {
    try {
      diff$1(parent, prev, next, prevSibling);
    } catch (error) {
      if (HMR) {
        console.error(error);
      } else {
        throw error;
      }
    }
  }
  FragmentUtils$1.replaceWithFragment(fragment, fragmentNext);
};
const setChild = (parent, child, fragment = FragmentUtils$1.make()) => {
  resolveChild(child, setChildStatic.bind(void 0, parent, fragment));
};
const setClassStatic = classesToggle;
const setClass = (element, key, value) => {
  if (isFunction(value)) {
    if (isObservable(value)) {
      new CallableClassStatic(value, element, key);
    } else {
      reaction(() => {
        setClassStatic(element, key, value());
      });
    }
  } else {
    setClassStatic(element, key, value);
  }
};
const setClassBooleanStatic = (element, value, key, keyPrev) => {
  if (keyPrev && keyPrev !== true) {
    setClassStatic(element, keyPrev, false);
  }
  if (key && key !== true) {
    setClassStatic(element, key, value);
  }
};
const setClassBoolean = (element, value, key) => {
  if (isFunction(key)) {
    if (isObservable(key)) {
      new CallableClassBooleanStatic(key, element, value);
    } else {
      let keyPrev;
      reaction(() => {
        const keyNext = key();
        setClassBooleanStatic(element, value, keyNext, keyPrev);
        keyPrev = keyNext;
      });
    }
  } else {
    setClassBooleanStatic(element, value, key);
  }
};
const setClassesStatic = (element, object, objectPrev) => {
  if (isString(object)) {
    if (isSVG(element)) {
      element.setAttribute("class", object);
    } else {
      element.className = object;
    }
  } else {
    if (objectPrev) {
      if (isString(objectPrev)) {
        if (objectPrev) {
          if (isSVG(element)) {
            element.setAttribute("class", "");
          } else {
            element.className = "";
          }
        }
      } else if (isArray(objectPrev)) {
        objectPrev = store.unwrap(objectPrev);
        for (let i = 0, l = objectPrev.length; i < l; i++) {
          if (!objectPrev[i])
            continue;
          setClassBoolean(element, false, objectPrev[i]);
        }
      } else {
        objectPrev = store.unwrap(objectPrev);
        for (const key in objectPrev) {
          if (object && key in object)
            continue;
          setClass(element, key, false);
        }
      }
    }
    if (isArray(object)) {
      if (isStore(object)) {
        for (let i = 0, l = object.length; i < l; i++) {
          const fn = untrack(() => isFunction(object[i]) ? object[i] : object[SYMBOL_STORE_OBSERVABLE](String(i)));
          setClassBoolean(element, true, fn);
        }
      } else {
        for (let i = 0, l = object.length; i < l; i++) {
          if (!object[i])
            continue;
          setClassBoolean(element, true, object[i]);
        }
      }
    } else {
      if (isStore(object)) {
        for (const key in object) {
          const fn = untrack(() => isFunction(object[key]) ? object[key] : object[SYMBOL_STORE_OBSERVABLE](key));
          setClass(element, key, fn);
        }
      } else {
        for (const key in object) {
          setClass(element, key, object[key]);
        }
      }
    }
  }
};
const setClasses = (element, object) => {
  if (isFunction(object) || isArray(object)) {
    let objectPrev;
    reaction(() => {
      const objectNext = resolveClass(object);
      setClassesStatic(element, objectNext, objectPrev);
      objectPrev = objectNext;
    });
  } else {
    setClassesStatic(element, object);
  }
};
const setDirective = (() => {
  const runWithSuperRoot = _with();
  return (element, directive, args) => {
    const symbol = SYMBOLS_DIRECTIVES[directive] || Symbol();
    const data = runWithSuperRoot(() => context(symbol));
    if (!data)
      throw new Error(`Directive "${directive}" not found`);
    const call = () => data.fn(element, ...castArray(args));
    if (data.immediate) {
      call();
    } else {
      useMicrotask$1(call);
    }
  };
})();
const setEventStatic = (() => {
  const delegatedEvents = {
    onauxclick: ["_onauxclick", false],
    onbeforeinput: ["_onbeforeinput", false],
    onclick: ["_onclick", false],
    ondblclick: ["_ondblclick", false],
    onfocusin: ["_onfocusin", false],
    onfocusout: ["_onfocusout", false],
    oninput: ["_oninput", false],
    onkeydown: ["_onkeydown", false],
    onkeyup: ["_onkeyup", false],
    onmousedown: ["_onmousedown", false],
    onmouseup: ["_onmouseup", false]
  };
  const delegate = (event) => {
    const key = `_${event}`;
    document.addEventListener(event.slice(2), (event2) => {
      const targets = event2.composedPath();
      let target2 = null;
      Object.defineProperty(event2, "currentTarget", {
        configurable: true,
        get() {
          return target2;
        }
      });
      for (let i = 0, l = targets.length; i < l; i++) {
        target2 = targets[i];
        const handler = target2[key];
        if (!handler)
          continue;
        handler(event2);
        if (event2.cancelBubble)
          break;
      }
      target2 = null;
    });
  };
  return (element, event, value) => {
    const delegated = delegatedEvents[event];
    if (delegated) {
      if (!delegated[1]) {
        delegated[1] = true;
        delegate(event);
      }
      element[delegated[0]] = value;
    } else if (event.endsWith("passive")) {
      const isCapture = event.endsWith("capturepassive");
      const type = event.slice(2, -7 - (isCapture ? 7 : 0));
      const key = `_${event}`;
      const valuePrev = element[key];
      if (valuePrev)
        element.removeEventListener(type, valuePrev, { capture: isCapture });
      if (value)
        element.addEventListener(type, value, { passive: true, capture: isCapture });
      element[key] = value;
    } else if (event.endsWith("capture")) {
      const type = event.slice(2, -7);
      const key = `_${event}`;
      const valuePrev = element[key];
      if (valuePrev)
        element.removeEventListener(type, valuePrev, { capture: true });
      if (value)
        element.addEventListener(type, value, { capture: true });
      element[key] = value;
    } else {
      element[event] = value;
    }
  };
})();
const setEvent = (element, event, value) => {
  if (isObservable(value)) {
    new CallableEventStatic(value, element, event);
  } else {
    setEventStatic(element, event, value);
  }
};
const setHTMLStatic = (element, value) => {
  element.innerHTML = String(isNil(value) ? "" : value);
};
const setHTML = (element, value) => {
  reaction(() => {
    setHTMLStatic(element, get(get(value).__html));
  });
};
const setPropertyStatic = (element, key, value) => {
  if (key === "tabIndex" && isBoolean(value)) {
    value = value ? 0 : void 0;
  }
  if (key === "value" && element.tagName === "SELECT" && !element["_$inited"]) {
    element["_$inited"] = true;
    queueMicrotask(() => element[key] = value);
  }
  element[key] = value;
  if (isNil(value)) {
    setAttributeStatic(element, key, null);
  }
};
const setProperty = (element, key, value) => {
  if (isFunction(value)) {
    if (isObservable(value)) {
      new CallablePropertyStatic(value, element, key);
    } else {
      reaction(() => {
        setPropertyStatic(element, key, value());
      });
    }
  } else {
    setPropertyStatic(element, key, value);
  }
};
const setRef = (element, value) => {
  if (isNil(value))
    return;
  const values = flatten(castArray(value));
  useMicrotask$1(() => values.forEach((value2) => value2 == null ? void 0 : value2(element)));
};
const setStyleStatic = (() => {
  const propertyNonDimensionalRe = /^(-|f[lo].*[^se]$|g.{5,}[^ps]$|z|o[pr]|(W.{5})?[lL]i.*(t|mp)$|an|(bo|s).{4}Im|sca|m.{6}[ds]|ta|c.*[st]$|wido|ini)/i;
  const propertyNonDimensionalCache = {};
  return (element, key, value) => {
    if (key.charCodeAt(0) === 45) {
      if (isNil(value)) {
        element.style.removeProperty(key);
      } else {
        element.style.setProperty(key, String(value));
      }
    } else if (isNil(value)) {
      element.style[key] = null;
    } else {
      element.style[key] = isString(value) || (propertyNonDimensionalCache[key] || (propertyNonDimensionalCache[key] = propertyNonDimensionalRe.test(key))) ? value : `${value}px`;
    }
  };
})();
const setStyle = (element, key, value) => {
  if (isFunction(value)) {
    if (isObservable(value)) {
      new CallableStyleStatic(value, element, key);
    } else {
      reaction(() => {
        setStyleStatic(element, key, value());
      });
    }
  } else {
    setStyleStatic(element, key, value);
  }
};
const setStylesStatic = (element, object, objectPrev) => {
  if (isString(object)) {
    element.setAttribute("style", object);
  } else {
    if (objectPrev) {
      if (isString(objectPrev)) {
        if (objectPrev) {
          element.style.cssText = "";
        }
      } else {
        objectPrev = store.unwrap(objectPrev);
        for (const key in objectPrev) {
          if (object && key in object)
            continue;
          setStyleStatic(element, key, null);
        }
      }
    }
    if (isStore(object)) {
      for (const key in object) {
        const fn = untrack(() => isFunction(object[key]) ? object[key] : object[SYMBOL_STORE_OBSERVABLE](key));
        setStyle(element, key, fn);
      }
    } else {
      for (const key in object) {
        setStyle(element, key, object[key]);
      }
    }
  }
};
const setStyles = (element, object) => {
  if (isFunction(object)) {
    if (isObservable(object)) {
      new CallableStylesStatic(object, element);
    } else {
      let objectPrev;
      reaction(() => {
        const objectNext = object();
        setStylesStatic(element, objectNext, objectPrev);
        objectPrev = objectNext;
      });
    }
  } else {
    setStylesStatic(element, object);
  }
};
const setTemplateAccessor = (element, key, value) => {
  if (key === "children") {
    const placeholder = createText("");
    element.insertBefore(placeholder, null);
    value(element, "setChildReplacement", void 0, placeholder);
  } else if (key === "ref") {
    value(element, "setRef");
  } else if (key === "style") {
    value(element, "setStyles");
  } else if (key === "class" || key === "className") {
    if (!isSVG(element)) {
      element.className = "";
    }
    value(element, "setClasses");
  } else if (key === "dangerouslySetInnerHTML") {
    value(element, "setHTML");
  } else if (key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110) {
    value(element, "setEvent", key.toLowerCase());
  } else if (key.charCodeAt(0) === 117 && key.charCodeAt(3) === 58) {
    value(element, "setDirective", key.slice(4));
  } else if (key === "innerHTML" || key === "outerHTML" || key === "textContent")
    ;
  else if (key in element && !isSVG(element)) {
    value(element, "setProperty", key);
  } else {
    element.setAttribute(key, "");
    value(element, "setAttribute", key);
  }
};
const setProp = (element, key, value) => {
  if (isTemplateAccessor(value)) {
    setTemplateAccessor(element, key, value);
  } else if (key === "children") {
    setChild(element, value);
  } else if (key === "ref") {
    setRef(element, value);
  } else if (key === "style") {
    setStyles(element, value);
  } else if (key === "class" || key === "className") {
    setClasses(element, value);
  } else if (key === "dangerouslySetInnerHTML") {
    setHTML(element, value);
  } else if (key.charCodeAt(0) === 111 && key.charCodeAt(1) === 110) {
    setEvent(element, key.toLowerCase(), value);
  } else if (key.charCodeAt(0) === 117 && key.charCodeAt(3) === 58) {
    setDirective(element, key.slice(4), value);
  } else if (key === "innerHTML" || key === "outerHTML" || key === "textContent")
    ;
  else if (key in element && !isSVG(element)) {
    setProperty(element, key, value);
  } else {
    setAttribute(element, key, value);
  }
};
const setProps = (element, object) => {
  for (const key in object) {
    setProp(element, key, object[key]);
  }
};
const createElement = (component, props, ..._children) => {
  const { children: __children, key, ref, ...rest } = props || {};
  const children = _children.length === 1 ? _children[0] : _children.length === 0 ? __children : _children;
  if (isFunction(component)) {
    const props2 = rest;
    if (!isNil(children))
      props2.children = children;
    if (!isNil(ref))
      props2.ref = ref;
    return wrapElement$1(() => {
      return untrack(() => component.call(component, props2));
    });
  } else if (isString(component)) {
    const props2 = rest;
    const isSVG2 = isSVGElement(component);
    const createNode = isSVG2 ? createSVGNode : createHTMLNode;
    if (!isVoidChild(children))
      props2.children = children;
    if (!isNil(ref))
      props2.ref = ref;
    return wrapElement$1(() => {
      const child = createNode(component);
      if (isSVG2)
        child["isSVG"] = true;
      untrack(() => setProps(child, props2));
      return child;
    });
  } else if (isNode(component)) {
    return wrapElement$1(() => component);
  } else {
    throw new Error("Invalid component");
  }
};
const creatElement = createElement;
var _a, _b;
!!((_b = (_a = globalThis.CDATASection) == null ? void 0 : _a.toString) == null ? void 0 : _b.call(_a).match(/^\s*function\s+CDATASection\s*\(\s*\)\s*\{\s*\[native code\]\s*\}\s*$/));
const registry = {};
const h2 = (type, props, ...children) => creatElement(registry[type] || type, props, ...children);
const register = (components) => void assign(registry, components);
assign(htm.bind(h2), { register });
function useBoolean(defaultValue) {
  const value = observable(!!get(defaultValue));
  const setTrue = () => value(true);
  const setFalse = () => value(false);
  const toggle = () => value((x) => !x);
  return { value, setTrue, setFalse, toggle };
}
export {
  useBoolean
};
//# sourceMappingURL=test.es.js.map
