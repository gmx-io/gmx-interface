import uniq from "lodash/uniq";
import { encodeFunctionData, zeroAddress, zeroHash } from "viem";

import ExchangeRouterAbi from "abis/ExchangeRouter";
import { abis } from "abis/index";
import ERC20ABI from "abis/Token";
import { ContractsChainId, getExcessiveExecutionFee, getHighExecutionFee } from "configs/chains";
import { getContract } from "configs/contracts";
import { convertTokenAddress, getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { ExecutionFee } from "utils/fees/types";
import { expandDecimals, MaxUint256, USD_DECIMALS } from "utils/numbers";
import { getByKey } from "utils/objects";
import { isIncreaseOrderType, isSwapOrderType } from "utils/orders";
import { DecreasePositionSwapType, OrderType } from "utils/orders/types";
import { convertToContractPrice, convertToUsd } from "utils/tokens";
import { ContractPrice, ERC20Address, TokensData } from "utils/tokens/types";
import { applySlippageToMinOut, applySlippageToPrice } from "utils/trade";
import { ExternalSwapQuote } from "utils/trade/types";
import { getTwapValidFromTime } from "utils/twap";
import { TwapOrderParams } from "utils/twap/types";
import { createTwapUiFeeReceiver } from "utils/twap/uiFeeReceiver";

export type ExchangeRouterCall = {
  method: string;
  params: any[];
};

export type NativeTwapOrderParams = {
  /** The single order payload with PER-ORDER amounts (the contract divides collateral internally) */
  createOrderTxnParams: CreateOrderTxnParams<
    SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams
  >;
  /** Number of TWAP sub-orders */
  twapCount: number;
  /** Interval in seconds between sub-orders */
  intervalSeconds: number;
};

export type BatchOrderTxnParams = {
  createOrderParams: CreateOrderTxnParams<
    SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams
  >[];
  updateOrderParams: UpdateOrderTxnParams[];
  cancelOrderParams: CancelOrderTxnParams[];
  /** When set, uses the native createTwapOrder endpoint instead of N separate createOrder calls */
  nativeTwapParams?: NativeTwapOrderParams;
};

export type CreateOrderTxnParams<
  TParams extends SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams,
> = {
  params: TParams;
  orderPayload: CreateOrderPayload;
  tokenTransfersParams: TokenTransfersParams | undefined;
};

export type UpdateOrderTxnParams = {
  params: UpdateOrderParams;
  updatePayload: UpdateOrderPayload;
};

export type CancelOrderTxnParams = {
  orderKey: string;
};

export type CreateOrderPayload = {
  addresses: {
    receiver: string | undefined;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: ERC20Address;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: bigint;
    /**
     * For express orders initialCollateralDeltaAmount will be transfered from user wallet to order vault in relay router logic,
     * for default orders - this field will be ignored in contracts and settled by actual value reveived in order vault
     * */
    initialCollateralDeltaAmount: bigint;
    triggerPrice: ContractPrice | 0n;
    acceptablePrice: ContractPrice | 0n;
    executionFee: bigint;
    callbackGasLimit: bigint;
    minOutputAmount: bigint;
    validFromTime: bigint;
  };
  orderType: OrderType;
  decreasePositionSwapType: DecreasePositionSwapType;
  isLong: boolean;
  shouldUnwrapNativeToken: boolean;
  autoCancel: boolean;
  referralCode: string;
  dataList: string[];
};

export type UpdateOrderParams = {
  chainId: ContractsChainId;
  indexTokenAddress: string;
  orderKey: string;
  orderType: OrderType;
  sizeDeltaUsd: bigint;
  triggerPrice: bigint;
  acceptablePrice: bigint;
  minOutputAmount: bigint;
  autoCancel: boolean;
  validFromTime: bigint;
  // used to top-up execution fee for frozen orders
  executionFeeTopUp: bigint;
};

export type UpdateOrderPayload = {
  orderKey: string;
  sizeDeltaUsd: bigint;
  triggerPrice: ContractPrice;
  acceptablePrice: ContractPrice;
  minOutputAmount: bigint;
  autoCancel: boolean;
  validFromTime: bigint;
  // used to top-up execution fee for frozen orders
  executionFeeTopUp: bigint;
};

export type TokenTransfersParams = {
  // Whether the payment token is the chain's native token (e.g. ETH for Ethereum)
  isNativePayment: boolean;
  // Whether the receive token is the chain's native token (e.g. ETH for Ethereum)
  isNativeReceive: boolean;
  tokenTransfers: TokenTransfer[];
  value: bigint;
  payTokenAddress: string;
  payTokenAmount: bigint;
  initialCollateralTokenAddress: ERC20Address;
  initialCollateralDeltaAmount: bigint;
  minOutputAmount: bigint;
  swapPath: string[];
  externalCalls: ExternalCallsPayload | undefined;
};

export type TokenTransfer = {
  tokenAddress: string;
  destination: string;
  amount: bigint;
};

export type ExternalCallsPayload = {
  sendTokens: ERC20Address[];
  sendAmounts: bigint[];
  externalCallTargets: string[];
  externalCallDataList: string[];
  refundTokens: string[];
  refundReceivers: string[];
};

export type CommonOrderParams = {
  chainId: ContractsChainId;
  receiver: string | undefined;
  executionFeeAmount: bigint;
  executionGasLimit: bigint;
  referralCode: string | undefined;
  uiFeeReceiver: string | undefined;
  allowedSlippage: number;
  autoCancel: boolean;
  validFromTime: bigint | undefined;
};

export type PositionOrderParams = {
  marketAddress: string;
  indexTokenAddress: string;
  isLong: boolean;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
};

export type SwapOrderParams = CommonOrderParams & {
  // Token that the user pays with
  payTokenAddress: string;
  payTokenAmount: bigint;
  // Token that the user receives
  receiveTokenAddress: string;
  swapPath: string[];
  externalSwapQuote: ExternalSwapQuote | undefined;
  minOutputAmount: bigint;
  expectedOutputAmount?: bigint;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  triggerRatio: bigint | undefined;
};

export type IncreasePositionOrderParams = CommonOrderParams &
  PositionOrderParams & {
    // Token that the user pays with
    payTokenAddress: string;
    payTokenAmount: bigint;
    swapPath: string[];
    collateralDeltaAmount: bigint;
    // Target collateral for the position
    collateralTokenAddress: string;
    externalSwapQuote: ExternalSwapQuote | undefined;
    orderType: OrderType.MarketIncrease | OrderType.LimitIncrease | OrderType.StopIncrease;
  };

export type DecreasePositionOrderParams = CommonOrderParams &
  PositionOrderParams & {
    // Collateral of the position
    collateralTokenAddress: string;
    collateralDeltaAmount: bigint;
    swapPath: string[];
    externalSwapQuote: undefined;
    // Token that the user receives
    receiveTokenAddress: string;
    minOutputUsd: bigint;
    decreasePositionSwapType: DecreasePositionSwapType;
    orderType: OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease;
  };

export function buildSwapOrderPayload(p: SwapOrderParams): CreateOrderTxnParams<SwapOrderParams> {
  const tokenTransfersParams = buildTokenTransfersParamsForIncreaseOrSwap(p);

  const orderPayload: CreateOrderPayload = {
    addresses: {
      receiver: p.receiver,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: p.uiFeeReceiver ?? zeroAddress,
      market: zeroAddress,
      initialCollateralToken: tokenTransfersParams.initialCollateralTokenAddress,
      swapPath: tokenTransfersParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount: tokenTransfersParams.initialCollateralDeltaAmount,
      // triggerRatio of limit swaps is used in trade history
      triggerPrice: (p.triggerRatio as ContractPrice) ?? 0n,
      acceptablePrice: 0n,
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: applySlippageToMinOut(p.allowedSlippage, tokenTransfersParams.minOutputAmount),
      validFromTime: p.validFromTime ?? 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: tokenTransfersParams.isNativePayment || tokenTransfersParams.isNativeReceive,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
    dataList: [],
  };

  return {
    params: p,
    orderPayload,
    tokenTransfersParams,
  };
}

export function buildIncreaseOrderPayload(
  p: IncreasePositionOrderParams
): CreateOrderTxnParams<IncreasePositionOrderParams> {
  const tokenTransfersParams = buildTokenTransfersParamsForIncreaseOrSwap({
    ...p,
    minOutputAmount: 0n,
    receiveTokenAddress: undefined,
  });

  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  let acceptablePrice: ContractPrice;
  if (p.acceptablePrice === MaxUint256) {
    acceptablePrice = MaxUint256 as ContractPrice;
  } else {
    acceptablePrice = convertToContractPrice(
      applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong),
      indexToken.decimals
    );
  }

  let triggerPrice: ContractPrice;
  if (p.triggerPrice === MaxUint256) {
    triggerPrice = MaxUint256 as ContractPrice;
  } else {
    triggerPrice = convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals);
  }

  const orderPayload: CreateOrderPayload = {
    addresses: {
      receiver: p.receiver,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: p.uiFeeReceiver ?? zeroAddress,
      market: p.marketAddress,
      initialCollateralToken: tokenTransfersParams.initialCollateralTokenAddress,
      swapPath: tokenTransfersParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: tokenTransfersParams.initialCollateralDeltaAmount,
      triggerPrice,
      acceptablePrice,
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: applySlippageToMinOut(p.allowedSlippage, tokenTransfersParams.minOutputAmount),
      validFromTime: p.validFromTime ?? 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: tokenTransfersParams.isNativePayment,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
    dataList: [],
  };

  return {
    params: p,
    orderPayload,
    tokenTransfersParams,
  };
}

export function buildDecreaseOrderPayload(
  p: DecreasePositionOrderParams
): CreateOrderTxnParams<DecreasePositionOrderParams> {
  const indexToken = getToken(p.chainId, p.indexTokenAddress);
  const tokenTransfersParams = buildTokenTransfersParamsForDecrease(p);

  let acceptablePrice: ContractPrice;
  if (p.acceptablePrice === MaxUint256) {
    acceptablePrice = MaxUint256 as ContractPrice;
  } else {
    acceptablePrice = convertToContractPrice(
      applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong),
      indexToken.decimals
    );
  }

  let triggerPrice: ContractPrice;
  if (p.triggerPrice === MaxUint256) {
    triggerPrice = MaxUint256 as ContractPrice;
  } else {
    triggerPrice = convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals);
  }

  const orderPayload: CreateOrderPayload = {
    addresses: {
      receiver: p.receiver,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: p.uiFeeReceiver ?? zeroAddress,
      market: p.marketAddress,
      initialCollateralToken: tokenTransfersParams.initialCollateralTokenAddress,
      swapPath: tokenTransfersParams.swapPath,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: tokenTransfersParams.initialCollateralDeltaAmount,
      triggerPrice,
      acceptablePrice,
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: applySlippageToMinOut(p.allowedSlippage, tokenTransfersParams.minOutputAmount),
      validFromTime: p.validFromTime ?? 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: p.decreasePositionSwapType,
    isLong: p.isLong,
    shouldUnwrapNativeToken: p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
    dataList: [],
  };

  return {
    params: p,
    orderPayload,
    tokenTransfersParams,
  };
}

