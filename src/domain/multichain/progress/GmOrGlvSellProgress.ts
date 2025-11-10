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

type GmOrGlvSellStep = "finished";

const GM_OR_GLV_SELL_STEPS: GmOrGlvSellStep[] = ["finished"];

type GmOrGlvSellGroup = undefined;

const GM_OR_GLV_SELL_GROUPS: GmOrGlvSellGroup[] = [];

export abstract class GmOrGlvSellProgress extends MultichainTransferProgress<GmOrGlvSellStep, GmOrGlvSellGroup> {
  abstract isGlv: boolean;

  override readonly steps = GM_OR_GLV_SELL_STEPS;
  override readonly groups = GM_OR_GLV_SELL_GROUPS;
  override readonly operation = Operation.Withdrawal;

  constructor(params: {
    sourceChainId: number;
    initialTxHash: string;
    token: Token;
    amount: bigint;
    settlementChainId: number;
  }) {
    super(params);
    debugLog("GmOrGlvSellProgress constructor", this.sourceChainId, this.initialTxHash);
  }

  protected override async start() {
    debugLog("start GmOrGlvSellProgress");
    await this.watchInitialTransfer();
  }

  private async watchInitialTransfer() {
    if (!this.isFirstTimeCalling("watchInitialTransfer")) {
      return;
    }

    debugLog("watchInitialTransfer", this.sourceChainId, this.initialTxHash);

    await watchLzTx({
      chainId: this.sourceChainId,
      txHash: this.initialTxHash,
      withLzCompose: true,
      onUpdate: (operations) => {
        const operation = operations.at(0);

        if (operation?.source === "failed") {
          this.reject(
            "finished",
            new MultichainTransferProgress.errors.BridgeInFailed({
              chainId: this.sourceChainId,
              creationTx: this.initialTxHash,
              fundsLeftIn: "source",
            })
          );
          return;
        }

        if (operation?.destination === "failed") {
          this.reject(
            "finished",
            new MultichainTransferProgress.errors.BridgeInFailed({
              chainId: this.sourceChainId,
              creationTx: this.initialTxHash,
              fundsLeftIn: "lz",
            })
          );
          return;
        }

        if (operation?.lz === "failed") {
          this.reject(
            "finished",
            new MultichainTransferProgress.errors.BridgeInFailed({
              chainId: this.sourceChainId,
              creationTx: this.initialTxHash,
              fundsLeftIn: "gmx-lz",
            })
          );
          return;
        }

        if (operation?.source === "confirmed") {
          debugLog("sendBridgeIn");
        }

        if (operation?.destination === "confirmed" && operation?.lz === "confirmed") {
          debugLog("gmTopUpResolvers.resolve");

          const dstChainId = operation.destinationChainId;
          if (!dstChainId) {
            debugLog("dstChainId not found");
            return;
          }

          const composeTx = operation.lzTx;
          if (composeTx) {
            this.watchComposeTx(dstChainId, composeTx);
          }
        } else {
          debugLog("lz not successfull or not found", operation?.destination);
        }
      },
    }).catch((error: unknown) => {
      debugLog("watchInitialTransfer error", error);
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.BridgeInFailed({
          chainId: this.sourceChainId,
          creationTx: this.initialTxHash,
          fundsLeftIn: "unknown",
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
        eventNameHash: this.isGlv ? "GlvWithdrawalCreated" : "WithdrawalCreated",
      },
    });

    const withdrawalCreatedLog = logs.find(
      (log) =>
        isStringEqualInsensitive(log.address, getContract(chainId as ContractsChainId, "EventEmitter")) &&
        matchLogRequest(topics, log.topics)
    );

    if (!withdrawalCreatedLog) {
      debugLog(
        "no withdrawalCreatedLog found",
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

    const withdrawalCreatedEventData = decodeEventLog({
      abi: abis.EventEmitter,
      eventName: "EventLog2",
      topics: withdrawalCreatedLog.topics,
      data: withdrawalCreatedLog.data,
    });

    const withdrawalKey = withdrawalCreatedEventData.args.topic1;

    debugLog("withdrawal created on chain", chainId, txHash, withdrawalKey);

    await this.watchWithdrawalExecuted(chainId, withdrawalCreatedLog.blockNumber, withdrawalKey);
  }

  private async watchWithdrawalExecuted(chainId: number, fromBlock: bigint, withdrawalKey: string) {
    if (!this.isFirstTimeCalling("watchWithdrawalExecuted", [chainId, fromBlock, withdrawalKey])) {
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
          ? ["GlvWithdrawalExecuted", "GlvWithdrawalCancelled"]
          : ["WithdrawalExecuted", "WithdrawalCancelled"],
        topic1: withdrawalKey,
      },
    });

    const withdrawalExecutedLog = logs.at(0);

    if (!withdrawalExecutedLog) {
      debugLog("no withdrawalExecutedLog found");
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.ConversionFailed({
          chainId,
          operation: Operation.Withdrawal,
          operationKey: withdrawalKey,
        })
      );
      return;
    }

    if (withdrawalExecutedLog.args.eventName === "GlvWithdrawalCancelled") {
      debugLog("GlvWithdrawalCancelled");
      this.reject(
        "finished",
        new MultichainTransferProgress.errors.ConversionFailed({
          chainId,
          operation: Operation.Withdrawal,
          executionTx: withdrawalExecutedLog.transactionHash,
          operationKey: withdrawalKey,
        })
      );
      return;
    }

    debugLog("withdrawalExecutedLog");

    const sameTxLogs = await fetchLogsInTx(chainId, withdrawalExecutedLog.transactionHash);

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
          executionTx: withdrawalExecutedLog.transactionHash,
        })
      );
      return;
    }

    debugLog(
      "multichainBridgeActionLogs found",
      multichainBridgeActionLogs.map((log) => log)
    );

    if (multichainBridgeActionLogs.some((log) => log.args.eventName === "MultichainBridgeAction")) {
      await this.watchReturnTransits(chainId, withdrawalExecutedLog.transactionHash);
    }
  }

  private async watchReturnTransits(chainId: number, txHash: string) {
    if (!this.isFirstTimeCalling("watchReturnTransits", [chainId, txHash])) {
      return;
    }

    await watchLzTx({
      chainId,
      txHash,
      withLzCompose: false,
      onUpdate: (operations) => {
        for (const operation of operations) {
          if (!operation.guid) {
            continue;
          }

          if (operation.destination === "confirmed") {
            debugLog("resolve receiveBridgeOut", operation.guid);
          }
        }
      },
    }).catch((error) => {
      debugLog("watchReturnTransits error", error);
      this.reject("finished", new MultichainTransferProgress.errors.BridgeOutFailed({ chainId, executionTx: txHash }));
    });

    this.resolve("finished");
  }
}

export class GmSellTask extends GmOrGlvSellProgress {
  readonly isGlv = false;
}

export class GlvSellTask extends GmOrGlvSellProgress {
  readonly isGlv = true;
}
