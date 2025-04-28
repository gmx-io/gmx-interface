import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { SetPendingFundingFeeSettlement, SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";

import { getPositionKey } from "../positions";
import { prepareOrderTxn } from "./prepareOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { getPendingOrderFromParams } from "./utils";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TwapDuration } from "../trade/twap/types";
import { createTwapUiFeeReceiver } from "../trade/twap/uiFeeReceiver";
import { makeTwapValidFromTimeGetter } from "../trade/twap/utils";

const { ZeroAddress } = ethers;

export type TwapDecreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: bigint;
  swapPath: string[];
  receiveTokenAddress: string;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  minOutputUsd: bigint;
  isLong: boolean;
  decreasePositionSwapType: DecreasePositionSwapType;
  executionFee: bigint;
  executionGasLimit: bigint | undefined;
  referralCode?: string;
  indexToken: Token;
  tokensData: TokensData;
  autoCancel: boolean;
  duration: TwapDuration;
  numberOfParts: number;
  orderType: OrderType;
};

export type DecreaseOrderCallbacks = {
  setPendingTxns: (txns: any) => void;
  setPendingOrder?: SetPendingOrder;
  setPendingPosition?: SetPendingPosition;
  setPendingFundingFeeSettlement?: SetPendingFundingFeeSettlement;
};

export async function createTwapDecreaseOrderTxn(
  chainId: number,
  signer: Signer,
  subaccount: Subaccount,
  p: TwapDecreaseOrderParams,
  callbacks: DecreaseOrderCallbacks,
  metricId?: OrderMetricId
) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;

  const totalWntAmount = p.executionFee;
  const account = p.account;

  await validateSignerAddress(signer, p.account);

  const encodedPayload = createTwapDecreaseEncodedPayload({
    router,
    p,
    subaccount,
    mainAccountAddress: account,
    chainId,
  });

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    router,
    "multicall",
    [encodedPayload],
    totalWntAmount,
    subaccount?.customSigners,
    undefined,
    metricId
  );

  const txnCreatedAt = Date.now();
  const pendingTransactionData =
    p.executionFee !== undefined && p.executionGasLimit !== undefined
      ? {
          estimatedExecutionFee: p.executionFee,
          estimatedExecutionGasLimit: p.executionGasLimit,
        }
      : undefined;

  if (!signer.provider) throw new Error("No provider found");

  await callContract(chainId, router, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    customSigners: subaccount?.customSigners,
    customSignersGasLimits,
    customSignersGasPrices,
    gasLimit,
    gasPriceData,
    metricId,
    bestNonce,
    pendingTransactionData,
    setPendingTxns: callbacks.setPendingTxns,
  });

  const txnCreatedAtBlock = await signer.provider.getBlockNumber();

  if (!subaccount && callbacks.setPendingOrder) {
    callbacks.setPendingOrder(getPendingOrderFromParams(chainId, "create", p));
  }

  if (callbacks.setPendingFundingFeeSettlement) {
    callbacks.setPendingFundingFeeSettlement({
      orders: [getPendingOrderFromParams(chainId, "create", p)],
      positions: [getPendingPositionFromParams(txnCreatedAt, txnCreatedAtBlock, p)],
    });
  }
}

function getPendingPositionFromParams(txnCreatedAt: number, txnCreatedAtBlock: number, p: TwapDecreaseOrderParams) {
  const positionKey = getPositionKey(p.account, p.marketAddress, p.initialCollateralAddress, p.isLong);
  return {
    isIncrease: false,
    positionKey,
    collateralDeltaAmount: p.initialCollateralDeltaAmount,
    sizeDeltaUsd: p.sizeDeltaUsd,
    sizeDeltaInTokens: p.sizeDeltaInTokens,
    updatedAt: txnCreatedAt,
    updatedAtBlock: BigInt(txnCreatedAtBlock),
  };
}

