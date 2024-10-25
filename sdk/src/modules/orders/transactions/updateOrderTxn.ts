import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "configs/contracts";

import type { GmxSdk } from "../../../index";
import { Token } from "types/tokens";
import { convertToContractPrice } from "utils/tokens";
import { Abi, Address, encodeFunctionData } from "viem";

export type UpdateOrderParams = {
  orderKey: string;
  indexToken?: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
};

export function updateOrderTxn(sdk: GmxSdk, p: UpdateOrderParams): Promise<Address> {
  const { orderKey, sizeDeltaUsd, triggerPrice, acceptablePrice, minOutputAmount, executionFee, indexToken } = p;

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
  });

  return sdk.callContract(router, ExchangeRouter.abi as Abi, "multicall", [encodedPayload], {
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
      convertToContractPrice(acceptablePrice, indexToken?.decimals || 0),
      convertToContractPrice(triggerPrice, indexToken?.decimals || 0),
      minOutputAmount,
      false, // autoCancel
    ],
  });

  return multicall.filter(Boolean).map((call) =>
    encodeFunctionData({
      abi: ExchangeRouter.abi as Abi,
      functionName: call!.method,
      args: call!.params,
    })
  );
}
