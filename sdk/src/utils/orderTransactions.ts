import { getToken } from "configs/tokens";

import ExchangeRouterAbi from "abis/ExchangeRouter.json";
import ERC20ABI from "abis/Token.json";
import { getContract } from "configs/contracts";
import { convertTokenAddress, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { MaxUint256 } from "ethers";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { ContractPrice, WrappedTokenAddress } from "types/tokens";
import { ExternalSwapQuote } from "types/trade";
import { encodeFunctionData, zeroAddress, zeroHash } from "viem";
import { convertToContractPrice } from "./tokens";
import { applySlippageToMinOut, applySlippageToPrice } from "./trade";

export type BatchOrderTxnParams = {
  createOrderParams: CreateOrderTxnParams<any>[];
  updateOrderParams: UpdateOrderTxnParams[];
  cancelOrderParams: CancelOrderTxnParams[];
};

export type CreateOrderTxnParams<
  TParams extends SwapOrderParams | IncreasePositionOrderParams | DecreasePositionOrderParams,
> = {
  params: TParams;
  orderPayload: CreateOrderPayload<TParams["orderType"]>;
  tokenTransfersParams: TokenTransfersParams | undefined;
};

export type UpdateOrderTxnParams = {
  params: UpdateOrderParams;
  updatePayload: UpdateOrderPayload;
};

export type CancelOrderTxnParams = {
  orderKey: string;
};

export type CreateOrderPayload<OT extends OrderType = OrderType> = {
  addresses: {
    receiver: string;
    cancellationReceiver: string;
    callbackContract: string;
    uiFeeReceiver: string;
    market: string;
    initialCollateralToken: WrappedTokenAddress;
    swapPath: string[];
  };
  numbers: {
    sizeDeltaUsd: bigint;
    initialCollateralDeltaAmount: bigint;
    triggerPrice: OT extends OrderType.LimitSwap | OrderType.MarketSwap ? bigint : ContractPrice | 0n;
    acceptablePrice: ContractPrice | 0n;
    executionFee: bigint;
    callbackGasLimit: bigint;
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

export type UpdateOrderParams = {
  chainId: number;
  indexTokenAddress: string;
  orderKey: string;
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
  isNativePayment: boolean;
  tokenTransfers: TokenTransfer[];
  value: bigint;
  initialCollateralTokenAddress: WrappedTokenAddress;
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
  // TODO: Support new contracts
  sendTokens: WrappedTokenAddress[];
  sendAmounts: bigint[];
  externalCallTargets: string[];
  externalCallDataList: string[];
  refundTokens: string[];
  refundReceivers: string[];
};

export type CommonOrderParams<OT extends OrderType> = {
  chainId: number;
  receiver: string;
  executionFeeAmount: bigint;
  executionGasLimit: bigint;
  referralCode: string | undefined;
  uiFeeReceiver: string | undefined;
  allowedSlippage: number;
  orderType: OT;
  autoCancel: boolean;
};

export type CollateralParams = {
  swapPath: string[];
  externalSwapQuote: ExternalSwapQuote | undefined;
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

export type SwapOrderParams = CommonOrderParams<OrderType.MarketSwap | OrderType.LimitSwap> &
  CollateralParams & {
    payTokenAddress: string;
    payTokenAmount: bigint;
    receiveTokenAddress: string;
    minOutputAmount: bigint;
    triggerRatio: bigint | undefined;
  };

export type IncreasePositionOrderParams = CollateralParams &
  PositionOrderParams &
  CommonOrderParams<OrderType.MarketIncrease | OrderType.LimitIncrease | OrderType.StopIncrease> & {
    payTokenAddress: string;
    payTokenAmount: bigint;
    collateralDeltaAmount: bigint;
    collateralTokenAddress: string;
  };

export type DecreasePositionOrderParams = CommonOrderParams<
  OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease
> &
  CollateralParams &
  PositionOrderParams & {
    initialCollateralTokenAddress: string;
    collateralDeltaAmount: bigint;
    receiveTokenAddress: string;
    minOutputUsd: bigint;
    decreasePositionSwapType: DecreasePositionSwapType;
  };

export function buildSwapOrderPayload(p: SwapOrderParams): CreateOrderTxnParams<SwapOrderParams> {
  const tokenTransfersParams = buildSendTokensTransfers(p);

  const orderPayload: CreateOrderPayload<SwapOrderParams["orderType"]> = {
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
      triggerPrice: p.triggerRatio ?? 0n,
      acceptablePrice: 0n,
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: applySlippageToMinOut(p.allowedSlippage, tokenTransfersParams.minOutputAmount),
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken:
      p.payTokenAddress === NATIVE_TOKEN_ADDRESS || p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS,
    autoCancel: p.autoCancel,
    referralCode: p.referralCode ?? zeroHash,
  };

  return {
    params: p,
    orderPayload,
    tokenTransfersParams: tokenTransfersParams,
  };
}

export function buildIncreaseOrderPayload(
  p: IncreasePositionOrderParams
): CreateOrderTxnParams<IncreasePositionOrderParams> {
  const tokenTransfersParams = buildSendTokensTransfers({ ...p, minOutputAmount: 0n });
  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  const orderPayload: CreateOrderPayload<typeof p.orderType> = {
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
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals),
      acceptablePrice: convertToContractPrice(
        applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong),
        indexToken.decimals
      ),
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: p.payTokenAddress === NATIVE_TOKEN_ADDRESS,
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

  const tokenTransfersParams = buildTokenTransfersForDecrease({
    chainId: p.chainId,
    executionFeeAmount: p.executionFeeAmount,
    collateralTokenAddress: p.initialCollateralTokenAddress,
    collateralTokenAmount: p.collateralDeltaAmount,
    swapPath: p.swapPath,
    minOutputAmount: p.minOutputUsd,
  });

  const orderPayload: CreateOrderPayload<typeof p.orderType> = {
    addresses: {
      receiver: p.receiver,
      cancellationReceiver: zeroAddress,
      callbackContract: zeroAddress,
      uiFeeReceiver: p.uiFeeReceiver ?? zeroAddress,
      market: p.marketAddress,
      initialCollateralToken: convertTokenAddress(p.chainId, p.initialCollateralTokenAddress, "wrapped"),
      swapPath: p.swapPath,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: p.collateralDeltaAmount,
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, indexToken.decimals),
      acceptablePrice: convertToContractPrice(
        applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong),
        indexToken.decimals
      ),
      executionFee: p.executionFeeAmount,
      callbackGasLimit: 0n,
      minOutputAmount: applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd),
      validFromTime: 0n,
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

export function buildUpdateOrderPayload(p: UpdateOrderParams): UpdateOrderTxnParams {
  const indexToken = getToken(p.chainId, p.indexTokenAddress);

  return {
    params: p,
    updatePayload: {
      orderKey: p.orderKey,
      sizeDeltaUsd: p.sizeDeltaUsd,
      triggerPrice: convertToContractPrice(p.triggerPrice, indexToken.decimals),
      acceptablePrice: convertToContractPrice(p.acceptablePrice, indexToken.decimals),
      minOutputAmount: p.minOutputAmount,
      autoCancel: p.autoCancel,
      validFromTime: 0n,
      executionFeeTopUp: 0n,
    },
  };
}

export function getTotalExecutionFeeForOrders({
  createOrderParams,
  updateOrderParams,
}: {
  createOrderParams: CreateOrderTxnParams<any>[];
  updateOrderParams: UpdateOrderTxnParams[];
}) {
  let totalExecutionFeeAmount = 0n;
  let totalExecutionGasLimit = 0n;

  for (const co of createOrderParams) {
    totalExecutionFeeAmount += co.params.executionFeeAmount;
    totalExecutionGasLimit += co.params.executionGasLimit;
  }

  for (const uo of updateOrderParams) {
    totalExecutionFeeAmount += uo.params.executionFeeTopUp;
  }

  return { totalExecutionFeeAmount, totalExecutionGasLimit };
}

export function buildTokenTransfersForDecrease({
  chainId,
  executionFeeAmount,
  collateralTokenAddress,
  collateralTokenAmount,
  swapPath,
  minOutputAmount,
}: {
  chainId: number;
  executionFeeAmount: bigint;
  collateralTokenAddress: string;
  collateralTokenAmount: bigint;
  swapPath: string[];
  minOutputAmount: bigint;
}): TokenTransfersParams {
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const tokenTransfers: TokenTransfer[] = [
    {
      tokenAddress: NATIVE_TOKEN_ADDRESS,
      destination: orderVaultAddress,
      amount: executionFeeAmount,
    },
  ];

  return {
    isNativePayment: false,
    initialCollateralTokenAddress: convertTokenAddress(chainId, collateralTokenAddress, "wrapped"),
    initialCollateralDeltaAmount: collateralTokenAmount,
    tokenTransfers,
    minOutputAmount,
    swapPath,
    value: executionFeeAmount,
    externalCalls: undefined,
  };
}

export function buildSendTokensTransfers({
  chainId,
  receiver,
  payTokenAddress,
  payTokenAmount,
  executionFeeAmount,
  externalSwapQuote,
  minOutputAmount,
  swapPath,
}: {
  chainId: number;
  receiver: string;
  payTokenAddress: string;
  payTokenAmount: bigint;
  executionFeeAmount: bigint;
  externalSwapQuote: ExternalSwapQuote | undefined;
  minOutputAmount: bigint;
  swapPath: string[];
}): TokenTransfersParams {
  const isNativePayment = payTokenAddress === NATIVE_TOKEN_ADDRESS;
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const externalHandlerAddress = getContract(chainId, "ExternalHandler");

  const combinedTransfers = combineTransfers([
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
    // TODO: Coment this.
    initialCollateralTokenAddress = convertTokenAddress(chainId, externalSwapQuote.outTokenAddress, "wrapped");
    initialCollateralDeltaAmount = 0n;
    minOutputAmount = externalSwapQuote.amountOut;
    swapPath = [];
    externalCalls = getExternalCallsPayload({
      chainId,
      account: receiver,
      quote: externalSwapQuote,
    });
  }

  return {
    isNativePayment,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount,
    tokenTransfers: combinedTransfers.tokenTransfers,
    minOutputAmount,
    swapPath,
    value: combinedTransfers.value,
    externalCalls,
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

  const payload: ExternalCallsPayload = {
    sendTokens: [inTokenAddress],
    sendAmounts: [quote.amountIn],
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [inTokenAddress],
    refundReceivers: [account],
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

export function getBatchOrderMulticallPayload({ chainId, params }: { chainId: number; params: BatchOrderTxnParams }) {
  const { createOrderParams, updateOrderParams, cancelOrderParams } = params;

  const multicall: ExchangeRouterCall[] = [];
  let value = 0n;

  for (const params of createOrderParams) {
    const { multicall: createMulticall, value: createValue } = buildCreateOrderMulticall(params);
    multicall.push(...createMulticall);
    value += createValue;
  }

  for (const update of updateOrderParams) {
    const { multicall: updateMulticall, value: updateValue } = buildUpdateOrderMulticall({ chainId, params: update });
    multicall.push(...updateMulticall);
    value += updateValue;
  }

  for (const cancel of cancelOrderParams) {
    const { multicall: cancelMulticall, value: cancelValue } = buildCancelOrderMulticall({ params: cancel });
    multicall.push(...cancelMulticall);
    value += cancelValue;
  }

  return { multicall, value, callData: encodeExchangeRouterMulticall(multicall) };
}

type ExchangeRouterCall = {
  method: string;
  params: any[];
};

// Encode
export function buildCreateOrderMulticall(params: CreateOrderTxnParams<any>) {
  const { tokenTransfersParams, orderPayload } = params;
  const { tokenTransfers = [], value = 0n, externalCalls = undefined } = tokenTransfersParams ?? {};

  const multicall: ExchangeRouterCall[] = [];

  for (const transfer of tokenTransfers) {
    if (transfer.tokenAddress === NATIVE_TOKEN_ADDRESS) {
      multicall.push({
        method: "sendWnt",
        params: [transfer.destination, transfer.amount],
      });
    } else {
      multicall.push({
        method: "sendTokens",
        params: [transfer.tokenAddress, transfer.destination, transfer.amount],
      });
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

export function buildUpdateOrderMulticall({ chainId, params }: { chainId: number; params: UpdateOrderTxnParams }) {
  const { updatePayload, params: updateParams } = params;
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall: ExchangeRouterCall[] = [];

  if (updatePayload.executionFeeTopUp > 0n) {
    multicall.push({ method: "sendWnt", params: [orderVaultAddress, updatePayload.executionFeeTopUp] });
  }

  const indexToken = getToken(chainId, updateParams.indexTokenAddress);

  multicall.push({
    method: "updateOrder",
    params: [
      updatePayload.orderKey,
      updatePayload.sizeDeltaUsd,
      convertToContractPrice(updatePayload.acceptablePrice, indexToken.decimals),
      convertToContractPrice(updatePayload.triggerPrice, indexToken.decimals),
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
  return multicall.map((call) =>
    encodeFunctionData({
      abi: ExchangeRouterAbi.abi,
      functionName: call.method,
      args: call.params,
    })
  );
}

// TODO:
// function optimizeExchangeRouterMulticall(multicall: ExchangeRouterCall[]) {
//   const optimizedMulticall: ExchangeRouterCall[] = [];

//   const sendWntCallsMap: { [key: string]: ExchangeRouterCall } = {};
//   const sendTokensCallsMap: { [key: string]: ExchangeRouterCall } = {};
//   const makeExternalCallsCallsMap: { [key: string]: ExchangeRouterCall } = {};

//   for (const call of multicall) {
//     if (call.method === "sendWnt") {
//       sendWntCallsMap[call.params[0]] = call;
//     } else if (call.method === "sendTokens") {
//       sendTokensCallsMap[call.params[0]] = call;
//     } else if (call.method === "makeExternalCalls") {
//       makeExternalCallsCallsMap[call.params[0]] = call;
//     } else if (call.method === "createOrder") {
//       optimizedMulticall.push(call);
//     }
//   }
// }

// export function combineExternalCalls(externalCalls: ExternalCallsPayload[]): ExternalCallsPayload {
//     const sendTokensMap: { [tokenAddress: string]: bigint } = {};
//     const refundTokensMap: { [tokenAddress: string]: string } = {};

//     const externalCallTargets: string[] = [];
//     const externalCallDataList: string[] = [];

//     for (const call of externalCalls) {
//       for (const tokenAddress of call.sendTokens) {
//         sendTokensMap[tokenAddress] = (sendTokensMap[tokenAddress] ?? 0n) + call.sendAmounts[tokenAddress];
//       }

//       for (const tokenAddress of call.refundTokens) {
//         refundTokensMap[tokenAddress] = call.refundReceivers[tokenAddress];
//       }

//       externalCallTargets.push(...call.externalCallTargets);
//       externalCallDataList.push(...call.externalCallDataList);
//     }

//     return {
//       sendTokens: Object.keys(sendTokensMap) as WrappedTokenAddress[],
//       sendAmounts: Object.values(sendTokensMap),
//       externalCallTargets,
//       externalCallDataList,
//       refundTokens: Object.keys(refundTokensMap),
//       refundReceivers: Object.values(refundTokensMap),
//     };
//   }
