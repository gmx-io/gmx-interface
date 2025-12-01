import { AbiEvent } from "abitype";
import { MaybeExtractEventArgsFromAbi, GetLogsReturnType, parseEventLogs, ContractEventName } from "viem";
import { getLogs } from "viem/actions";

import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

export async function getOrWaitLogs<T extends AbiEvent>({
  chainId,
  fromBlock,
  event,
  address,
  args,
  finish = () => true,
  abortSignal,
  timeout = 60000,
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
  const timeoutSignal = timeout ? AbortSignal.timeout(timeout) : undefined;

  const logs = await getLogs(getPublicClientWithRpc(chainId), {
    fromBlock,
    event,
    args,
    address,
  });

  if (logs.length) {
    return logs as unknown as GetLogsReturnType<T>;
  }

  if (abortSignal?.aborted) {
    return [];
  }

  const { promise, resolve, reject } = Promise.withResolvers<GetLogsReturnType<T>>();

  const unsub = getPublicClientWithRpc(chainId).watchEvent({
    fromBlock,
    event,
    args,
    address,
    onLogs: (logs) => {
      const parsedLogs = parseEventLogs<[T]>({
        abi: [event],
        eventName: event.name as ContractEventName<[T]>,
        logs,
        args,
      }) as unknown as GetLogsReturnType<T>;
      if (finish(parsedLogs)) {
        unsub();
        resolve(parsedLogs);
      }
    },
    onError: (error) => {
      reject(error);
    },
  });

  AbortSignal.any([abortSignal, timeoutSignal].filter(Boolean) as AbortSignal[]).addEventListener("abort", () => {
    unsub();
    reject(new Error("Abort signal received"));
  });

  return promise;
}
