import noop from "lodash/noop";
import { EncodeEventTopicsReturnType, Hex } from "viem";

import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

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
  Step extends string = "finished",
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
    this.resolversRegistry["finished"] = Promise.withResolvers<void>();
    // TODO MLTCH add steps when managers say to show steps
    // Defer initialization to next tick to allow subclass properties (steps, groups, etc.)
    // to be initialized before we access them
    queueMicrotask(() => {
      for (const name of this.steps) {
        if (name === "finished") {
          continue;
        }
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
}

export async function fetchLogs(chainId: number, txHash: string) {
  const receipt = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({
    hash: txHash,
  });

  return receipt.logs;
}
