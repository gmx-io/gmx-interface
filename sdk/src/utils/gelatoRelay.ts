import { GelatoRelay } from "@gelatonetwork/relay-sdk";
import noop from "lodash/noop";

import { sleep } from "./common";

type ProxyGelatoRelay = {
  [field in keyof GelatoRelay]: GelatoRelay[field] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : never;
};

let initialized = false;
const { promise, resolve } = Promise.withResolvers<GelatoRelay>();

const gelatoRelayProxy = new Proxy<ProxyGelatoRelay>({} as ProxyGelatoRelay, {
  get(_target, p): any {
    if (!window) {
      throw new Error("Gelato proxy is only for firefox browser environment");
    }

    if (!initialized) {
      initialized = true;

      if (document.readyState === "complete") {
        const relay = new GelatoRelay();
        relay.onError(noop);
        resolve(relay);
      } else {
        window.addEventListener(
          "load",
          async () => {
            const relay = new GelatoRelay();
            relay.onError(noop);
            resolve(relay);
          },
          {
            once: true,
            passive: true,
          }
        );
      }
    }

    return async (...args: any[]) => {
      return await Promise.race([
        promise.then(async (relay) => {
          return await relay[p](...args);
        }),
        sleep(5000).then(async () => {
          await promise;

          throw new Error("Gelato relay did not respond in 5 seconds");
        }),
      ]);
    };
  },
});

export let gelatoRelay: ProxyGelatoRelay = gelatoRelayProxy;