export function buildTwapOrdersPayloads<
  T extends SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams,
>(p: T, twapParams: TwapOrderParams): CreateOrderTxnParams<T>[] {
  const uiFeeReceiver = createTwapUiFeeReceiver({ numberOfParts: twapParams.numberOfParts });

  if (isSwapOrderType(p.orderType)) {
    return Array.from({ length: twapParams.numberOfParts }, (_, i) => {
      const params = p as SwapOrderParams;

      return buildSwapOrderPayload({
        chainId: params.chainId,
        receiver: params.receiver,
        executionGasLimit: params.executionGasLimit,
        payTokenAddress: params.payTokenAddress,
        receiveTokenAddress: params.receiveTokenAddress,
        swapPath: params.swapPath,
        externalSwapQuote: undefined,
        minOutputAmount: 0n,
        triggerRatio: params.triggerRatio,
        referralCode: params.referralCode,
        autoCancel: params.autoCancel,
        allowedSlippage: 0,
        ...(params.expectedOutputAmount !== undefined && {
          expectedOutputAmount: params.expectedOutputAmount / BigInt(twapParams.numberOfParts),
        }),
        payTokenAmount: params.payTokenAmount / BigInt(twapParams.numberOfParts),
        executionFeeAmount: params.executionFeeAmount / BigInt(twapParams.numberOfParts),
        validFromTime: getTwapValidFromTime(twapParams.duration, twapParams.numberOfParts, i),
        orderType: OrderType.LimitSwap,
        uiFeeReceiver,
      }) as CreateOrderTxnParams<T>;
    });
  }

  if (isIncreaseOrderType(p.orderType)) {
    return Array.from({ length: twapParams.numberOfParts }, (_, i) => {
      const params = p as IncreasePositionOrderParams;

      const acceptablePrice = params.isLong ? MaxUint256 : 0n;
      const triggerPrice = acceptablePrice;

      return buildIncreaseOrderPayload({
        chainId: params.chainId,
        receiver: params.receiver,
        executionGasLimit: params.executionGasLimit,
        referralCode: params.referralCode,
        autoCancel: params.autoCancel,
        swapPath: params.swapPath,
        externalSwapQuote: undefined,
        marketAddress: params.marketAddress,
        indexTokenAddress: params.indexTokenAddress,
        isLong: params.isLong,
        sizeDeltaUsd: params.sizeDeltaUsd / BigInt(twapParams.numberOfParts),
        sizeDeltaInTokens: params.sizeDeltaInTokens / BigInt(twapParams.numberOfParts),
        payTokenAddress: params.payTokenAddress,
        allowedSlippage: 0,
        payTokenAmount: params.payTokenAmount / BigInt(twapParams.numberOfParts),
        collateralTokenAddress: params.collateralTokenAddress,
        collateralDeltaAmount: params.collateralDeltaAmount / BigInt(twapParams.numberOfParts),
        executionFeeAmount: params.executionFeeAmount / BigInt(twapParams.numberOfParts),
        validFromTime: getTwapValidFromTime(twapParams.duration, twapParams.numberOfParts, i),
        orderType: OrderType.LimitIncrease,
        acceptablePrice,
        triggerPrice,
        uiFeeReceiver,
      }) as CreateOrderTxnParams<T>;
    });
  }

  return Array.from({ length: twapParams.numberOfParts }, (_, i) => {
    const params = p as DecreasePositionOrderParams;

    const acceptablePrice = !params.isLong ? MaxUint256 : 0n;
    const triggerPrice = acceptablePrice;

    return buildDecreaseOrderPayload({
      chainId: params.chainId,
      receiver: params.receiver,
      executionGasLimit: params.executionGasLimit,
      referralCode: params.referralCode,
      autoCancel: params.autoCancel,
      swapPath: params.swapPath,
      externalSwapQuote: undefined,
      marketAddress: params.marketAddress,
      indexTokenAddress: params.indexTokenAddress,
      isLong: params.isLong,
      collateralTokenAddress: params.collateralTokenAddress,
      collateralDeltaAmount: params.collateralDeltaAmount / BigInt(twapParams.numberOfParts),
      sizeDeltaUsd: params.sizeDeltaUsd / BigInt(twapParams.numberOfParts),
      sizeDeltaInTokens: params.sizeDeltaInTokens / BigInt(twapParams.numberOfParts),
      executionFeeAmount: params.executionFeeAmount / BigInt(twapParams.numberOfParts),
      validFromTime: getTwapValidFromTime(twapParams.duration, twapParams.numberOfParts, i),
      orderType: OrderType.LimitDecrease,
      acceptablePrice,
      triggerPrice,
      allowedSlippage: 0,
      uiFeeReceiver,
      minOutputUsd: params.minOutputUsd / BigInt(twapParams.numberOfParts),
      receiveTokenAddress: params.receiveTokenAddress,
      decreasePositionSwapType: params.decreasePositionSwapType,
    }) as CreateOrderTxnParams<T>;
  });
}