export function createTwapDecreaseEncodedPayload({
  router,
  p,
  subaccount,
  mainAccountAddress,
  chainId,
}: {
  router: ethers.Contract;
  p: TwapDecreaseOrderParams;
  subaccount: Subaccount;
  mainAccountAddress: string;
  chainId: number;
}) {
  const getValidFromTime = makeTwapValidFromTimeGetter(p.duration, p.numberOfParts);
  const uiFeeReceiver = createTwapUiFeeReceiver({ numberOfParts: p.numberOfParts });

  const acceptablePrice = !p.isLong ? ethers.MaxUint256 : 0n;
  const triggerPrice = acceptablePrice;

  const payloads = new Array(p.numberOfParts).fill(0).flatMap((_, i) => {
    return createSingleOrderEncodedPayload({
      account: p.account,
      swapPath: p.swapPath,
      executionFee: p.executionFee / BigInt(p.numberOfParts),
      uiFeeReceiver,
      referralCode: p.referralCode,
      initialCollateralDeltaAmount: p.initialCollateralDeltaAmount / BigInt(p.numberOfParts),
      validFromTime: getValidFromTime(i),
      subaccount,
      router,
      chainId,
      mainAccountAddress,
      marketAddress: p.marketAddress,
      receiveTokenAddress: p.receiveTokenAddress,
      sizeDeltaUsd: p.sizeDeltaUsd / BigInt(p.numberOfParts),
      acceptablePrice: acceptablePrice,
      triggerPrice: triggerPrice,
      minOutputUsd: p.minOutputUsd,
      autoCancel: p.autoCancel,
      isLong: p.isLong,
      decreasePositionSwapType: p.decreasePositionSwapType,
      indexToken: p.indexToken,
      initialCollateralAddress: p.initialCollateralAddress,
    });
  });

  return payloads;
}

const createSingleOrderEncodedPayload = (p: CreateTwapDecreaseOrderPayload) => {
  const { router, subaccount, mainAccountAddress, chainId } = p;
  const orderParams = createTwapDecreaseOrderParams(p);
  const orderVaultAddress = getContract(chainId, "OrderVault");

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, p.executionFee] },
    {
      method: "createOrder",
      params: subaccount ? [mainAccountAddress, orderParams] : [orderParams],
    },
  ];

  return multicall.filter(Boolean).map((call) => router.interface.encodeFunctionData(call!.method, call!.params));
};

type CreateTwapDecreaseOrderPayload = {
  account: string;
  marketAddress: string;
  initialCollateralDeltaAmount: bigint;
  swapPath: string[];
  receiveTokenAddress: string;
  sizeDeltaUsd: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  minOutputUsd: bigint;
  executionFee: bigint;
  decreasePositionSwapType: DecreasePositionSwapType;
  isLong: boolean;
  autoCancel: boolean;
  referralCode: string | undefined;
  chainId: number;
  initialCollateralAddress: string;
  indexToken: Token;
  uiFeeReceiver: string;
  subaccount: Subaccount;
  mainAccountAddress: string;
  router: ethers.Contract;
  validFromTime: bigint;
};

const createTwapDecreaseOrderParams = ({
  account,
  marketAddress,
  initialCollateralDeltaAmount,
  swapPath,
  receiveTokenAddress,
  sizeDeltaUsd,
  acceptablePrice,
  triggerPrice,
  minOutputUsd,
  executionFee,
  decreasePositionSwapType,
  isLong,
  autoCancel,
  referralCode,
  chainId,
  initialCollateralAddress,
  uiFeeReceiver,
  indexToken,
  validFromTime,
}: CreateTwapDecreaseOrderPayload) => {
  const initialCollateralTokenAddress = convertTokenAddress(chainId, initialCollateralAddress, "wrapped");

  return {
    addresses: {
      cancellationReceiver: ethers.ZeroAddress,
      receiver: account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: ZeroAddress,
      market: marketAddress,
      swapPath,
      uiFeeReceiver,
    },
    numbers: {
      sizeDeltaUsd,
      initialCollateralDeltaAmount,
      triggerPrice: convertToContractPrice(triggerPrice, indexToken.decimals),
      acceptablePrice: convertToContractPrice(acceptablePrice, indexToken.decimals),
      executionFee,
      callbackGasLimit: 0n,
      validFromTime,
      minOutputAmount: minOutputUsd,
    },
    orderType: OrderType.LimitDecrease,
    decreasePositionSwapType,
    isLong,
    shouldUnwrapNativeToken: receiveTokenAddress === NATIVE_TOKEN_ADDRESS,

    autoCancel,
    referralCode: referralCode || ethers.ZeroHash,
  };
};
