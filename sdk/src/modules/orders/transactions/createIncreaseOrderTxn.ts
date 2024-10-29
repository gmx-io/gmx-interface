import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "configs/contracts";
import { convertTokenAddress, NATIVE_TOKEN_ADDRESS } from "configs/tokens";

import concat from "lodash/concat";
import { DecreasePositionSwapType, OrderTxnType, OrderType } from "types/orders";
import { TokenData, TokenPrices, TokensData } from "types/tokens";
import { isMarketOrderType } from "utils/orders";
import { convertToContractPrice } from "utils/tokens";
import { applySlippageToMinOut, applySlippageToPrice } from "utils/trade";
import { Abi, encodeFunctionData, zeroAddress, zeroHash } from "viem";
import { createDecreaseEncodedPayload, DecreaseOrderParams } from "./createDecreaseOrderTxn";
import type { GmxSdk } from "index";
import { createCancelEncodedPayload } from "./cancelOrdersTxn";
import { createUpdateEncodedPayload } from "./updateOrderTxn";

export type PriceOverrides = {
  [address: string]: TokenPrices | undefined;
};

type IncreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  targetCollateralAddress: string;
  initialCollateralAmount: bigint;
  collateralDeltaAmount: bigint;
  swapPath: string[];
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  executionFee: bigint;
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode: string | undefined;
  indexToken: TokenData;
  tokensData: TokensData;
};

type SecondaryOrderCommonParams = {
  account: string;
  marketAddress: string;
  swapPath: string[];
  allowedSlippage: number;
  initialCollateralAddress: string;
  receiveTokenAddress: string;
  isLong: boolean;
  indexToken: TokenData;
  txnType: OrderTxnType;
  orderType: OrderType;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
};

export type SecondaryDecreaseOrderParams = DecreaseOrderParams & SecondaryOrderCommonParams;

export type SecondaryCancelOrderParams = SecondaryOrderCommonParams & {
  orderKey: string | null;
};

export type SecondaryUpdateOrderParams = SecondaryOrderCommonParams & {
  orderKey: string;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  executionFee: bigint;
  indexToken: TokenData;
  minOutputAmount: bigint;
};

export async function createIncreaseOrderTxn({
  sdk,
  createIncreaseOrderParams: p,
  createDecreaseOrderParams,
  cancelOrderParams,
  updateOrderParams,
}: {
  sdk: GmxSdk;
  createIncreaseOrderParams: IncreaseOrderParams;
  createDecreaseOrderParams?: SecondaryDecreaseOrderParams[];
  cancelOrderParams?: SecondaryCancelOrderParams[];
  updateOrderParams?: SecondaryUpdateOrderParams[];
}) {
  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

  const chainId = sdk.chainId;

  const exchangeRouter = getContract(chainId, "ExchangeRouter");
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : 0n;
  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");
  const shouldApplySlippage = isMarketOrderType(p.orderType);
  const acceptablePrice = shouldApplySlippage
    ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong)
    : p.acceptablePrice;

  const wntAmountToIncrease = wntCollateralAmount + p.executionFee;
  const totalWntAmount = concat<undefined | SecondaryDecreaseOrderParams | SecondaryUpdateOrderParams>(
    createDecreaseOrderParams,
    updateOrderParams
  ).reduce((acc, p) => (p ? acc + p.executionFee : acc), wntAmountToIncrease);

  const encodedPayload = await createEncodedPayload({
    routerAbi: ExchangeRouter.abi as Abi,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
    isNativePayment,
    initialCollateralTokenAddress,
  });

  const orders =
    concat<SecondaryDecreaseOrderParams | SecondaryUpdateOrderParams | SecondaryCancelOrderParams>(
      createDecreaseOrderParams ?? [],
      cancelOrderParams ?? [],
      updateOrderParams ?? []
    ).map((p) => getPendingOrderFromParams(chainId, p.txnType, p)) || [];

  const simulationEncodedPayload = await createEncodedPayload({
    routerAbi: ExchangeRouter.abi as Abi,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
    isNativePayment,
    initialCollateralTokenAddress,
  });

  const decreaseEncodedPayload = createDecreaseEncodedPayload({
    sdk,
    orderVaultAddress,
    ps: createDecreaseOrderParams || [],
  });

  const cancelEncodedPayload = createCancelEncodedPayload(cancelOrderParams?.map(({ orderKey }) => orderKey) || []);
  const updateEncodedPayload =
    updateOrderParams?.reduce<string[]>(
      (acc, { orderKey, sizeDeltaUsd, executionFee, indexToken, acceptablePrice, triggerPrice, minOutputAmount }) => {
        return [
          ...acc,
          ...createUpdateEncodedPayload({
            sdk,
            orderKey,
            sizeDeltaUsd,
            executionFee,
            indexToken,
            acceptablePrice,
            triggerPrice,
            minOutputAmount,
          }),
        ];
      },
      []
    ) ?? [];

  const primaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice != undefined) {
    primaryPriceOverrides[p.indexToken.address] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  // if (!p.skipSimulation) {
  //   await simulateExecuteTxn(chainId, {
  //     account: p.account,
  //     tokensData: p.tokensData,
  //     primaryPriceOverrides,
  //     createMulticallPayload: simulationEncodedPayload,
  //     value: totalWntAmount,
  //     errorTitle: t`Order error.`,
  //   });
  // }

  const finalPayload = [...encodedPayload, ...decreaseEncodedPayload, ...cancelEncodedPayload, ...updateEncodedPayload];

  await sdk.callContract(exchangeRouter, ExchangeRouter.abi as Abi, "multicall", [finalPayload], {
    value: totalWntAmount,
  });
}