/**
 * Builds a single order payload for the native `createTwapOrder` contract method.
 * The contract expects per-order values for executionFee and sizeDeltaUsd in the order params.
 * It does a single `recordTransferIn` and divides collateral by twapCount internally.
 * It checks that the total WNT transferred >= `executionFee * twapCount`.
 *
 * NOTE: The builder functions (buildSwapOrderPayload, etc.) create token transfers with
 * per-order execution fee amounts. The `buildCreateTwapOrderMulticall` function is responsible
 * for scaling up the WNT transfer to the total execution fee before sending to the vault.
 */
export function buildNativeTwapOrderPayload<
  T extends SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams,
>(p: T, twapParams: TwapOrderParams): NativeTwapOrderParams {
  const uiFeeReceiver = createTwapUiFeeReceiver({ numberOfParts: twapParams.numberOfParts });
  const numberOfParts = BigInt(twapParams.numberOfParts);
  const intervalSeconds = getTwapIntervalSeconds(twapParams);
  const startValidFromTime = BigInt(Math.ceil(Date.now() / 1000));

  if (isSwapOrderType(p.orderType)) {
    const params = p as SwapOrderParams;

    // Build a per-order payload (the contract expects per-order executionFee)
    const perOrderPayload = buildSwapOrderPayload({
      chainId: params.chainId,
      receiver: params.receiver,
      executionGasLimit: params.executionGasLimit,
      payTokenAddress: params.payTokenAddress,
      receiveTokenAddress: params.receiveTokenAddress,
      swapPath: params.swapPath,
      externalSwapQuote: undefined,
      minOutputAmount: 0n,
      triggerRatio: params.triggerRatio,
      referralCode: params.referralCode,
      autoCancel: params.autoCancel,
      allowedSlippage: 0,
      ...(params.expectedOutputAmount !== undefined && {
        expectedOutputAmount: params.expectedOutputAmount / numberOfParts,
      }),
      // Per-order pay amount for token transfer calculation
      payTokenAmount: params.payTokenAmount,
      // Per-order execution fee (contract multiplies internally for total check)
      executionFeeAmount: params.executionFeeAmount / numberOfParts,
      validFromTime: startValidFromTime,
      orderType: OrderType.LimitSwap,
      uiFeeReceiver,
    });

    return {
      createOrderTxnParams: perOrderPayload as CreateOrderTxnParams<
        SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams
      >,
      twapCount: twapParams.numberOfParts,
      intervalSeconds,
    };
  }

  if (isIncreaseOrderType(p.orderType)) {
    const params = p as IncreasePositionOrderParams;
    const acceptablePrice = params.isLong ? MaxUint256 : 0n;
    const triggerPrice = acceptablePrice;

    const perOrderPayload = buildIncreaseOrderPayload({
      chainId: params.chainId,
      receiver: params.receiver,
      executionGasLimit: params.executionGasLimit,
      referralCode: params.referralCode,
      autoCancel: params.autoCancel,
      swapPath: params.swapPath,
      externalSwapQuote: undefined,
      marketAddress: params.marketAddress,
      indexTokenAddress: params.indexTokenAddress,
      isLong: params.isLong,
      // Per-order values
      sizeDeltaUsd: params.sizeDeltaUsd / numberOfParts,
      sizeDeltaInTokens: params.sizeDeltaInTokens / numberOfParts,
      payTokenAddress: params.payTokenAddress,
      allowedSlippage: 0,
      // Total pay amount - contract divides collateral internally
      payTokenAmount: params.payTokenAmount,
      collateralTokenAddress: params.collateralTokenAddress,
      collateralDeltaAmount: params.collateralDeltaAmount / numberOfParts,
      // Per-order execution fee
      executionFeeAmount: params.executionFeeAmount / numberOfParts,
      validFromTime: startValidFromTime,
      orderType: OrderType.LimitIncrease,
      acceptablePrice,
      triggerPrice,
      uiFeeReceiver,
    });

    return {
      createOrderTxnParams: perOrderPayload as CreateOrderTxnParams<
        SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams
      >,
      twapCount: twapParams.numberOfParts,
      intervalSeconds,
    };
  }

  // Decrease order
  const params = p as DecreasePositionOrderParams;
  const acceptablePrice = !params.isLong ? MaxUint256 : 0n;
  const triggerPrice = acceptablePrice;

  const perOrderPayload = buildDecreaseOrderPayload({
    chainId: params.chainId,
    receiver: params.receiver,
    executionGasLimit: params.executionGasLimit,
    referralCode: params.referralCode,
    autoCancel: params.autoCancel,
    swapPath: params.swapPath,
    externalSwapQuote: undefined,
    marketAddress: params.marketAddress,
    indexTokenAddress: params.indexTokenAddress,
    isLong: params.isLong,
    collateralTokenAddress: params.collateralTokenAddress,
    // Per-order values
    collateralDeltaAmount: params.collateralDeltaAmount / numberOfParts,
    sizeDeltaUsd: params.sizeDeltaUsd / numberOfParts,
    sizeDeltaInTokens: params.sizeDeltaInTokens / numberOfParts,
    // Per-order execution fee
    executionFeeAmount: params.executionFeeAmount / numberOfParts,
    validFromTime: startValidFromTime,
    orderType: OrderType.LimitDecrease,
    acceptablePrice,
    triggerPrice,
    allowedSlippage: 0,
    uiFeeReceiver,
    minOutputUsd: params.minOutputUsd / numberOfParts,
    receiveTokenAddress: params.receiveTokenAddress,
    decreasePositionSwapType: params.decreasePositionSwapType,
  });

  return {
    createOrderTxnParams: perOrderPayload as CreateOrderTxnParams<
      SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams
    >,
    twapCount: twapParams.numberOfParts,
    intervalSeconds,
  };
}

