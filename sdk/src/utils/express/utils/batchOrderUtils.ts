import { encodeFunctionData, zeroAddress, zeroHash } from "viem";

import { abis } from "abis";
import type { ContractsChainId, SourceChainId } from "configs/chains";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "configs/express";
import type { BatchOrderTxnParams, CreateOrderPayload } from "utils/orderTransactions";
import { nowInSeconds } from "utils/time";
import { setUiFeeReceiverIsExpress } from "utils/twap/uiFeeReceiver";
import type { IRpc } from "utils/rpc";
import type { IMetrics } from "utils/metrics";
import { noopMetrics } from "utils/metrics";

import type { BuiltGlobalExpressParams } from "./globalExpressParams";
import { getGelatoRelayRouterDomain, getExpressContractAddress, hashRelayParams } from "./relayParamsUtils";
import type {
  BatchTypedData,
  ExpressTxnData,
  RawRelayParamsPayload,
  RelayParamsPayload,
  RelayParamsPayloadWithSignature,
} from "../types";

export function getBatchTypedData({
  chainId,
  signingChainId,
  batchParams,
  relayParams,
  account,
  subaccountApprovalHash,
  relayRouterAddress,
}: {
  chainId: ContractsChainId;
  signingChainId?: SourceChainId | ContractsChainId;
  batchParams: BatchOrderTxnParams;
  relayParams: RelayParamsPayload;
  account: string;
  subaccountApprovalHash?: string;
  relayRouterAddress: string;
}): BatchTypedData {
  const types = {
    Batch: [
      { name: "account", type: "address" },
      { name: "createOrderParamsList", type: "CreateOrderParams[]" },
      { name: "updateOrderParamsList", type: "UpdateOrderParams[]" },
      { name: "cancelOrderKeys", type: "bytes32[]" },
      { name: "relayParams", type: "bytes32" },
      { name: "subaccountApproval", type: "bytes32" },
    ],
    CreateOrderParams: [
      { name: "addresses", type: "CreateOrderAddresses" },
      { name: "numbers", type: "CreateOrderNumbers" },
      { name: "orderType", type: "uint256" },
      { name: "decreasePositionSwapType", type: "uint256" },
      { name: "isLong", type: "bool" },
      { name: "shouldUnwrapNativeToken", type: "bool" },
      { name: "autoCancel", type: "bool" },
      { name: "referralCode", type: "bytes32" },
      { name: "dataList", type: "bytes32[]" },
    ],
    CreateOrderAddresses: [
      { name: "receiver", type: "address" },
      { name: "cancellationReceiver", type: "address" },
      { name: "callbackContract", type: "address" },
      { name: "uiFeeReceiver", type: "address" },
      { name: "market", type: "address" },
      { name: "initialCollateralToken", type: "address" },
      { name: "swapPath", type: "address[]" },
    ],
    CreateOrderNumbers: [
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "initialCollateralDeltaAmount", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "executionFee", type: "uint256" },
      { name: "callbackGasLimit", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
    ],
    UpdateOrderParams: [
      { name: "key", type: "bytes32" },
      { name: "sizeDeltaUsd", type: "uint256" },
      { name: "acceptablePrice", type: "uint256" },
      { name: "triggerPrice", type: "uint256" },
      { name: "minOutputAmount", type: "uint256" },
      { name: "validFromTime", type: "uint256" },
      { name: "autoCancel", type: "bool" },
      { name: "executionFeeIncrease", type: "uint256" },
    ],
  };

  const domain = getGelatoRelayRouterDomain(signingChainId ?? chainId, relayRouterAddress);
  const paramsLists = getBatchParamsLists(batchParams);

  const message = {
    account: subaccountApprovalHash ? account : zeroAddress,
    createOrderParamsList: paramsLists.createOrderParamsList,
    updateOrderParamsList: paramsLists.updateOrderParamsList,
    cancelOrderKeys: paramsLists.cancelOrderKeys,
    relayParams: hashRelayParams(relayParams),
    subaccountApproval: subaccountApprovalHash ?? zeroHash,
  };

  return { domain, types, message };
}

