import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { PriceOverrides } from "domain/synthetics/orders/simulateExecuteTxn";
import { convertTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { DecreasePositionSwapType, OrderTxnType, OrderType } from "sdk/types/orders";
import { ExternalSwapQuote } from "sdk/types/trade";
import { isDecreaseOrderType } from "sdk/utils/orders";
import { convertToContractPrice } from "sdk/utils/tokens";
import { applySlippageToMinOut, applySlippageToPrice } from "sdk/utils/trade";
import { zeroAddress, zeroHash } from "viem";

export type OrderCreatePayload = {
  orderPayload: OrderPayload;
  collateralTransferParams: CollateralTransferParams;
  simulationParams: OrderSimulationParams;
};

export type SecondaryOrderCommonParams = {
  chainId: number;
  referralCode: string | undefined;
  account: string;
  marketAddress: string;
  indexTokenAddress: string;
  swapPath: string[];
  initialCollateralAddress: string;
  targetCollateralAddress: string;
  isLong: boolean;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  allowedSlippage: number;
};

export type SecondaryDecreaseOrderParams = DecreasePositionOrderParams &
  SecondaryOrderCommonParams & {
    txnType: "create";
    allowedSlippage: number;
  };

export type SecondaryCancelOrderParams = SecondaryOrderCommonParams & {
  txnType: "cancel";
  orderType: OrderType;
  orderKey: string | undefined;
};

export type SecondaryUpdateOrderParams = SecondaryOrderCommonParams & {
  txnType: "update";
  orderType: OrderType;
  orderKey: string;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  executionFee: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
};

export type SecondaryOrderPayload = DecreasePositionOrderParams & {
  orderKey: string | undefined;
  txnType: OrderTxnType;
};

export type OrderSimulationParams = {
  primaryPriceOverrides: PriceOverrides;
};

export type CommonOrderParams<OT extends OrderType> = {
  chainId: number;
  account: string;
  executionFee: bigint;
  referralCode: string | undefined;
  allowedSlippage: number;
  orderType: OT;
  autoCancel: boolean;
};

export type CollateralParams = {
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: bigint;
  targetCollateralAddress: string;
  swapPath: string[];
  externalSwapQuote: ExternalSwapQuote | undefined;
};

export type PositionOrderParams = {
  marketAddress: string;
  indexTokenAddress: string;
  isLong: boolean;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
};

export type SwapOrderParams = CommonOrderParams<OrderType.MarketSwap | OrderType.LimitSwap> &
  CollateralParams & {
    triggerRatio: bigint | undefined;
    minOutputAmount: bigint;
  };

export type IncreasePositionOrderParams = CollateralParams &
  PositionOrderParams &
  CommonOrderParams<OrderType.MarketIncrease | OrderType.LimitIncrease | OrderType.StopIncrease>;

export type DecreasePositionOrderParams = CommonOrderParams<
  OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease
> &
  CollateralParams &
  PositionOrderParams & {
    decreasePositionSwapType: DecreasePositionSwapType;
    minOutputUsd: bigint;
  };

export type CollateralTransferParams = {
  externalSwapQuote: ExternalSwapQuote | undefined;
  tokenToSendAddress: string;
  tokenToSendAmount: bigint;
  isNativePayment: boolean;
  isNativeReceive: boolean;
  minOutputAmount: bigint;
  swapPath: string[];
  initialCollateralTokenAddress: string;
  initialCollateralAmount: bigint;
};

export type OrderPayload<OT extends OrderType = OrderType> = {
  addresses: {
    // Address types
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: string;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: bigint;
    initialCollateralDeltaAmount: bigint;
    triggerPrice: bigint;
    acceptablePrice: bigint;
    executionFee: bigint;
    callbackGasLimit: bigint;
    // TODO: branded types
    minOutputAmount: bigint;
    validFromTime: bigint;
  };
  orderType: OT;
  decreasePositionSwapType: number;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
};

export function buildSwapOrderPayload(p: SwapOrderParams): OrderCreatePayload {
  const collateralTransferParams = getCollateralTransaferParams(p);

  const orderPayload: OrderPayload = {
    addresses: {
      receiver: p.account,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
      market: zeroAddress,
      initialCollateralToken: collateralTransferParams.initialCollateralTokenAddress,
      swapPath: collateralTransferParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: collateralTransferParams.initialCollateralAmount,
      triggerPrice: p.triggerRatio ?? 0n,
      acceptablePrice: 0n,
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: collateralTransferParams.minOutputAmount,
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: collateralTransferParams.isNativeReceive,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
  };

  const simulationParams: OrderSimulationParams = {
    primaryPriceOverrides: {},
  };

  return {
    orderPayload,
    collateralTransferParams,
    simulationParams,
  };
}

export function buildIncreaseOrderPayload(p: IncreasePositionOrderParams) {
  const collateralTransferParams = getCollateralTransaferParams({ ...p, minOutputAmount: 0n });

  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  const orderPayload: OrderPayload<typeof p.orderType> = {
    addresses: {
      receiver: p.account,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
      market: p.marketAddress,
      initialCollateralToken: collateralTransferParams.initialCollateralTokenAddress,
      swapPath: collateralTransferParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralTransferParams.initialCollateralAmount,
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals),
      acceptablePrice: convertToContractPrice(
        applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong),
        indexToken.decimals
      ),
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: collateralTransferParams.minOutputAmount,
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: collateralTransferParams.isNativeReceive,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
  };

  const simulationParams: OrderSimulationParams = {
    primaryPriceOverrides: {},
  };

  if (p.triggerPrice != undefined) {
    simulationParams.primaryPriceOverrides[p.indexTokenAddress] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  return {
    orderPayload,
    collateralTransferParams,
    simulationParams,
  };
}

export function buildDecreaseOrderPayload(p: DecreasePositionOrderParams): OrderCreatePayload {
  const collateralTransferParams = getCollateralTransaferParams({
    ...p,
    minOutputAmount: p.minOutputUsd,
  });

  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  const orderPayload: OrderPayload<typeof p.orderType> = {
    addresses: {
      receiver: p.account,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
      market: p.marketAddress,
      initialCollateralToken: collateralTransferParams.initialCollateralTokenAddress,
      swapPath: collateralTransferParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: collateralTransferParams.initialCollateralAmount,
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals),
      acceptablePrice: convertToContractPrice(
        applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong),
        indexToken.decimals
      ),
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: collateralTransferParams.minOutputAmount,
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: p.decreasePositionSwapType,
    isLong: p.isLong,
    shouldUnwrapNativeToken: collateralTransferParams.isNativeReceive,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
  };

  const simulationParams: OrderSimulationParams = {
    primaryPriceOverrides: {},
  };

  if (p.triggerPrice != undefined) {
    simulationParams.primaryPriceOverrides[p.indexTokenAddress] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  return {
    orderPayload,
    collateralTransferParams,
    simulationParams,
  };
}

function getCollateralTransaferParams(p: {
  chainId: number;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: bigint;
  targetCollateralAddress: string;
  minOutputAmount: bigint;
  externalSwapQuote: ExternalSwapQuote | undefined;
  allowedSlippage: number;
  orderType: OrderType;
}) {
  const transferParams: CollateralTransferParams = {
    isNativePayment: p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS,
    isNativeReceive: p.targetCollateralAddress === NATIVE_TOKEN_ADDRESS,
    initialCollateralTokenAddress: convertTokenAddress(p.chainId, p.initialCollateralAddress, "wrapped"),
    initialCollateralAmount: p.initialCollateralDeltaAmount,
    swapPath: p.swapPath,
    externalSwapQuote: p.externalSwapQuote,
    minOutputAmount: applySlippageToMinOut(p.allowedSlippage, p.minOutputAmount),
    tokenToSendAddress: p.initialCollateralAddress,
    tokenToSendAmount: p.initialCollateralDeltaAmount,
  };

  if (isDecreaseOrderType(p.orderType)) {
    transferParams.tokenToSendAddress = zeroAddress;
    transferParams.tokenToSendAmount = 0n;
    return transferParams;
  }

  if (p.externalSwapQuote?.txnData) {
    transferParams.swapPath = [];
    transferParams.initialCollateralTokenAddress = p.targetCollateralAddress;
    transferParams.initialCollateralAmount = p.externalSwapQuote.amountOut;
    transferParams.minOutputAmount = applySlippageToMinOut(p.allowedSlippage, p.externalSwapQuote.amountOut);
  }

  return transferParams;
}
