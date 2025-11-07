import { decodeEventLog, encodeEventTopics, withRetry } from "viem";

import { ENDPOINT_ID_TO_CHAIN_ID } from "config/multichain";
import { COMPOSE_DELIVERED_ABI, OFT_RECEIVED_ABI } from "context/WebsocketContext/subscribeToEvents";
import { sleep } from "lib/sleep";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";

import { layerZeroApi } from ".";
import { paths } from "./gen";
import { getBlockNumberBeforeTimestamp } from "./getBlockNumberByTimestamp";
import { getOrWaitLogs } from "./getOrWaitLogs";
import { debugLog, fetchLogs, matchLogRequest, testFetch } from "./LongCrossChainTask";

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

export async function watchLzTxRpc(
  chainId: number,
  txHash: string,
  onUpdate: (data: LzStatus[]) => void,
  withLzCompose: boolean,
  abortSignal?: AbortSignal
): Promise<void> {
  debugLog("[watchLzTxRpc] fetching source chain logs", chainId, txHash);
  const sourceChainLogs = await fetchLogs(chainId, txHash);
  const sourceTx = await getPublicClientWithRpc(chainId).getTransactionReceipt({ hash: txHash });
  const sourceBlock = await getPublicClientWithRpc(chainId).getBlock({ blockHash: sourceTx.blockHash });

  if (abortSignal?.aborted) {
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

  if (withLzCompose) {
    debugLog(
      "[watchLzTxRpc] waiting for LZ compose event after block",
      oftReceivedLogs[0].blockNumber,
      destinationChainId
    );

    const lzComposeLogs = await getOrWaitLogs({
      chainId: destinationChainId,
      fromBlock: oftReceivedLogs[0].blockNumber!,
      event: COMPOSE_DELIVERED_ABI[0],
      args: {},
      finish: (logs) => logs.some((log) => log.args.guid === guid),
      abortSignal,
    });
    if (abortSignal?.aborted) {
      return;
    }

    debugLog("[watchLzTxRpc] got LZ compose logs", lzComposeLogs);

    if (lzComposeLogs.length > 0) {
      onUpdate([
        {
          guid,
          source: "confirmed",
          sourceTx: txHash,
          destination: "confirmed",
          destinationTx: oftReceivedLogs[0].transactionHash,
          destinationChainId,
          lz: "confirmed",
          lzTx: lzComposeLogs[0].transactionHash,
        },
      ]);
      debugLog("[watchLzTxRpc] got LZ compose event");
      return;
    } else {
      debugLog("[watchLzTxRpc] no LZ compose event found");
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
    layerZeroApi.GET("/messages/tx/{tx}", {
      params: { path: { tx: txHash } },
      fetch: testFetch,
      signal: abortSignal,
    });

  debugLog("[watchLzTxApi] fetching tx", chainId, txHash);

  let result = await fetchTx().catch((error) => {
    debugLog("[watchLzTxApi] fetchTx error", error);
    throw error;
  });

  if (abortSignal?.aborted) {
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

  let isInProgress = isLzTxInProgress(operations.map(getLzStatusFromApiResponse));
  debugLog("[watchLzTxApi] isInProgress", isInProgress);
  while (isInProgress) {
    await sleep(10000);
    if (abortSignal?.aborted) {
      return;
    }

    result = await fetchTx();
    if (abortSignal?.aborted) {
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
  }
}

export async function watchLzTx(
  chainId: number,
  txHash: string,
  withLzCompose: boolean,
  onUpdate: (data: LzStatus[]) => void
): Promise<void> {
  let initState: LzStatus[] = [];
  const abortController = new AbortController();

  const handleUpdate = (data: LzStatus[]) => {
    const checkedGuids: string[] = [];
    const newState = data.map((operation) => {
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
    initState = [...newState, ...uncheckedGuids];

    onUpdate(initState);
  };

  const { promise, resolve, reject } = Promise.withResolvers<void>();

  Promise.allSettled([
    watchLzTxApi(chainId, txHash, handleUpdate, abortController.signal).then(() => {
      debugLog("[watchLzTx] watchLzTxApi completed");
      abortController.abort();
      resolve();
    }),
    watchLzTxRpc(chainId, txHash, handleUpdate, withLzCompose, abortController.signal).then(() => {
      debugLog("[watchLzTx] watchLzTxRpc completed");
      abortController.abort();
      resolve();
    }),
  ]).then((res) => {
    if (res.every((r) => r.status === "rejected")) {
      reject(new Error("All watchLzTxApi and watchLzTxRpc failed"));
    }
  });

  return promise;
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

function getLzStatusFromApiResponse(
  operation: paths["/messages/tx/{tx}"]["get"]["responses"]["200"]["content"]["application/json"]["data"][number]
): LzStatus {
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
  if (operation.destination?.status === "SUCCEEDED") {
    destinationStatus = "confirmed";
  } else if (operation.destination?.status === "VALIDATING_TX" || operation.destination?.status === "WAITING") {
    destinationStatus = "pending";
  } else {
    destinationStatus = "failed";
  }

  let lzStatus: "pending" | "confirmed" | "failed" | undefined = undefined;
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
