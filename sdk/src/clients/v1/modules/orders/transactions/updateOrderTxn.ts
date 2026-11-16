import { Abi, Address } from "viem";

import { abis } from "abis";
import type { GmxSdk } from "clients/v1";
import { getContract } from "configs/contracts";
import { DecreasePositionSwapType, OrderType } from "utils/orders/types";
import {
  buildUpdateOrderMulticall,
  buildUpdateOrderPayload,
  encodeExchangeRouterMulticall,
} from "utils/orderTransactions/utils";
import { Token } from "utils/tokens/types";

export type UpdateOrderParams = {
  orderKey: string;
  orderType: OrderType;
  indexToken: Token;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  decreasePositionSwapType: DecreasePositionSwapType;
  // used to top-up execution fee for frozen orders
  executionFee?: bigint;
  autoCancel: boolean;
};

export function updateOrderTxn(sdk: GmxSdk, p: UpdateOrderParams): Promise<Address> {
  const {
    orderKey,
    orderType,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    executionFee,
    indexToken,
    autoCancel,
    decreasePositionSwapType,
  } = p;

  const router = getContract(sdk.chainId, "ExchangeRouter");

  const encodedPayload = createUpdateEncodedPayload({
    sdk,
    orderKey,
    orderType,
    sizeDeltaUsd,
    executionFee,
    indexToken,
    acceptablePrice,
    triggerPrice,
    minOutputAmount,
    autoCancel,
    decreasePositionSwapType,
  });

  return sdk.callContract(router, abis.ExchangeRouter as Abi, "multicall", [encodedPayload], {
    value: executionFee != undefined && executionFee > 0 ? executionFee : undefined,
  });
}

export function createUpdateEncodedPayload({
  sdk,
  orderKey,
  orderType,
  sizeDeltaUsd,
  executionFee,
  indexToken,
  acceptablePrice,
  triggerPrice,
  autoCancel,
  minOutputAmount,
  decreasePositionSwapType,
}: {
  sdk: GmxSdk;
  orderKey: string;
  orderType: OrderType;
  sizeDeltaUsd: bigint;
  executionFee?: bigint;
  indexToken: Token;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
  decreasePositionSwapType: DecreasePositionSwapType;
}) {
  const updateTxn = buildUpdateOrderPayload({
    chainId: sdk.chainId,
    indexTokenAddress: indexToken.address,
    orderKey,
    orderType,
    sizeDeltaUsd,
    triggerPrice,
    acceptablePrice,
    minOutputAmount,
    autoCancel,
    validFromTime: 0n,
    decreasePositionSwapType,
    executionFeeTopUp: executionFee ?? 0n,
  });
  const { multicall } = buildUpdateOrderMulticall(updateTxn);
  const { encodedMulticall } = encodeExchangeRouterMulticall(sdk.chainId, multicall);

  return encodedMulticall;
}
