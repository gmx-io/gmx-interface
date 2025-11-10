import { decodeEventLog, encodeEventTopics, getAbiItem } from "viem";

import { ContractsChainId } from "config/chains";
import { Token } from "domain/tokens";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";

import { Operation } from "components/GmSwap/GmSwapBox/types";

import { fetchLogsInTx } from "./fetchLogsInTx";
import { getOrWaitLogs } from "./getOrWaitLogs";
import { debugLog, isStringEqualInsensitive, matchLogRequest } from "./LongCrossChainTask";
import { MultichainTransferProgress } from "./MultichainTransferProgress";
import { watchLzTx } from "./watchLzTx";

type GmOrGlvBuyStep = "finished";

const GM_OR_GLV_BUY_STEPS: GmOrGlvBuyStep[] = ["finished"];

type GmOrGlvBuyGroup = undefined;

const GM_OR_GLV_BUY_GROUPS: GmOrGlvBuyGroup[] = [];

export abstract class GmOrGlvBuyProgress extends MultichainTransferProgress<GmOrGlvBuyStep, GmOrGlvBuyGroup> {
  abstract isGlv: boolean;

  override readonly steps = GM_OR_GLV_BUY_STEPS;
  override readonly groups = GM_OR_GLV_BUY_GROUPS;
  override readonly operation = Operation.Deposit;

  constructor(params: {
    sourceChainId: number;
    initialTxHash: string;
    token: Token;
    amount: bigint;
    settlementChainId: number;
  }) {
    super({
      sourceChainId: params.sourceChainId,
      initialTxHash: params.initialTxHash,
      token: params.token,
      amount: params.amount,
      settlementChainId: params.settlementChainId,
    });

    debugLog("GmOrGlvBuyProgress constructor", this.sourceChainId, this.initialTxHash);
  }

  protected override async start() {
    debugLog("start GmOrGlvBuyProgress");
    await this.watchInitialTransfer();
  }

