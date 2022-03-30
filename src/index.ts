import { NestedKeyOf, Subscriber } from './types';
import { subscriberIdSymbol, subscribersSymbol } from './utils';

let proxyHandler = (subscribersRefs: WeakSet<Subscriber>) => ({
  set: setterObserver(subscribersRefs),
});

let isObject = (target: any): target is Record<string | symbol, any> =>
  typeof target === 'object';

let setHiddenProp = (target: object, prop: string | symbol, value: any) =>
  Object.defineProperty(target, prop, {
    enumerable: false,
    writable: true,
    value,
  });

let selectorStringToKeysArray = (str: string = '') =>
  str.split(/\.|\[|\]/g).filter(Boolean);

let getValueByKeys = <T>(target: T, props: Array<string>): T => {
  return props.reduce(
    (result, prop) => (result ? result[prop] : undefined),
    target
  );
};

let forEachObjectOf = (obj: object) => (
  fn: (parent: object, key: string, value: any) => void
) => {
  for (let [key, value] of Object.entries(obj)) {
    if (isObject(value)) {
      fn(obj, key, value);
    }
  }
};

let deepProxy = <T extends object>(
  subscribersRefs: WeakSet<Subscriber>,
  target: Record<string, any>
): T => {
  setHiddenProp(target, subscribersSymbol, []);
  forEachObjectOf(target)((_, key, value) => {
    value && (target[key] = deepProxy(subscribersRefs, value));
  });
  return new Proxy(target, proxyHandler(subscribersRefs)) as T;
};

let deepSetWithProxy = <T>(
  subscribersRefs: WeakSet<Subscriber>,
  parent: T,
  prop: string,
  value: object
) => {
  let oldValue = parent[prop];
  let mergeWithProxy = (oldValue: T, newValue: Record<string, any>) => {
    let finalValue = newValue;
    let subscribers = (oldValue[subscribersSymbol] || []) as Array<Subscriber>;
    subscribers
      .filter(fn => subscribersRefs.has(fn) && fn[subscriberIdSymbol] !== prop)
      .forEach(fn => {
        fn(newValue[fn[subscriberIdSymbol]] || newValue);
      });
    setHiddenProp(finalValue, subscribersSymbol, subscribers);
    forEachObjectOf(newValue)((_, key) => {
      oldValue[key] &&
        (finalValue[key] = mergeWithProxy(oldValue[key], newValue[key]));
    });
    return new Proxy(finalValue, proxyHandler(subscribersRefs));
  };

  parent[prop] =
    isObject(oldValue) && oldValue[subscribersSymbol]
      ? mergeWithProxy(oldValue as T, value)
      : deepProxy(subscribersRefs, value);
};

let setterObserver = <T>(subscribersRefs: WeakSet<Subscriber>) => (
  parent: T,
  prop: string | symbol,
  value: any
) => {
  let target = parent[prop];
  if (isObject(value) && typeof prop != 'symbol') {
    deepSetWithProxy(subscribersRefs, parent, prop, value);
  } else {
    parent[prop] = value;
  }
  let targetIsObject = isObject(target);
  let targetSubscribers: Array<Subscriber> = targetIsObject
    ? target[subscribersSymbol]
    : parent[subscribersSymbol];
  targetSubscribers
    .filter(fn => subscribersRefs.has(fn) && fn[subscriberIdSymbol] === prop)
    .forEach(fn => {
      fn(value);
    });
  return true;
};

export class Store<T extends object> {
  private d: T;
  private s: WeakSet<Subscriber>;

  constructor(state: T) {
    let self = this;
    self.s = new WeakSet();
    self.d = deepProxy(self.s, state);
  }

  //@ts-ignore
  set data(value: any) {
    setterObserver(this.s)(this as any, 'd', value);
  }

  //@ts-ignore
  get data(): T {
    return this.d;
  }

  unsubscribe(callbackFn: Subscriber<any>) {
    this.s.delete(callbackFn);
  }

  subscribe<G = T>(
    callbackFn: Subscriber<G> | Omit<Subscriber<G>, typeof subscriberIdSymbol>,
    selectorString?: string & NestedKeyOf<T>
  ) {
    let self = this;
    let keys = selectorStringToKeysArray(selectorString);
    let target = getValueByKeys(self.d, keys);
    if (!isObject(target)) {
      target = getValueByKeys(self.d, keys.slice(0, keys.length - 1));
    }
    setHiddenProp(callbackFn, subscriberIdSymbol, keys.slice(-1)[0]);
    self.s.add(callbackFn as Subscriber<G>);
    target[subscribersSymbol].push(callbackFn as Subscriber<G>);
    return callbackFn;
  }
}