function getTwapIntervalSeconds(twapParams: TwapOrderParams): number {
  const totalDurationSeconds = twapParams.duration.hours * 3600 + twapParams.duration.minutes * 60;
  return Math.floor(totalDurationSeconds / (twapParams.numberOfParts - 1));
}

export function getIsTwapOrderPayload(p: CreateOrderPayload) {
  return p.numbers.validFromTime !== 0n;
}

export function buildUpdateOrderPayload(p: UpdateOrderParams): UpdateOrderTxnParams {
  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  return {
    params: p,
    updatePayload: {
      orderKey: p.orderKey,
      sizeDeltaUsd: p.sizeDeltaUsd,
      triggerPrice: isSwapOrderType(p.orderType)
        ? (p.triggerPrice as ContractPrice)
        : convertToContractPrice(p.triggerPrice, indexToken.decimals),
      acceptablePrice: convertToContractPrice(p.acceptablePrice, indexToken.decimals),
      minOutputAmount: p.minOutputAmount,
      autoCancel: p.autoCancel,
      validFromTime: 0n,
      executionFeeTopUp: p.executionFeeTopUp,
    },
  };
}

export function getBatchTotalExecutionFee({
  batchParams,
  tokensData,
  chainId,
  allowEmptyBatch = false,
}: {
  batchParams: BatchOrderTxnParams;
  tokensData: TokensData;
  chainId: number;
  allowEmptyBatch?: boolean;
}): ExecutionFee | undefined {
  if (getIsEmptyBatch(batchParams) && !allowEmptyBatch) {
    return undefined;
  }

  let feeTokenAmount = 0n;
  let gasLimit = 0n;

  const wnt = getByKey(tokensData, getWrappedToken(chainId).address);

  if (!wnt) {
    return undefined;
  }

  // Account for native TWAP order: per-order fee * twapCount
  if (batchParams.nativeTwapParams) {
    const { createOrderTxnParams, twapCount } = batchParams.nativeTwapParams;
    feeTokenAmount += createOrderTxnParams.orderPayload.numbers.executionFee * BigInt(twapCount);
    gasLimit += createOrderTxnParams.params.executionGasLimit * BigInt(twapCount);
  }

  for (const co of batchParams.createOrderParams) {
    feeTokenAmount += co.orderPayload.numbers.executionFee;
    gasLimit += co.params.executionGasLimit;
  }

  for (const uo of batchParams.updateOrderParams) {
    feeTokenAmount += uo.updatePayload.executionFeeTopUp;
  }

  const feeUsd = convertToUsd(feeTokenAmount, wnt.decimals, wnt.prices.maxPrice)!;
  const isFeeHigh = feeUsd > expandDecimals(getHighExecutionFee(chainId as ContractsChainId), USD_DECIMALS);
  const isFeeVeryHigh = feeUsd > expandDecimals(getExcessiveExecutionFee(chainId as ContractsChainId), USD_DECIMALS);

  return {
    feeTokenAmount,
    gasLimit,
    feeUsd,
    feeToken: wnt,
    isFeeHigh,
    isFeeVeryHigh,
  };
}

