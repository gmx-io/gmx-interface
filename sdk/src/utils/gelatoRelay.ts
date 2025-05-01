import { GelatoRelay } from "@gelatonetwork/relay-sdk";

export function isFirefox() {
  return window ? /Firefox/gi.test(window.navigator.userAgent) : false;
}

type ProxyGelatoRelay = {
  [field in keyof GelatoRelay]: GelatoRelay[field] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

let inited = false;
const { promise, resolve } = Promise.withResolvers<GelatoRelay>();

const gelatoRelayProxy = new Proxy<ProxyGelatoRelay>({} as ProxyGelatoRelay, {
  get(_target, p): any {
    if (!window) {
      throw new Error("Gelato proxy is only for firefox browser environment");
    }

    if (!inited) {
      inited = true;
      window.addEventListener(
        "load",
        () => {
          resolve(new GelatoRelay());
        },
        {
          once: true,
          passive: true,
        }
      );
    }

    return async (...args: any[]) => {
      return await promise.then(async (relay) => {
        return await relay[p](...args);
      });
    };
  },
});

// export let gelatoRelay: ProxyGelatoRelay = isFirefox()
//   ? gelatoRelayProxy
//   : (new GelatoRelay() as unknown as ProxyGelatoRelay);

export let gelatoRelay: ProxyGelatoRelay = gelatoRelayProxy;
