import type { AbiEvent } from "abitype";
import type { MaybeExtractEventArgsFromAbi, GetLogsReturnType } from "viem";

import { createAnySignal, createTimeoutSignal } from "lib/abortSignalHelpers";
import { sleep } from "lib/sleep";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

const POLLING_INTERVAL = 2_000; // 2 seconds
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_FINISH = () => true;

export async function getOrWaitLogs<T extends AbiEvent>({
  chainId,
  fromBlock,
  event,
  address,
  args,
  finish = DEFAULT_FINISH,
  abortSignal,
  timeout = DEFAULT_TIMEOUT,
}: {
  chainId: number;
  fromBlock: bigint;
  event: T;
  address?: string | string[];
  args: MaybeExtractEventArgsFromAbi<[T], T["name"]>;
  finish?: (logs: GetLogsReturnType<T>) => boolean;
  abortSignal?: AbortSignal;
  timeout?: number;
}): Promise<GetLogsReturnType<T>> {
  const timeoutSignal = timeout ? createTimeoutSignal(timeout) : undefined;
  const combinedSignal = createAnySignal([abortSignal, timeoutSignal]);

  return new Promise(async (resolve, reject) => {
    combinedSignal.addEventListener("abort", () => {
      reject(new Error("Abort signal received"));
    });

    while (!combinedSignal.aborted) {
      try {
        const logs = await getPublicClientWithRpc(chainId).getLogs({
          fromBlock,
          event,
          args,
          address,
        });

        if (logs.length) {
          const typedLogs = logs as unknown as GetLogsReturnType<T>;
          if (finish(typedLogs)) {
            resolve(typedLogs);
            return;
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("getOrWaitLogs error", error);
      }

      await sleep(POLLING_INTERVAL);
    }
  });
}
