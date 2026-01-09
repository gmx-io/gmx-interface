import {
  decodeEventLog,
  encodeEventTopics,
  parseEventLogs,
  withRetry,
  type Abi,
  type ContractEventName,
  type Log,
} from "viem";

import { tryGetContract } from "config/contracts";
import { ENDPOINT_ID_TO_CHAIN_ID } from "config/multichain";
import {
  COMPOSE_DELIVERED_ABI,
  LZ_COMPOSE_ALERT_ABI,
  OFT_RECEIVED_ABI,
} from "context/WebsocketContext/subscribeToEvents";
import { createAnySignal, createTimeoutSignal } from "lib/abortSignalHelpers";
import { sleep } from "lib/sleep";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { ContractsChainId } from "sdk/configs/chains";

import { getBlockNumberBeforeTimestamp } from "./getBlockNumberByTimestamp";
import { getLzBaseUrl } from "./getLzBaseUrl";
import { getOrWaitLogs } from "./getOrWaitLogs";
import { debugLog, matchLogRequest } from "./LongCrossChainTask";
import type { LzApiOperation } from "./lz-types";

export type LzStatus = {
  guid: string | undefined;
  source: "pending" | "confirmed" | "failed";
  sourceTx?: string;
  destination: "pending" | "confirmed" | "failed";
  destinationTx?: string;
  destinationChainId?: number;
  lz: "pending" | "confirmed" | "failed" | undefined;
  lzTx?: string;
};

const TEST_MODE_BLOCK_RANGE = 58000n; // Roughly 4 hours of arbitrum
const LZ_WAIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function tryParseEventLogs<TAbi extends Abi>({
  abi,
  eventName,
  logs,
}: {
  abi: TAbi;
  eventName: ContractEventName<TAbi>;
  logs: Log[];
}) {
  try {
    return parseEventLogs({
      abi,
      eventName,
      logs,
    });
  } catch (_error) {
    return null;
  }
}

