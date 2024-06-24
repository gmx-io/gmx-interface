import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, SetPendingPosition, PendingOrderData } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType, OrderTxnType } from "./types";
import { isMarketOrderType, getPendingOrderFromParams } from "./utils";
import { getPositionKey } from "../positions";
import { applySlippageToPrice } from "../trade";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { DecreaseOrderParams as BaseDecreaseOrderParams, createDecreaseEncodedPayload } from "./createDecreaseOrderTxn";
import { createCancelEncodedPayload } from "./cancelOrdersTxn";
import { createUpdateEncodedPayload } from "./updateOrderTxn";
import concat from "lodash/concat";

const { ZeroAddress } = ethers;

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
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
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

export type SecondaryDecreaseOrderParams = BaseDecreaseOrderParams & SecondaryOrderCommonParams;

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
  chainId,
  signer,
  subaccount,
  createIncreaseOrderParams: p,
  createDecreaseOrderParams,
  cancelOrderParams,
  updateOrderParams,
}: {
  chainId: number;
  signer: Signer;
  subaccount: Subaccount;
  createIncreaseOrderParams: IncreaseOrderParams;
  createDecreaseOrderParams?: SecondaryDecreaseOrderParams[];
  cancelOrderParams?: SecondaryCancelOrderParams[];
  updateOrderParams?: SecondaryUpdateOrderParams[];
}) {
  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;

  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;
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

  const increaseOrder: PendingOrderData = {
    account: p.account,
    marketAddress: p.marketAddress,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount: p.initialCollateralAmount,
    swapPath: p.swapPath,
    sizeDeltaUsd: p.sizeDeltaUsd,
    minOutputAmount: 0n,
    isLong: p.isLong,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativePayment,
    txnType: "create",
  };

  const encodedPayload = await createEncodedPayload({
    router,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
    subaccount,
    isNativePayment,
    initialCollateralTokenAddress,
    signer,
  });

  const orders =
    concat<SecondaryDecreaseOrderParams | SecondaryUpdateOrderParams | SecondaryCancelOrderParams>(
      createDecreaseOrderParams ?? [],
      cancelOrderParams ?? [],
      updateOrderParams ?? []
    ).map((p) => getPendingOrderFromParams(chainId, p.txnType, p)) || [];

  if (subaccount) {
    p.setPendingOrder([increaseOrder, ...orders]);
  }

  const simulationEncodedPayload = await createEncodedPayload({
    router: exchangeRouter,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
    subaccount: null,
    isNativePayment,
    initialCollateralTokenAddress,
    signer,
  });

  const decreaseEncodedPayload = createDecreaseEncodedPayload({
    router,
    orderVaultAddress,
    ps: createDecreaseOrderParams || [],
    subaccount,
    mainAccountAddress: p.account,
    chainId,
  });

  const cancelEncodedPayload = createCancelEncodedPayload({
    router,
    orderKeys: cancelOrderParams?.map(({ orderKey }) => orderKey) || [],
  });

  const updateEncodedPayload =
    updateOrderParams?.reduce<string[]>(
      (acc, { orderKey, sizeDeltaUsd, executionFee, indexToken, acceptablePrice, triggerPrice, minOutputAmount }) => {
        return [
          ...acc,
          ...createUpdateEncodedPayload({
            chainId,
            router,
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

  const secondaryPriceOverrides: PriceOverrides = {};
  const primaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice != undefined) {
    primaryPriceOverrides[p.indexToken.address] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  if (!p.skipSimulation) {
    await simulateExecuteOrderTxn(chainId, {
      account: p.account,
      tokensData: p.tokensData,
      primaryPriceOverrides,
      secondaryPriceOverrides,
      createOrderMulticallPayload: simulationEncodedPayload,
      value: totalWntAmount,
      errorTitle: t`Order error.`,
    });
  }

  const finalPayload = [...encodedPayload, ...decreaseEncodedPayload, ...cancelEncodedPayload, ...updateEncodedPayload];
  const txnCreatedAt = Date.now();

  await callContract(chainId, router, "multicall", [finalPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    customSigners: subaccount?.customSigners,
    setPendingTxns: p.setPendingTxns,
  });

  if (!subaccount) {
    p.setPendingOrder([increaseOrder, ...orders]);
  }

  if (isMarketOrderType(p.orderType)) {
    if (!signer.provider) throw new Error("No provider found");
    const txnCreatedAtBlock = await signer.provider.getBlockNumber();
    const positionKey = getPositionKey(p.account, p.marketAddress, p.targetCollateralAddress, p.isLong);

    p.setPendingPosition({
      isIncrease: true,
      positionKey,
      collateralDeltaAmount: p.collateralDeltaAmount,
      sizeDeltaUsd: p.sizeDeltaUsd,
      sizeDeltaInTokens: p.sizeDeltaInTokens,
      updatedAt: txnCreatedAt,
      updatedAtBlock: BigInt(txnCreatedAtBlock),
    });
  }
}

async function createEncodedPayload({
  router,
  orderVaultAddress,
  totalWntAmount,
  p,
  acceptablePrice,
  subaccount,
  isNativePayment,
  initialCollateralTokenAddress,
  signer,
}: {
  router: ethers.Contract;
  orderVaultAddress: string;
  totalWntAmount: bigint;
  p: IncreaseOrderParams;
  acceptablePrice: bigint;
  subaccount: Subaccount;
  isNativePayment: boolean;
  initialCollateralTokenAddress: string;
  signer: Signer;
}) {
  const orderParams = createOrderParams({
    p,
    acceptablePrice,
    initialCollateralTokenAddress,
    subaccount,
    isNativePayment,
  });
  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment && !subaccount
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderVaultAddress, p.initialCollateralAmount] }
      : undefined,

    {
      method: "createOrder",
      params: subaccount ? [await signer.getAddress(), orderParams] : [orderParams],
    },
  ];
  return multicall.filter(Boolean).map((call) => router.interface.encodeFunctionData(call!.method, call!.params));
}

function createOrderParams({
  p,
  acceptablePrice,
  initialCollateralTokenAddress,
  subaccount,
  isNativePayment,
}: {
  p: IncreaseOrderParams;
  acceptablePrice: bigint;
  initialCollateralTokenAddress: string;
  subaccount: Subaccount | null;
  isNativePayment: boolean;
}) {
  return {
    addresses: {
      receiver: p.account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: ZeroAddress,
      market: p.marketAddress,
      swapPath: p.swapPath,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: subaccount ? p.initialCollateralAmount : 0n,
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
    referralCode: p.referralCode || ethers.ZeroHash,
  };
}
