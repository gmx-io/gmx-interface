import uniq from "lodash/uniq";
import { encodeFunctionData, zeroAddress, zeroHash } from "viem";

import ExchangeRouterAbi from "abis/ExchangeRouter.json";
import ERC20ABI from "abis/Token.json";
import { getExcessiveExecutionFee, getHighExecutionFee } from "configs/chains";
import { getContract } from "configs/contracts";
import { convertTokenAddress, getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { ExecutionFee } from "types/fees";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { ContractPrice, ERC20Address, TokensData } from "types/tokens";
import { ExternalSwapQuote } from "types/trade";
import { TwapOrderParams } from "types/twap";

import { expandDecimals, MaxUint256, USD_DECIMALS } from "./numbers";
import { getByKey } from "./objects";
import { isIncreaseOrderType, isSwapOrderType } from "./orders";
import { convertToContractPrice, convertToUsd } from "./tokens";
import { applySlippageToMinOut, applySlippageToPrice } from "./trade";
import { getTwapValidFromTime } from "./twap";
import { createTwapUiFeeReceiver } from "./twap/uiFeeReceiver";

export type ExchangeRouterCall = {
  method: string;
  params: any[];
};

export type BatchOrderTxnParams = {
  createOrderParams: CreateOrderTxnParams<any>[];
  updateOrderParams: UpdateOrderTxnParams[];
  cancelOrderParams: CancelOrderTxnParams[];
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
    receiver: string;
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
};

export type UpdateOrderParams = {
  chainId: number;
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
  chainId: number;
  receiver: string;
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
  batchParams: { createOrderParams, updateOrderParams },
  tokensData,
  chainId,
}: {
  batchParams: BatchOrderTxnParams;
  tokensData: TokensData;
  chainId: number;
}): ExecutionFee | undefined {
  let feeTokenAmount = 0n;
  let gasLimit = 0n;

  const wnt = getByKey(tokensData, getWrappedToken(chainId).address);

  if (!wnt) {
    return undefined;
  }

  for (const co of createOrderParams) {
    feeTokenAmount += co.orderPayload.numbers.executionFee;
    gasLimit += co.params.executionGasLimit;
  }

  for (const uo of updateOrderParams) {
    feeTokenAmount += uo.updatePayload.executionFeeTopUp;
  }

  const feeUsd = convertToUsd(feeTokenAmount, wnt.decimals, wnt.prices.maxPrice)!;
  const isFeeHigh = feeUsd > expandDecimals(getHighExecutionFee(chainId), USD_DECIMALS);
  const isFeeVeryHigh = feeUsd > expandDecimals(getExcessiveExecutionFee(chainId), USD_DECIMALS);

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
  chainId: number;
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
  chainId: number;
  receiver: string;
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

  if (externalSwapQuote) {
    /**
     * External swap will be executed before order creation logic,
     * so the final order has no swap parameters and must treat the outToken address as an initial collateral
     * */
    initialCollateralTokenAddress = convertTokenAddress(chainId, externalSwapQuote.outTokenAddress, "wrapped");
    initialCollateralDeltaAmount = 0n;
    swapPath = [];
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
        abi: ERC20ABI.abi,
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
  const { createOrderParams, updateOrderParams, cancelOrderParams } = params;

  const multicall: ExchangeRouterCall[] = [];
  let value = 0n;

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
      abi: ExchangeRouterAbi.abi,
      functionName: call.method,
      args: call.params,
    })
  );

  const callData = encodeFunctionData({
    abi: ExchangeRouterAbi.abi,
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

  return (
    orderParams.createOrderParams.length + orderParams.updateOrderParams.length + orderParams.cancelOrderParams.length
  );
}

export function getBatchSwapsCount(orderParams: BatchOrderTxnParams | undefined) {
  if (!orderParams) {
    return 0;
  }

  return orderParams.createOrderParams.reduce((acc, co) => {
    return acc + co.orderPayload.addresses.swapPath.length;
  }, 0);
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
  return orderParams.createOrderParams.some((o) => o.tokenTransfersParams?.isNativePayment);
}

export function getIsInvalidBatchReceiver(batchParams: BatchOrderTxnParams, signerAddress: string) {
  return batchParams.createOrderParams.some((co) => co.orderPayload.addresses.receiver !== signerAddress);
}