export function getBatchTotalPayCollateralAmount(batchParams: BatchOrderTxnParams) {
  const payAmounts: { [tokenAddress: string]: bigint } = {};

  // Account for native TWAP order collateral
  if (batchParams.nativeTwapParams) {
    const { createOrderTxnParams } = batchParams.nativeTwapParams;
    const payTokenAddress = createOrderTxnParams.tokenTransfersParams?.payTokenAddress;
    const payTokenAmount = createOrderTxnParams.tokenTransfersParams?.payTokenAmount;

    if (payTokenAddress && payTokenAmount) {
      payAmounts[payTokenAddress] = (payAmounts[payTokenAddress] ?? 0n) + payTokenAmount;
    }
  }

  for (const co of batchParams.createOrderParams) {
    const payTokenAddress = co.tokenTransfersParams?.payTokenAddress;
    const payTokenAmount = co.tokenTransfersParams?.payTokenAmount;

    if (payTokenAddress && payTokenAmount) {
      payAmounts[payTokenAddress] = (payAmounts[payTokenAddress] ?? 0n) + payTokenAmount;
    }
  }

  return payAmounts;
}

export function getBatchExternalSwapGasLimit(batchParams: BatchOrderTxnParams) {
  return batchParams.createOrderParams.reduce((acc, co) => {
    const externalSwapQuote = (co.params as IncreasePositionOrderParams | SwapOrderParams).externalSwapQuote;

    if (externalSwapQuote) {
      return acc + externalSwapQuote.txnData.estimatedGas;
    }

    return acc;
  }, 0n);
}