export async function watchLzTxRpc({
  chainId,
  txHash,
  onUpdate,
  withLzCompose,
  abortSignal,
}: {
  chainId: number;
  txHash: string;
  onUpdate: (data: LzStatus[]) => void;
  withLzCompose: boolean;
  abortSignal?: AbortSignal;
}): Promise<void> {
  debugLog("[watchLzTxRpc] fetching source chain logs", chainId, txHash);
  const sourceTx = await getPublicClientWithRpc(chainId).waitForTransactionReceipt({ hash: txHash });
  debugLog("[watchLzTxRpc] status", sourceTx.status);

  if (sourceTx.status === "reverted") {
    debugLog("[watchLzTxRpc] source tx reverted");
    onUpdate([
      {
        guid: undefined,
        source: "failed",
        sourceTx: txHash,
        destination: "failed",
        lz: "failed",
        lzTx: undefined,
        destinationChainId: undefined,
        destinationTx: undefined,
      },
    ]);

    return;
  }

  const sourceBlock = await getPublicClientWithRpc(chainId).getBlock({ blockHash: sourceTx.blockHash });
  debugLog("loading logs");
  const sourceChainLogs = sourceTx.logs;

  if (abortSignal?.aborted) {
    debugLog("[watchLzTxRpc] abort signal received");
    return;
  }

  debugLog("[watchLzTxRpc] fetched source chain logs", sourceChainLogs.length);
  const topics = encodeEventTopics({
    abi: abis.IStargate,
    eventName: "OFTSent",
  });

  debugLog("[watchLzTxRpc] encoded event topics");
  const oftSentLogs = sourceChainLogs.filter((log) => matchLogRequest(topics, log.topics));
  debugLog("[watchLzTxRpc] filtered source chain logs", oftSentLogs.length);
  const oftSentEvents = oftSentLogs.map((log) =>
    decodeEventLog({
      abi: abis.IStargate,
      eventName: "OFTSent",
      topics: log.topics,
      data: log.data,
    })
  );

  // TODO MLTCH wait for all OFTSent events to be confirmed
  const oftSentEvent = oftSentEvents.at(0);
  if (!oftSentEvent) {
    debugLog("[watchLzTxRpc] no OFTSent event found");
    throw new Error("No OFTSent event found");
  }
  //   It is most certanly only one OFTSent event for a given tx    const destinationChainIds = oftSentEvents
  debugLog("[watchLzTxRpc] got OFTSent event");
  const guid = oftSentEvent.args.guid;
  debugLog("[watchLzTxRpc] got guid", guid);

  debugLog("[watchLzTxRpc] getting destination chain id");
  const destinationChainId = ENDPOINT_ID_TO_CHAIN_ID[oftSentEvent.args.dstEid];
  debugLog("[watchLzTxRpc] got destination chain id", destinationChainId);
  if (!destinationChainId) {
    debugLog("[watchLzTxRpc] no destination chain id found");
    throw new Error(`No destination chain id found for OFTSent event ${guid}`);
  }

  onUpdate([
    {
      guid,
      source: "confirmed",
      sourceTx: txHash,
      destination: "pending",
      destinationChainId,
      lz: withLzCompose ? "pending" : undefined,
    },
  ]);

  const destinationOldBlock = await getBlockNumberBeforeTimestamp(destinationChainId, sourceBlock.timestamp);
  if (abortSignal?.aborted) {
    debugLog("[watchLzTxRpc] abort signal received");
    return;
  }

  const oftReceivedLogs = await getOrWaitLogs({
    chainId: destinationChainId,
    fromBlock: destinationOldBlock,
    event: OFT_RECEIVED_ABI[0],
    args: {
      guid: oftSentEvent.args.guid,
    },
  });
  if (abortSignal?.aborted) {
    debugLog("[watchLzTxRpc] abort signal received");
    return;
  }

  if (oftReceivedLogs.length === 0) {
    debugLog("[watchLzTxRpc] no OFTReceived logs found");
    throw new Error("No OFTReceived logs found");
  }

  debugLog("[watchLzTxRpc] OFTReceived logs", oftReceivedLogs);
  onUpdate([
    {
      guid,
      source: "confirmed",
      sourceTx: txHash,
      destination: "confirmed",
      destinationTx: oftReceivedLogs[0].transactionHash,
      destinationChainId,
      lz: withLzCompose ? "pending" : undefined,
    },
  ]);

  const layerZeroEndpoint = tryGetContract(destinationChainId as ContractsChainId, "LayerZeroEndpoint");
  if (withLzCompose && layerZeroEndpoint) {
    debugLog(
      "[watchLzTxRpc] waiting for LZ compose event after block",
      oftReceivedLogs[0].blockNumber,
      destinationChainId
    );

    const publicClient = getPublicClientWithRpc(destinationChainId);
    const fromBlock = oftReceivedLogs[0].blockNumber;
    // This request does not have good filtering, so we need to limit the range so the tests dont break
    // In runtime we only call it for the new tx so the fromBlock-now is small enough
    const toBlock = import.meta.env.MODE === "test" ? fromBlock + TEST_MODE_BLOCK_RANGE : undefined;

    const allLogs = await publicClient.getLogs({
      fromBlock,
      toBlock,
      events: [COMPOSE_DELIVERED_ABI[0], LZ_COMPOSE_ALERT_ABI[0]],
      address: layerZeroEndpoint,
    });

    let matchingDeliveredHash: string | undefined;
    let matchingAlertHash: string | undefined;

    for (const log of allLogs) {
      const deliveredParsed = tryParseEventLogs({
        abi: COMPOSE_DELIVERED_ABI,
        eventName: "ComposeDelivered",
        logs: [log],
      });
      if (deliveredParsed?.[0]?.args.guid === guid) {
        matchingDeliveredHash = log.transactionHash;
        break;
      }

      const alertParsed = tryParseEventLogs({
        abi: LZ_COMPOSE_ALERT_ABI,
        eventName: "LzComposeAlert",
        logs: [log],
      });
      if (alertParsed?.[0]?.args.guid === guid) {
        matchingAlertHash = log.transactionHash;
      }
    }

    // If success found, return success
    if (matchingDeliveredHash) {
      debugLog("[watchLzTxRpc] found existing COMPOSE_DELIVERED event");
      onUpdate([
        {
          guid,
          source: "confirmed",
          sourceTx: txHash,
          destination: "confirmed",
          destinationTx: oftReceivedLogs[0].transactionHash,
          destinationChainId,
          lz: "confirmed",
          lzTx: matchingDeliveredHash,
        },
      ]);
      return;
    }

    // If no success but alert found, return alert
    if (matchingAlertHash) {
      debugLog("[watchLzTxRpc] found existing LZ_COMPOSE_ALERT event - marking as failed");
      onUpdate([
        {
          guid,
          source: "confirmed",
          sourceTx: txHash,
          destination: "confirmed",
          destinationTx: oftReceivedLogs[0].transactionHash,
          destinationChainId,
          lz: "failed",
          lzTx: matchingAlertHash,
        },
      ]);
      return;
    }

    // If none found, wait for both events
    if (abortSignal?.aborted) {
      debugLog("[watchLzTxRpc] abort signal received");
      return;
    }

    debugLog("[watchLzTxRpc] no existing events found, waiting for LZ compose events");
    const composeAbortController = new AbortController();
    const timeoutSignal = createTimeoutSignal(LZ_WAIT_TIMEOUT);
    const combinedAbortSignal = createAnySignal([abortSignal, composeAbortController.signal, timeoutSignal]);

    const { promise, resolve, reject } = Promise.withResolvers<{ type: "delivered" | "alert"; hash: string }>();

    const unsub = publicClient.watchEvent({
      fromBlock,
      events: [COMPOSE_DELIVERED_ABI[0], LZ_COMPOSE_ALERT_ABI[0]],
      address: layerZeroEndpoint,
      onLogs: (logs) => {
        for (const log of logs) {
          const deliveredParsed = tryParseEventLogs({
            abi: COMPOSE_DELIVERED_ABI,
            eventName: "ComposeDelivered",
            logs: [log],
          });
          if (deliveredParsed?.[0]?.args.guid === guid) {
            unsub();
            resolve({ type: "delivered", hash: log.transactionHash });
            return;
          }

          const alertParsed = tryParseEventLogs({
            abi: LZ_COMPOSE_ALERT_ABI,
            eventName: "LzComposeAlert",
            logs: [log],
          });
          if (alertParsed?.[0]?.args.guid === guid) {
            unsub();
            resolve({ type: "alert", hash: log.transactionHash });
            return;
          }
        }
      },
      onError: (error) => {
        unsub();
        reject(error);
      },
    });

    combinedAbortSignal.addEventListener("abort", () => {
      unsub();
      reject(new Error("Abort signal received"));
    });

    const result = await promise;

    if (abortSignal?.aborted) {
      debugLog("[watchLzTxRpc] abort signal received");
      return;
    }

    debugLog("[watchLzTxRpc] got LZ compose result", result);

    if (result.type === "alert") {
      debugLog("[watchLzTxRpc] LZ compose alert received - marking as failed");
      onUpdate([
        {
          guid,
          source: "confirmed",
          sourceTx: txHash,
          destination: "confirmed",
          destinationTx: oftReceivedLogs[0].transactionHash,
          destinationChainId,
          lz: "failed",
          lzTx: result.hash,
        },
      ]);
      return;
    }

    if (result.type === "delivered") {
      onUpdate([
        {
          guid,
          source: "confirmed",
          sourceTx: txHash,
          destination: "confirmed",
          destinationTx: oftReceivedLogs[0].transactionHash,
          destinationChainId,
          lz: "confirmed",
          lzTx: result.hash,
        },
      ]);
      debugLog("[watchLzTxRpc] got LZ compose event");
      return;
    }
  } else {
    debugLog("[watchLzTxRpc] no LZ compose event needed");
  }
}