async function createEncodedPayload({
  routerAbi,
  orderVaultAddress,
  totalWntAmount,
  p,
  acceptablePrice,
  isNativePayment,
  initialCollateralTokenAddress,
}: {
  routerAbi: Abi;
  orderVaultAddress: string;
  totalWntAmount: bigint;
  p: IncreaseOrderParams;
  acceptablePrice: bigint;
  isNativePayment: boolean;
  initialCollateralTokenAddress: string;
}) {
  const orderParams = createOrderParams({
    p,
    acceptablePrice,
    initialCollateralTokenAddress,
    isNativePayment,
  });
  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderVaultAddress, p.initialCollateralAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [orderParams],
    },
  ];
  return multicall.filter(Boolean).map((call) =>
    encodeFunctionData({
      abi: routerAbi,
      functionName: call!.method,
      args: call!.params,
    })
  );
}

function createOrderParams({
  p,
  acceptablePrice,
  initialCollateralTokenAddress,
  isNativePayment,
}: {
  p: IncreaseOrderParams;
  acceptablePrice: bigint;
  initialCollateralTokenAddress: string;
  isNativePayment: boolean;
}) {
  return {
    addresses: {
      cancellationReceiver: zeroAddress,
      receiver: p.account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: zeroAddress,
      market: p.marketAddress,
      swapPath: p.swapPath,
      uiFeeReceiver: zeroAddress,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: 0n,
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, p.indexToken.decimals),
      acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: isNativePayment,
    autoCancel: false,
    referralCode: p.referralCode || zeroHash,
  };
}

export function getPendingOrderFromParams(
  chainId: number,
  txnType: OrderTxnType,
  p: DecreaseOrderParams | SecondaryUpdateOrderParams | SecondaryCancelOrderParams
) {
  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const shouldApplySlippage = isMarketOrderType(p.orderType);
  let minOutputAmount = 0n;
  if ("minOutputUsd" in p) {
    shouldApplySlippage ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd) : p.minOutputUsd;
  }
  if ("minOutputAmount" in p) {
    minOutputAmount = p.minOutputAmount;
  }
  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

  const orderKey = "orderKey" in p && p.orderKey ? p.orderKey : undefined;

  return {
    txnType,
    account: p.account,
    marketAddress: p.marketAddress,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
    swapPath: p.swapPath,
    sizeDeltaUsd: p.sizeDeltaUsd,
    minOutputAmount: minOutputAmount,
    isLong: p.isLong,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativeReceive,
    orderKey,
  };
}