export function buildTokenTransfersParamsForDecrease({
  chainId,
  executionFeeAmount,
  collateralTokenAddress,
  collateralDeltaAmount,
  swapPath,
  minOutputUsd,
  receiveTokenAddress,
}: {
  chainId: ContractsChainId;
  executionFeeAmount: bigint;
  collateralTokenAddress: string;
  collateralDeltaAmount: bigint;
  receiveTokenAddress: string;
  swapPath: string[];
  minOutputUsd: bigint;
}): TokenTransfersParams {
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const { tokenTransfers, value } = combineTransfers([
    {
      tokenAddress: NATIVE_TOKEN_ADDRESS,
      destination: orderVaultAddress,
      amount: executionFeeAmount,
    },
  ]);

  return {
    isNativePayment: false,
    isNativeReceive: receiveTokenAddress === NATIVE_TOKEN_ADDRESS,
    initialCollateralTokenAddress: convertTokenAddress(chainId, collateralTokenAddress, "wrapped"),
    initialCollateralDeltaAmount: collateralDeltaAmount,
    tokenTransfers,
    payTokenAddress: zeroAddress,
    payTokenAmount: 0n,
    minOutputAmount: minOutputUsd,
    swapPath,
    value,
    externalCalls: undefined,
  };
}

export function buildTokenTransfersParamsForIncreaseOrSwap({
  chainId,
  receiver,
  payTokenAddress,
  payTokenAmount,
  receiveTokenAddress,
  executionFeeAmount,
  externalSwapQuote,
  minOutputAmount,
  swapPath,
}: {
  chainId: ContractsChainId;
  receiver: string | undefined;
  payTokenAddress: string;
  payTokenAmount: bigint;
  receiveTokenAddress: string | undefined;
  executionFeeAmount: bigint;
  externalSwapQuote: ExternalSwapQuote | undefined;
  minOutputAmount: bigint;
  swapPath: string[];
}): TokenTransfersParams {
  const isNativePayment = payTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = receiveTokenAddress === NATIVE_TOKEN_ADDRESS;
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const externalHandlerAddress = getContract(chainId, "ExternalHandler");

  let finalPayTokenAmount = payTokenAmount;

  const { tokenTransfers, value } = combineTransfers([
    {
      tokenAddress: NATIVE_TOKEN_ADDRESS,
      destination: orderVaultAddress,
      amount: executionFeeAmount,
    },
    {
      tokenAddress: payTokenAddress,
      destination: externalSwapQuote ? externalHandlerAddress : orderVaultAddress,
      amount: payTokenAmount,
    },
  ]);

  let initialCollateralTokenAddress = convertTokenAddress(chainId, payTokenAddress, "wrapped");
  let initialCollateralDeltaAmount = payTokenAmount;
  let externalCalls: ExternalCallsPayload | undefined;

  if (externalSwapQuote && receiver) {
    /**
     * External swap will be executed before order creation logic,
     * so the final order has no swap parameters and must treat the outToken address as an initial collateral
     * */
    initialCollateralTokenAddress = convertTokenAddress(chainId, externalSwapQuote.outTokenAddress, "wrapped");
    initialCollateralDeltaAmount = 0n;
    externalCalls = getExternalCallsPayload({
      chainId,
      account: receiver,
      quote: externalSwapQuote,
    });
    finalPayTokenAmount = externalSwapQuote.amountIn;
  }

  return {
    isNativePayment,
    isNativeReceive,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount,
    tokenTransfers,
    payTokenAddress,
    payTokenAmount: finalPayTokenAmount,
    minOutputAmount,
    swapPath,
    value,
    externalCalls,
  };
}

export function getBatchExternalCalls(batchParams: BatchOrderTxnParams): ExternalCallsPayload {
  const externalCalls: ExternalCallsPayload[] = [];

  for (const createOrderParams of batchParams.createOrderParams) {
    if (createOrderParams.tokenTransfersParams?.externalCalls) {
      externalCalls.push(createOrderParams.tokenTransfersParams.externalCalls);
    }
  }

  return combineExternalCalls(externalCalls);
}

export function combineExternalCalls(externalCalls: ExternalCallsPayload[]): ExternalCallsPayload {
  const sendTokensMap: { [tokenAddress: string]: bigint } = {};
  const refundTokensMap: { [tokenAddress: string]: string } = {};
  const externalCallTargets: string[] = [];
  const externalCallDataList: string[] = [];

  for (const call of externalCalls) {
    for (const [index, tokenAddress] of call.sendTokens.entries()) {
      sendTokensMap[tokenAddress] = (sendTokensMap[tokenAddress] ?? 0n) + call.sendAmounts[index];
    }

    for (const [index, tokenAddress] of call.refundTokens.entries()) {
      refundTokensMap[tokenAddress] = call.refundReceivers[index];
    }

    externalCallTargets.push(...call.externalCallTargets);
    externalCallDataList.push(...call.externalCallDataList);
  }

  return {
    sendTokens: Object.keys(sendTokensMap) as ERC20Address[],
    sendAmounts: Object.values(sendTokensMap),
    externalCallTargets,
    externalCallDataList,
    refundReceivers: Object.values(refundTokensMap),
    refundTokens: Object.keys(refundTokensMap),
  };
}

