import { Abi, Address, encodeFunctionData } from "viem";

import { abis } from "abis";
import { getContract } from "configs/contracts";
import { Token } from "types/tokens";
import { convertToContractPrice } from "utils/tokens";

import type { GmxSdk } from "../../../index";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
  autoCancel: boolean;
};

export function updateOrderTxn(sdk: GmxSdk, p: UpdateOrderParams): Promise<Address> {
  const {
    orderKey,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    executionFee,
    indexToken,
    autoCancel,
  } = p;

  const router = getContract(sdk.chainId, "ExchangeRouter");

  const encodedPayload = createUpdateEncodedPayload({
    sdk,
    orderKey,
    sizeDeltaUsd,
    executionFee,
    indexToken,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    autoCancel,
  });

  return sdk.callContract(router, abis.ExchangeRouter as Abi, "multicall", [encodedPayload], {
    value: executionFee != undefined && executionFee > 0 ? executionFee : undefined,
  });
}

export function createUpdateEncodedPayload({
  sdk,
  orderKey,
  sizeDeltaUsd,
  executionFee,
  indexToken,
  acceptablePrice,
  triggerPrice,
  autoCancel,
  minOutputAmount,
}: {
  sdk: GmxSdk;
  orderKey: string;
  sizeDeltaUsd: bigint;
  executionFee?: bigint;
  indexToken?: Token;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
}) {
  const orderVaultAddress = getContract(sdk.chainId, "OrderVault");

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