  private async watchInitialTransfer() {
    if (!this.isFirstTimeCalling("watchInitialTransfer")) {
      return;
    }

    debugLog("watchInitialTransfer", this.sourceChainId, this.initialTxHash);

    await watchLzTx(this.sourceChainId, this.initialTxHash, true, (lzStatuses) => {
      debugLog("lzStatuses", lzStatuses);
      const lzStatus = lzStatuses.at(0);

      if (lzStatus?.source === "confirmed") {
        debugLog("sendBridgeIn", lzStatuses);
      }

      debugLog("lzStatus", lzStatus);
      if (lzStatus?.destination === "confirmed" && lzStatus?.lz === "confirmed") {
        debugLog("topUpResolvers.resolve", lzStatus);

        const dstChainId = lzStatus?.destinationChainId;

        if (!dstChainId) {
          debugLog("dstChainId not found");
          return;
        }

        const composeTxs = lzStatus?.lzTx;
        if (composeTxs) {
          debugLog("watchComposeTx", dstChainId, composeTxs);
          this.watchComposeTx(dstChainId, composeTxs);
        }
      } else {
        debugLog("lz not successfull or not found", lzStatus?.destination);
      }
    }).catch((error: unknown) => {
      debugLog("watchInitialTransfer error", error);
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.BridgeInFailed({
          chainId: this.sourceChainId,
          creationTx: this.initialTxHash,
        })
      );
    });
  }

  private async watchComposeTx(chainId: number, txHash: string) {
    if (!this.isFirstTimeCalling("watchComposeTx", [chainId, txHash])) {
      return;
    }

    debugLog("watchComposeTx and waiting for receipt on chain", chainId, txHash);

    const logs = await fetchLogsInTx(chainId, txHash);

    const topics = encodeEventTopics({
      abi: abis.EventEmitter,
      eventName: "EventLog2",
      args: {
        eventNameHash: this.isGlv ? "GlvDepositCreated" : "DepositCreated",
      },
    });

    const depositCreatedLog = logs.find(
      (log) =>
        isStringEqualInsensitive(log.address, getContract(chainId as ContractsChainId, "EventEmitter")) &&
        matchLogRequest(topics, log.topics)
    );

    if (!depositCreatedLog) {
      debugLog(
        "no depositCreatedLog found",
        logs
          .filter(
            (log) =>
              isStringEqualInsensitive(log.address, getContract(chainId as ContractsChainId, "EventEmitter")) &&
              matchLogRequest(topics, log.topics)
          )
          .map((log) => log.address),
        getContract(chainId as ContractsChainId, "EventEmitter")
      );
      return;
    }

    const depositCreatedEventData = decodeEventLog({
      abi: abis.EventEmitter,
      eventName: "EventLog2",
      topics: depositCreatedLog.topics,
      data: depositCreatedLog.data,
    });

    const depositKey = depositCreatedEventData.args.topic1;

    debugLog("deposit created on chain", chainId, txHash, depositKey);

    await this.watchDepositExecuted(chainId, depositCreatedLog.blockNumber, depositKey);
  }

  private async watchDepositExecuted(chainId: number, fromBlock: bigint, depositKey: string) {
    if (!this.isFirstTimeCalling("watchDepositExecuted", [chainId, fromBlock, depositKey])) {
      return;
    }

    const logs = await getOrWaitLogs({
      chainId,
      fromBlock,
      address: getContract(chainId as ContractsChainId, "EventEmitter"),
      event: getAbiItem({
        abi: abis.EventEmitter,
        name: "EventLog2",
      }),
      args: {
        eventNameHash: this.isGlv
          ? ["GlvDepositExecuted", "GlvDepositCancelled"]
          : ["DepositExecuted", "DepositCancelled"],
        topic1: depositKey,
      },
    });

    const depositExecutedLog = logs.at(0);

    if (!depositExecutedLog) {
      debugLog("no depositExecutedLog found");
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.ConversionFailed({
          chainId,
          operation: Operation.Deposit,
          operationKey: depositKey,
        })
      );
      return;
    }

    if (depositExecutedLog.args.eventName === "GlvDepositCancelled") {
      debugLog("GlvDepositCancelled");
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.ConversionFailed({
          chainId,
          operation: Operation.Deposit,
          executionTx: depositExecutedLog.transactionHash,
          operationKey: depositKey,
        })
      );
      return;
    }

    debugLog("depositExecutedLog");

    const sameTxLogs = await fetchLogsInTx(chainId, depositExecutedLog.transactionHash);

    const passedOrFailedTopicFilter = encodeEventTopics({
      abi: abis.EventEmitter,
      eventName: "EventLog1",
      args: {
        eventNameHash: ["MultichainBridgeAction", "MultichainBridgeActionFailed"],
      },
    });

    const multichainBridgeActionLogs = sameTxLogs
      .filter(
        (log) =>
          isStringEqualInsensitive(log.address, getContract(chainId as ContractsChainId, "EventEmitter")) &&
          matchLogRequest(passedOrFailedTopicFilter, log.topics)
      )
      .map((log) =>
        decodeEventLog({
          abi: abis.EventEmitter,
          eventName: "EventLog1",
          topics: log.topics,
          data: log.data,
        })
      );

    if (!multichainBridgeActionLogs.length) {
      debugLog("no multichainBridgeActionLogs found");
      return;
    }

    if (multichainBridgeActionLogs.some((log) => log.args.eventName === "MultichainBridgeActionFailed")) {
      debugLog("MultichainBridgeActionFailed");
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.BridgeOutFailed({
          chainId,
          executionTx: depositExecutedLog.transactionHash,
        })
      );
      return;
    }

    debugLog(
      "multichainBridgeActionLogs found",
      multichainBridgeActionLogs.map((log) => log)
    );

    if (multichainBridgeActionLogs.some((log) => log.args.eventName === "MultichainBridgeAction")) {
      await this.watchReturnTransits(chainId, depositExecutedLog.transactionHash);
    }
  }

  private async watchReturnTransits(chainId: number, txHash: string) {
    if (!this.isFirstTimeCalling("watchReturnTransits", [chainId, txHash])) {
      return;
    }

    await watchLzTx(chainId, txHash, false, (lzStatuses) => {
      for (const lzStatus of lzStatuses) {
        if (!lzStatus.guid) {
          continue;
        }

        if (lzStatus.destination === "confirmed") {
          debugLog("resolve receiveBridgeOut", lzStatus.guid);
        }
      }
    }).catch((error) => {
      debugLog("watchReturnTransits error", error);
      this.reject("finished", new MultichainTransferProgress.errors.BridgeOutFailed({ chainId, executionTx: txHash }));
    });

    this.resolve("finished");
  }
}

export class GmBuyTask extends GmOrGlvBuyProgress {
  readonly isGlv = false;
}

export class GlvBuyTask extends GmOrGlvBuyProgress {
  readonly isGlv = true;
}