export function getEmptyExternalCallsPayload(): ExternalCallsPayload {
  return {
    sendTokens: [],
    sendAmounts: [],
    externalCallTargets: [],
    externalCallDataList: [],
    refundReceivers: [],
    refundTokens: [],
  };
}

export function getExternalCallsPayload({
  chainId,
  account,
  quote,
}: {
  chainId: number;
  account: string;
  quote: ExternalSwapQuote;
}): ExternalCallsPayload {
  const inTokenAddress = convertTokenAddress(chainId, quote.inTokenAddress, "wrapped");
  const outTokenAddress = convertTokenAddress(chainId, quote.outTokenAddress, "wrapped");
  const wntAddress = getWrappedToken(chainId).address;

  const refundTokens = uniq([inTokenAddress, outTokenAddress, wntAddress]);

  const payload: ExternalCallsPayload = {
    sendTokens: [inTokenAddress],
    sendAmounts: [quote.amountIn],
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens,
    refundReceivers: Array.from({ length: refundTokens.length }, () => account),
  };

  if (quote.needSpenderApproval) {
    payload.externalCallTargets.push(inTokenAddress);
    payload.externalCallDataList.push(
      encodeFunctionData({
        abi: ERC20ABI,
        functionName: "approve",
        args: [quote.txnData.to, MaxUint256],
      })
    );
  }

  payload.externalCallTargets.push(quote.txnData.to);
  payload.externalCallDataList.push(quote.txnData.data);

  return payload;
}

function combineTransfers(tokenTransfers: TokenTransfer[]) {
  const transfersMap: { [key: string]: TokenTransfer } = {};
  let value = 0n;

  for (const transfer of tokenTransfers) {
    const key = `${transfer.tokenAddress}:${transfer.destination}`;

    if (!transfersMap[key]) {
      transfersMap[key] = { ...transfer };
    } else {
      transfersMap[key].amount += transfer.amount;
    }

    if (transfer.tokenAddress === NATIVE_TOKEN_ADDRESS) {
      value += transfer.amount;
    }
  }

  return { tokenTransfers: Object.values(transfersMap), value };
}

export function getBatchOrderMulticallPayload({ params }: { params: BatchOrderTxnParams }) {
  const { createOrderParams, updateOrderParams, cancelOrderParams, nativeTwapParams } = params;

  const multicall: ExchangeRouterCall[] = [];
  let value = 0n;

  // If native TWAP params are set, use the createTwapOrder endpoint
  if (nativeTwapParams) {
    const { multicall: twapMulticall, value: twapValue } = buildCreateTwapOrderMulticall(nativeTwapParams);
    multicall.push(...twapMulticall);
    value += twapValue;
  }

  for (const params of createOrderParams) {
    const { multicall: createMulticall, value: createValue } = buildCreateOrderMulticall(params);
    multicall.push(...createMulticall);
    value += createValue;
  }

  for (const update of updateOrderParams) {
    const { multicall: updateMulticall, value: updateValue } = buildUpdateOrderMulticall(update);
    multicall.push(...updateMulticall);
    value += updateValue;
  }

  for (const cancel of cancelOrderParams) {
    const { multicall: cancelMulticall, value: cancelValue } = buildCancelOrderMulticall({ params: cancel });
    multicall.push(...cancelMulticall);
    value += cancelValue;
  }

  const { encodedMulticall, callData } = encodeExchangeRouterMulticall(multicall);

  return { multicall, value, encodedMulticall, callData };
}

export function buildCreateOrderMulticall(params: CreateOrderTxnParams<any>) {
  const { tokenTransfersParams, orderPayload } = params;
  const { tokenTransfers = [], value = 0n, externalCalls = undefined } = tokenTransfersParams ?? {};

  const multicall: ExchangeRouterCall[] = [];

  for (const transfer of tokenTransfers) {
    if (transfer.tokenAddress === NATIVE_TOKEN_ADDRESS) {
      multicall.push({ method: "sendWnt", params: [transfer.destination, transfer.amount] });
    } else {
      multicall.push({ method: "sendTokens", params: [transfer.tokenAddress, transfer.destination, transfer.amount] });
    }
  }

  if (externalCalls) {
    multicall.push({
      method: "makeExternalCalls",
      params: [
        externalCalls.externalCallTargets,
        externalCalls.externalCallDataList,
        externalCalls.refundTokens,
        externalCalls.refundReceivers,
      ],
    });
  }

  multicall.push({
    method: "createOrder",
    params: [orderPayload],
  });

  return {
    multicall,
    value,
  };
}

/**
 * Builds multicall entries for the native createTwapOrder endpoint.
 * The contract handles token division and validFromTime scheduling internally.
 *
 * IMPORTANT: The order builder functions create token transfers with per-order execution fee.
 * The contract checks `wntAmount >= executionFee * twapCount`, so we must scale up the WNT
 * transfer to the total execution fee. Collateral transfers are already the total amount
 * (the contract divides them by twapCount internally).
 */
