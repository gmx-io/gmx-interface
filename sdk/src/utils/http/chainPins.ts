import { HttpError } from "./http";
import { IHttp } from "./types";

const MAX_PINS = 256;

type PinKeys = (string | undefined)[];

const pinsByApi = new WeakMap<IHttp, Map<string, IHttp>>();

function pinsOf(api: IHttp): Map<string, IHttp> {
  let pins = pinsByApi.get(api);
  if (!pins) {
    pins = new Map();
    pinsByApi.set(api, pins);
  }
  return pins;
}

function pinClient(api: IHttp, keys: PinKeys, client: IHttp) {
  const pins = pinsOf(api);
  for (const key of keys) {
    if (!key) continue;
    pins.delete(key);
    pins.set(key, client);
  }
  while (pins.size > MAX_PINS) {
    const oldest = pins.keys().next().value;
    if (oldest === undefined) break;
    pins.delete(oldest);
  }
}

function pinnedClient(api: IHttp, keys: PinKeys): IHttp | undefined {
  const pins = pinsByApi.get(api);
  if (!pins) return undefined;
  for (const key of keys) {
    if (!key) continue;
    const client = pins.get(key);
    if (client) {
      pins.delete(key);
      pins.set(key, client);
      return client;
    }
  }
  return undefined;
}

function unpinClient(api: IHttp, keys: PinKeys) {
  const pins = pinsByApi.get(api);
  if (!pins) return;
  for (const key of keys) {
    if (key) pins.delete(key);
  }
}

export async function postJsonPinning<TResult>(
  api: IHttp,
  path: string,
  body: unknown,
  keysOf: (result: TResult) => PinKeys,
  opts?: { transform?: (result: any) => TResult }
): Promise<TResult> {
  if (!api.postJsonWith) {
    return api.postJson<TResult>(path, body, opts);
  }
  const { result, client } = await api.postJsonWith<TResult>(path, body, opts);
  pinClient(api, keysOf(result), client);
  return result;
}

export async function postJsonPinned<TResult>(
  api: IHttp,
  keys: PinKeys,
  path: string,
  body: unknown,
  opts?: { transform?: (result: any) => TResult }
): Promise<TResult> {
  const client = pinnedClient(api, keys) ?? api;
  try {
    if (!client.postJsonWith) {
      return await client.postJson<TResult>(path, body, opts);
    }
    const served = await client.postJsonWith<TResult>(path, body, opts);
    pinClient(api, keys, served.client);
    return served.result;
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 404) {
      unpinClient(api, keys);
    }
    throw error;
  }
}