export function buildBatchOrderCalldata({
  chainId,
  batchParams,
  relayParamsPayload,
  signature,
  account,
  srcChainId,
  subaccountApproval,
  isGmxAccount,
  deadline: overrideDeadline,
}: {
  chainId: ContractsChainId;
  batchParams: BatchOrderTxnParams;
  relayParamsPayload: RawRelayParamsPayload;
  signature: string;
  account: string;
  srcChainId?: SourceChainId;
  subaccountApproval?: { subaccount: string; [key: string]: any };
  isGmxAccount: boolean;
  deadline?: bigint;
}): ExpressTxnData & { relayRouterAddress: string } {
  const relayParams: RelayParamsPayload = {
    ...relayParamsPayload,
    deadline: overrideDeadline ?? BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
  };

  const relayParamsWithSignature: RelayParamsPayloadWithSignature = {
    ...relayParams,
    signature,
  };

  const paramsLists = getBatchParamsLists(batchParams);
  const isSubaccount = subaccountApproval !== undefined;
  const isMultichain = isGmxAccount && srcChainId !== undefined;

  const relayRouterAddress = getExpressContractAddress(chainId, {
    isSubaccount,
    isMultichain,
    scope: isSubaccount ? "subaccount" : "order",
  });

  let callData: string;

  if (isMultichain) {
    if (isSubaccount) {
      callData = encodeFunctionData({
        abi: abis.MultichainSubaccountRouter,
        functionName: "batch",
        args: [
          relayParamsWithSignature,
          subaccountApproval as any,
          account,
          BigInt(srcChainId),
          subaccountApproval.subaccount,
          paramsLists,
        ],
      });
    } else {
      callData = encodeFunctionData({
        abi: abis.MultichainOrderRouter,
        functionName: "batch",
        args: [relayParamsWithSignature, account, BigInt(srcChainId), paramsLists],
      });
    }
  } else {
    if (isSubaccount) {
      callData = encodeFunctionData({
        abi: abis.SubaccountGelatoRelayRouter,
        functionName: "batch",
        args: [
          relayParamsWithSignature,
          subaccountApproval as any,
          account,
          subaccountApproval.subaccount,
          paramsLists,
        ],
      });
    } else {
      callData = encodeFunctionData({
        abi: abis.GelatoRelayRouter,
        functionName: "batch",
        args: [relayParamsWithSignature, account, paramsLists],
      });
    }
  }

  return {
    callData,
    to: relayRouterAddress,
    feeToken: relayParamsPayload.fee.feeToken,
    feeAmount: relayParamsPayload.fee.feeAmount,
    relayRouterAddress,
  };
}

export function getBatchParamsLists(batchParams: BatchOrderTxnParams) {
  return {
    createOrderParamsList: batchParams.createOrderParams.map((p) => ({
      addresses: updateExpressOrdersAddresses(p.orderPayload.addresses),
      numbers: p.orderPayload.numbers,
      orderType: p.orderPayload.orderType,
      decreasePositionSwapType: p.orderPayload.decreasePositionSwapType,
      isLong: p.orderPayload.isLong,
      shouldUnwrapNativeToken: p.orderPayload.shouldUnwrapNativeToken,
      autoCancel: p.orderPayload.autoCancel,
      referralCode: p.orderPayload.referralCode,
      dataList: p.orderPayload.dataList,
    })),
    updateOrderParamsList: batchParams.updateOrderParams.map((p) => ({
      key: p.updatePayload.orderKey,
      sizeDeltaUsd: p.updatePayload.sizeDeltaUsd,
      acceptablePrice: p.updatePayload.acceptablePrice,
      triggerPrice: p.updatePayload.triggerPrice,
      minOutputAmount: p.updatePayload.minOutputAmount,
      validFromTime: p.updatePayload.validFromTime,
      autoCancel: p.updatePayload.autoCancel,
      executionFeeIncrease: p.updatePayload.executionFeeTopUp,
    })),
    cancelOrderKeys: batchParams.cancelOrderParams.map((p) => p.orderKey),
  };
}

function updateExpressOrdersAddresses(addresses: CreateOrderPayload["addresses"]) {
  return {
    ...addresses,
    receiver: addresses.receiver ?? zeroAddress,
    uiFeeReceiver: setUiFeeReceiverIsExpress(addresses.uiFeeReceiver, true),
  };
}

export function buildSignedBatchOrderCalldata({
  config,
  account,
  batchParams,
  relayParamsPayload,
  signature,
  isGmxAccount,
  signingChainId,
  subaccountApproval,
  deadline,
}: {
  config: BuiltGlobalExpressParams;
  account: string;
  batchParams: BatchOrderTxnParams;
  relayParamsPayload: RawRelayParamsPayload;
  signature: string;
  isGmxAccount: boolean;
  signingChainId?: number;
  subaccountApproval?: { subaccount: string; [key: string]: any };
  deadline?: bigint;
}): ExpressTxnData & { relayRouterAddress: string } {
  const srcChainId = signingChainId !== undefined && signingChainId !== config.chainId ? signingChainId : undefined;

  return buildBatchOrderCalldata({
    chainId: config.chainId,
    batchParams,
    relayParamsPayload,
    signature,
    account,
    srcChainId: srcChainId as any,
    subaccountApproval,
    isGmxAccount,
    deadline,
  });
}

export async function simulateExpressOrder({
  rpc,
  simulationOrigin,
  callData,
  to,
  stateOverride,
  metrics = noopMetrics,
}: {
  rpc: IRpc;
  simulationOrigin: string;
  callData: string;
  to: string;
  stateOverride?: Parameters<IRpc["estimateGas"]>[0]["stateOverride"];
  metrics?: IMetrics;
}): Promise<{ gasLimit: bigint }> {
  try {
    const gasLimit = await rpc.estimateGas({
      from: simulationOrigin,
      to,
      data: callData,
      value: 0n,
      stateOverride,
    });

    return { gasLimit };
  } catch (error) {
    metrics.pushError(error, "expressOrders.simulateExpressOrder");

    try {
      await rpc.call({
        from: simulationOrigin,
        to,
        data: callData,
        value: 0n,
      });
      throw error;
    } catch (callError) {
      throw callError;
    }
  }
}