export function buildCreateTwapOrderMulticall(nativeTwapParams: NativeTwapOrderParams) {
  const { createOrderTxnParams, twapCount, intervalSeconds } = nativeTwapParams;
  const { tokenTransfersParams, orderPayload } = createOrderTxnParams;
  const { tokenTransfers = [], value = 0n } = tokenTransfersParams ?? {};

  const perOrderExecutionFee = orderPayload.numbers.executionFee;
  const additionalExecutionFee = perOrderExecutionFee * BigInt(twapCount - 1);

  // eslint-disable-next-line no-console
  console.debug("[v2.2c native TWAP] buildCreateTwapOrderMulticall:", {
    twapCount,
    intervalSeconds,
    perOrderExecutionFee: perOrderExecutionFee.toString(),
    totalExecutionFee: (perOrderExecutionFee * BigInt(twapCount)).toString(),
    additionalExecutionFee: additionalExecutionFee.toString(),
    tokenTransfers: tokenTransfers.length,
    sizeDeltaUsd: orderPayload.numbers.sizeDeltaUsd.toString(),
  });

  const multicall: ExchangeRouterCall[] = [];
  let adjustedValue = value;

  // Token transfers: scale up WNT (native) transfers to include total execution fee.
  // The builder functions only included per-order execution fee in the WNT transfer.
  // We need to add (twapCount - 1) * perOrderExecutionFee to cover the total.
  for (const transfer of tokenTransfers) {
    if (transfer.tokenAddress === NATIVE_TOKEN_ADDRESS) {
      const scaledAmount = transfer.amount + additionalExecutionFee;
      multicall.push({ method: "sendWnt", params: [transfer.destination, scaledAmount] });
    } else {
      multicall.push({ method: "sendTokens", params: [transfer.tokenAddress, transfer.destination, transfer.amount] });
    }
  }

  // Adjust msg.value to include the additional execution fee
  adjustedValue += additionalExecutionFee;

  // Use createTwapOrder instead of createOrder
  multicall.push({
    method: "createTwapOrder",
    params: [orderPayload, BigInt(twapCount), BigInt(intervalSeconds)],
  });

  return {
    multicall,
    value: adjustedValue,
  };
}

export function buildUpdateOrderMulticall(updateTxn: UpdateOrderTxnParams) {
  const { updatePayload, params: updateParams } = updateTxn;
  const { chainId } = updateParams;
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall: ExchangeRouterCall[] = [];

  if (updatePayload.executionFeeTopUp > 0n) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, updatePayload.executionFeeTopUp] });
  }

  multicall.push({
    method: "updateOrder",
    params: [
      updatePayload.orderKey,
      updatePayload.sizeDeltaUsd,
      updatePayload.acceptablePrice,
      updatePayload.triggerPrice,
      updatePayload.minOutputAmount,
      0n,
      updatePayload.autoCancel,
    ],
  });

  return {
    multicall,
    value: updatePayload.executionFeeTopUp,
  };
}

export function buildCancelOrderMulticall({ params }: { params: CancelOrderTxnParams }) {
  const { orderKey } = params;

  const multicall: ExchangeRouterCall[] = [];

  multicall.push({
    method: "cancelOrder",
    params: [orderKey],
  });

  return {
    multicall,
    value: 0n,
  };
}

export function encodeExchangeRouterMulticall(multicall: ExchangeRouterCall[]) {
  const encodedMulticall = multicall.map((call) =>
    encodeFunctionData({
      abi: abis.ExchangeRouter,
      functionName: call.method as any,
      args: call.params as any,
    })
  );

  const callData = encodeFunctionData({
    abi: ExchangeRouterAbi,
    functionName: "multicall",
    args: [encodedMulticall],
  });

  return {
    encodedMulticall,
    callData,
  };
}

export function getBatchRequiredActions(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return 0;
  }

  const nativeTwapActions = orderParams.nativeTwapParams ? 1 : 0;

  return (
    nativeTwapActions +
    orderParams.createOrderParams.length +
    orderParams.updateOrderParams.length +
    orderParams.cancelOrderParams.length
  );
}

export function getBatchSwapsCount(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return 0;
  }

  let count = orderParams.createOrderParams.reduce((acc, co) => {
    return acc + co.orderPayload.addresses.swapPath.length;
  }, 0);

  if (orderParams.nativeTwapParams) {
    count +=
      orderParams.nativeTwapParams.createOrderTxnParams.orderPayload.addresses.swapPath.length *
      orderParams.nativeTwapParams.twapCount;
  }

  return count;
}

export function getIsEmptyBatch(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return true;
  }

  if (getBatchRequiredActions(orderParams) === 0) {
    return true;
  }

  const hasEmptyOrder = orderParams.createOrderParams.some(
    (o) => o.orderPayload.numbers.sizeDeltaUsd === 0n && o.orderPayload.numbers.initialCollateralDeltaAmount === 0n
  );

  return hasEmptyOrder;
}

export function getBatchIsNativePayment(orderParams: BatchOrderTxnParams) {
  if (orderParams.nativeTwapParams?.createOrderTxnParams.tokenTransfersParams?.isNativePayment) {
    return true;
  }

  return orderParams.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment);
}

export function getIsInvalidBatchReceiver(batchParams: BatchOrderTxnParams, signerAddress: string) {
  if (
    batchParams.nativeTwapParams &&
    batchParams.nativeTwapParams.createOrderTxnParams.orderPayload.addresses.receiver !== signerAddress
  ) {
    return true;
  }

  return batchParams.createOrderParams.some((co) => co.orderPayload.addresses.receiver !== signerAddress);
}