export async function watchLzTxApi(
  chainId: number,
  txHash: string,
  onUpdate: (data: LzStatus[]) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const fetchTx = () =>
    fetch(`${getLzBaseUrl(chainId)}/messages/tx/${txHash}`, {
      signal: abortSignal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text().catch(() => res.statusText);
          return {
            data: undefined,
            error: new Error(`HTTP ${res.status}: ${errorText}`),
          };
        }
        return {
          data: (await res.json()) as { data: LzApiOperation[] },
          error: undefined,
        };
      })
      .catch((error) => ({
        data: undefined,
        error: error,
      }));

  debugLog("[watchLzTxApi] fetching tx", chainId, txHash);

  let result = await fetchTx().catch((error) => {
    debugLog("[watchLzTxApi] fetchTx error", error);
    throw error;
  });

  if (abortSignal?.aborted) {
    debugLog("[watchLzTxApi] abort signal received");
    return;
  }

  debugLog("[watchLzTxApi] got first result");
  if (result.error) {
    debugLog("[watchLzTxApi] first result error, waiting for transaction receipt");

    const abortPromise = new Promise((_resolve, reject) => {
      abortSignal?.addEventListener("abort", () => {
        reject(new Error("Abort signal received"));
      });
    });

    await Promise.race([
      getPublicClientWithRpc(chainId).waitForTransactionReceipt({
        hash: txHash,
      }),
      sleep(60000).then(() => Promise.reject(new Error("Transaction not found during await tx receipt"))),
      abortPromise,
    ]);

    debugLog("[watchLzTxApi] refetching tx");
    result = await withRetry(
      () =>
        fetchTx().then((res) => {
          if (res.error) {
            throw new Error("Transaction not found during refetch");
          }
          return res;
        }),
      {
        retryCount: 10,
        delay: 10000,
        shouldRetry: () => !abortSignal?.aborted,
      }
    );
  }

  const operations = result.data?.data;

  if (!operations) {
    debugLog("[watchLzTxApi] no operations found", result);
    throw new Error("Transaction not found operations check");
  }

  debugLog("[watchLzTxApi] found operations, first onUpdate");
  onUpdate(operations.map(getLzStatusFromApiResponse));
  if (isLzTxFailed(operations.map(getLzStatusFromApiResponse))) {
    debugLog("[watchLzTxApi] LZ TX failed");
    return;
  }

  let isInProgress = isLzTxInProgress(operations.map(getLzStatusFromApiResponse));
  debugLog("[watchLzTxApi] isInProgress", isInProgress);
  while (isInProgress) {
    await sleep(10000);
    if (abortSignal?.aborted) {
      debugLog("[watchLzTxApi] abort signal received");
      return;
    }

    result = await fetchTx();
    if (abortSignal?.aborted) {
      debugLog("[watchLzTxApi] abort signal received");
      return;
    }
    const operations = result.data?.data;

    if (!operations) {
      throw new Error("Transaction not found during update");
    }

    isInProgress = isLzTxInProgress(operations.map(getLzStatusFromApiResponse));
    debugLog("[watchLzTxApi] isInProgress after sleep", isInProgress);
    debugLog("[watchLzTxApi] onUpdate");
    onUpdate(operations.map(getLzStatusFromApiResponse));
    if (isLzTxFailed(operations.map(getLzStatusFromApiResponse))) {
      debugLog("[watchLzTxApi] LZ TX failed, returning");
      return;
    }
  }
}

