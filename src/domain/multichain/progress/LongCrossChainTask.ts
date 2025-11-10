import noop from "lodash/noop";
import { EncodeEventTopicsReturnType, Hex } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

export const testFetch = (input: Request) => {
  return globalThis.fetch(input.url, input);
};

export function matchLogRequest(request: EncodeEventTopicsReturnType, logTopics: [Hex, ...Hex[]] | []): boolean {
  return request.every((filter, index) => {
    if (!filter) {
      return true;
    }

    if (Array.isArray(filter)) {
      return filter.some((item) => item === logTopics[index]);
    }

    return filter === logTopics[index];
  });
}

export function isStringEqualInsensitive(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

const DEBUG = false;

// eslint-disable-next-line no-console
export const debugLog = DEBUG ? (...args: any[]) => console.log("[LongCrossChainTask]", ...args) : noop;

export abstract class LongCrossChainTask<
  Step extends string | "finished" = "finished",
  Group extends string | undefined = undefined,
  ErrorType = unknown,
> {
  private readonly resolversRegistry: Record<Step, PromiseWithResolvers<void>> = {} as Record<
    Step,
    PromiseWithResolvers<void>
  >;
  private readonly dynamicGroups: Partial<Record<NonNullable<Group>, Record<string, PromiseWithResolvers<void>>>> =
    {} as Partial<Record<NonNullable<Group>, Record<string, PromiseWithResolvers<void>>>>;

  readonly steps: Step[] = [];
  readonly groups: Group[] = [];

  readonly startTimestamp = Date.now();
  finishTimestamp: number | undefined = undefined;

  constructor(
    public readonly initialTxHash: string,
    public readonly sourceChainId: number,
    public readonly settlementChainId: number
  ) {
    // Defer initialization to next tick to allow subclass properties (steps, groups, etc.)
    // to be initialized before we access them
    queueMicrotask(() => {
      for (const name of this.steps) {
        this.resolversRegistry[name] = Promise.withResolvers<void>();
      }

      this.start();
    });
  }

  protected abstract start(): Promise<void>;

  private didCallMap: Record<string, boolean> = {};
  protected isFirstTimeCalling(name: string, params: any[] = []): boolean {
    const key = JSON.stringify([name, ...params], (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
    if (this.didCallMap[key]) {
      debugLog("isFirstTimeCalling", name, params, "already called");
      return false;
    }
    this.didCallMap[key] = true;
    return true;
  }

  protected getResolver(name: Step) {
    return this.resolversRegistry[name];
  }

  public getStepPromise(name: Step) {
    return this.getResolver(name)?.promise;
  }

  protected resolve(name: Step) {
    debugLog("resolve", name);
    if (name === "finished") {
      this.finishTimestamp = Date.now();
    }
    this.resolversRegistry[name]?.resolve();
  }

  protected reject(name: Step, reason?: ErrorType) {
    debugLog("reject", name, reason);
    if (name === "finished") {
      this.finishTimestamp = Date.now();
    }
    this.resolversRegistry[name]?.reject(reason);
  }

  // Dynamic grouped steps API
  protected addDynamic(group: Group, id: string): void {
    const key = group as unknown as string;
    let groupMap = this.dynamicGroups[key];
    if (!groupMap) {
      groupMap = {};
      this.dynamicGroups[key] = groupMap;
    }
    if (!groupMap[id]) {
      groupMap[id] = Promise.withResolvers<void>();
    }
  }

  protected resolveDynamic(group: Group, id: string) {
    const key = group as unknown as string;
    const groupMap = this.dynamicGroups[key];
    const resolver = groupMap?.[id];
    resolver?.resolve();
  }

  protected rejectDynamic(group: Group, id: string, reason?: unknown) {
    const key = group as unknown as string;
    const groupMap = this.dynamicGroups[key];
    const resolver = groupMap?.[id];
    resolver?.reject(reason);
  }

  // TODO remove unused function
  public getDynamicGroup(group: Group): Record<string, Promise<void>> {
    const out: Record<string, Promise<void>> = {};
    const key = group as NonNullable<Group>;
    const groupMap = this.dynamicGroups[key];
    if (!groupMap) {
      return out;
    }
    for (const [id, r] of Object.entries(groupMap)) {
      out[id] = r.promise;
    }
    return out;
  }

  public async waitForAny(group: Group): Promise<{ id: string }> {
    const key = group as NonNullable<Group>;
    const groupMap = this.dynamicGroups[key];
    const entries = groupMap ? Object.entries(groupMap) : [];
    if (entries.length === 0) throw new Error(`No steps in group ${group}`);
    return await new Promise((resolve) => {
      for (const [id, r] of entries) {
        r.promise.then(() => resolve({ id }));
      }
    });
  }

  public async waitForAll(group: Group): Promise<void> {
    const key = group as NonNullable<Group>;
    const groupMap = this.dynamicGroups[key];
    const values = groupMap ? Object.values(groupMap) : [];
    if (values.length === 0) {
      return;
    }
    await Promise.all(values.map((r) => r.promise));
  }
}

export async function fetchLogs(chainId: number, txHash: string) {
  const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
    hash: txHash,
  });

  return receipt.logs;
}
