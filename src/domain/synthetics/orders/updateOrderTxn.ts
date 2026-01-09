import { Abi, encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import type { SetPendingOrderUpdate } from "context/SyntheticsEvents";
import { convertToContractPrice } from "domain/synthetics/tokens";
import type { Token } from "domain/tokens";
import { abis } from "sdk/abis";
import type { ContractsChainId } from "sdk/configs/chains";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
};

export type UpdateOrderCallbacks = {
  setPendingTxns: SetPendingTransactions;
  setPendingOrderUpdate: SetPendingOrderUpdate;
};

export function createUpdateEncodedPayload({
  chainId,
  orderKey,
  sizeDeltaUsd,
  executionFee,
  indexToken,
  acceptablePrice,
  triggerPrice,
  minOutputAmount,
  autoCancel,
}: {
  chainId: ContractsChainId;
  orderKey: string;
  sizeDeltaUsd: bigint;
  executionFee?: bigint;
  indexToken?: Token;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
}) {
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall: { method: string; params: any[] }[] = [];
  if (executionFee != undefined && executionFee > 0) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, executionFee] });
  }

  multicall.push({
    method: "updateOrder",
    params: [
      orderKey,
      sizeDeltaUsd,
      acceptablePrice !== undefined ? convertToContractPrice(acceptablePrice, indexToken?.decimals || 0) : 0n,
      triggerPrice !== undefined ? convertToContractPrice(triggerPrice, indexToken?.decimals || 0) : 0n,
      minOutputAmount,
      0n,
      autoCancel,
    ],
  });

  return multicall.filter(Boolean).map((call) =>
    encodeFunctionData({
      abi: abis.ExchangeRouter as Abi,
      functionName: call!.method,
      args: call!.params,
    })
  );
}