export async function watchLzTx({
  chainId,
  txHash,
  withLzCompose,
  onUpdate,
}: {
  chainId: number;
  txHash: string;
  withLzCompose: boolean;
  onUpdate: (data: LzStatus[]) => void;
}): Promise<void> {
  let initState: LzStatus[] = [];
  const abortController = new AbortController();

  const handleUpdate = (data: LzStatus[]) => {
    initState = mergeLzStatusUpdates(initState, data);
    onUpdate(initState);

    // If any status is failed, abort both watchers
    if (isLzTxFailed(initState)) {
      debugLog("[watchLzTx] LZ TX failed detected in handleUpdate, aborting");
      abortController.abort();
    }
  };

  const { promise, resolve, reject } = Promise.withResolvers<void>();

  Promise.allSettled([
    watchLzTxApi(chainId, txHash, handleUpdate, abortController.signal).then(
      () => {
        debugLog("[watchLzTx] watchLzTxApi completed");
        abortController.abort();
        resolve();
      },
      (error) => {
        resolve();
        debugLog("[watchLzTx] watchLzTxApi failed", error);
      }
    ),
    watchLzTxRpc({ chainId, txHash, onUpdate: handleUpdate, withLzCompose, abortSignal: abortController.signal }).then(
      () => {
        debugLog("[watchLzTx] watchLzTxRpc completed");
        abortController.abort();
        resolve();
      },
      (error) => {
        resolve();
        debugLog("[watchLzTx] watchLzTxRpc failed", error);
      }
    ),
  ]).then((res) => {
    if (res.every((r) => r.status === "rejected")) {
      reject(new Error("All watchLzTxApi and watchLzTxRpc failed"));
    }
  });

  return promise;
}

