// ==== BASIC ORDERS ====

import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { Signer } from "ethers";
import { convertTokenAddress } from "sdk/configs/tokens";
import { MarketInfo } from "sdk/types/markets";
import { OrderType } from "sdk/types/orders";
import { ExternalSwapQuote } from "sdk/types/trade";
import { zeroAddress } from "viem";

export type CreateOrderExchangeRouterPayload = {
  addresses: {
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: string | bigint;
    initialCollateralDeltaAmount: string | bigint;
    triggerPrice: string | bigint;
    acceptablePrice: string | bigint;
    executionFee: string | bigint;
    callbackGasLimit: string | bigint;
    minOutputAmount: string | bigint;
    validFromTime: string | bigint;
  };
  orderType: number;
  decreasePositionSwapType: number;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
};

export type BaseTransactionParams = {
  chainId: number;
  signer: Signer;
  receiverAddress: string;
};

export type BaseOrderParams<OT extends OrderType> = {
  orderType: OT;
  executionFee: bigint;
  referralCode: string;
  allowedSlippage: number;
};

export type CollateralParams = {
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: bigint;
  externalSwapQuote: ExternalSwapQuote | undefined;
  minOutputAmount: bigint;
  swapPath: string[];
};

export type PositionParams = {
  marketInfo: MarketInfo;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
  isLong: boolean;
};

function getCreateOrderPayloadForSwap({
  baseParams,
  orderParams,
  collateralParams,
  limitOptions,
}: {
  baseParams: BaseTransactionParams;
  orderParams: BaseOrderParams<OrderType.MarketSwap | OrderType.LimitSwap>;
  collateralParams: CollateralParams;
  limitOptions:
    | {
        triggerRatio: bigint;
      }
    | undefined;
}) {
  const payload: CreateOrderExchangeRouterPayload = {
    addresses: {
      receiver: baseParams.receiverAddress,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
      market: zeroAddress,
      initialCollateralToken: collateralParams.initialCollateralAddress,
      swapPath: collateralParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: 0n,
      triggerPrice: 0n,
      acceptablePrice: 0n,
      executionFee: orderParams.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime: 0n,
    },
    orderType: orderParams.orderType,
    decreasePositionSwapType: 0,
    isLong: false,
    shouldUnwrapNativeToken: false,
    autoCancel: false,
    referralCode: orderParams.referralCode,
  };
}