function mergeLzStatusUpdates(initState: LzStatus[], newData: LzStatus[]): LzStatus[] {
  const checkedGuids: string[] = [];
  const newState = newData.map((operation) => {
    if (operation.guid) {
      checkedGuids.push(operation.guid);
    }
    const old = initState.find((d) => d.guid === operation.guid);
    if (!old) {
      debugLog("[watchLzTx] no old operation, returning new operation", operation);
      return operation;
    }
    const furthest = compareLzStatus(old, operation) > 0 ? operation : old;
    debugLog("[watchLzTx] furthest", { old, operation, furthest });

    return furthest;
  });
  // check if no old get left out
  const uncheckedGuids = initState.filter((d) => d.guid && !checkedGuids.includes(d.guid));
  // add them to the new state as is
  return [...newState, ...uncheckedGuids];
}

function compareLzStatus(a: LzStatus, b: LzStatus): number {
  if (a.source !== b.source) {
    if (a.source === "pending") {
      return 1;
    } else if (b.source === "pending") {
      return -1;
    }
  }

  if (a.destination !== b.destination) {
    if (a.destination === "pending") {
      return 1;
    } else if (b.destination === "pending") {
      return -1;
    }
  }

  if (a.lz !== b.lz) {
    if (a.lz === "pending") {
      return 1;
    } else if (b.lz === "pending") {
      return -1;
    }
  }

  return 0;
}

function getLzStatusFromApiResponse(operation: LzApiOperation): LzStatus {
  let sourceStatus: "pending" | "confirmed" | "failed";
  if (operation.source?.status === "SUCCEEDED") {
    sourceStatus = "confirmed";
  } else if (
    operation.source?.status === "VALIDATING_TX" ||
    operation.source?.status === "WAITING_FOR_HASH_DELIVERED" ||
    operation.source?.status === "WAITING"
  ) {
    sourceStatus = "pending";
  } else {
    sourceStatus = "failed";
  }

  let destinationStatus: "pending" | "confirmed" | "failed";
  if (sourceStatus === "failed") {
    destinationStatus = "failed";
  } else {
    if (operation.destination?.status === "SUCCEEDED") {
      destinationStatus = "confirmed";
    } else if (operation.destination?.status === "VALIDATING_TX" || operation.destination?.status === "WAITING") {
      destinationStatus = "pending";
    } else {
      destinationStatus = "failed";
    }
  }

  let lzStatus: "pending" | "confirmed" | "failed" | undefined = undefined;
  if (destinationStatus === "failed") {
    lzStatus = "failed";
  } else {
    if (
      operation.destination &&
      "lzCompose" in operation.destination &&
      operation.destination.lzCompose &&
      operation.destination.lzCompose.status &&
      operation.destination.lzCompose.status !== "N/A"
    ) {
      if (operation.destination.lzCompose.status === "SUCCEEDED") {
        lzStatus = "confirmed";
      } else if (
        operation.destination.lzCompose.status === "VALIDATING_TX" ||
        operation.destination.lzCompose.status === "WAITING" ||
        operation.destination.lzCompose.status === "WAITING_FOR_COMPOSE_SENT_EVENT"
      ) {
        lzStatus = "pending";
      } else {
        lzStatus = "failed";
      }
    }
  }

  const destinationChainId = operation.pathway?.dstEid ? ENDPOINT_ID_TO_CHAIN_ID[operation.pathway.dstEid] : undefined;

  const lzTx =
    operation.destination && "lzCompose" in operation.destination && operation.destination.lzCompose?.txs?.[0]?.txHash;

  return {
    guid: operation.guid,
    source: sourceStatus,
    sourceTx: operation.source?.tx?.txHash,
    destination: destinationStatus,
    destinationTx: operation.destination?.tx?.txHash,
    destinationChainId,
    lz: lzStatus,
    lzTx: lzTx || undefined,
  };
}

function isLzTxInProgress(data: LzStatus[]) {
  return data.some(
    (operation) => operation.lz === "pending" || operation.destination === "pending" || operation.source === "pending"
  );
}

function isLzTxFailed(data: LzStatus[]) {
  return data.some(
    (operation) => operation.lz === "failed" || operation.destination === "failed" || operation.source === "failed"
  );
}
