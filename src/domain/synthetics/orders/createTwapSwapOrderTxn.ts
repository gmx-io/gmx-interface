import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { PendingOrderData, SetPendingOrder } from "context/SyntheticsEvents";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";

import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TokensData } from "../tokens";
import { prepareOrderTxn } from "./prepareOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { TwapDuration } from "../trade/twap/types";
import { createTwapUiFeeReceiver } from "../trade/twap/uiFeeReceiver";

const { ZeroAddress } = ethers;

export type SwapOrderParams = {
  account: string;
  fromTokenAddress: string;
  fromTokenAmount: bigint;
  toTokenAddress: string;
  swapPath: string[];
  referralCode?: string;
  tokensData: TokensData;
  triggerRatio: bigint;
  minOutputAmount: bigint;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  executionFee: bigint;
  executionGasLimit: bigint;
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  skipSimulation: boolean;
  metricId: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  slippageInputId: string | undefined;
  duration: TwapDuration;
  numberOfParts: number;
};

export async function createSwapOrderTxn(chainId: number, signer: Signer, subaccount: Subaccount, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;

  await validateSignerAddress(signer, p.account);

  const encodedPayload = await getParams(router, signer, subaccount, chainId, p);

  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : 0n;
  const totalWntAmount = wntSwapAmount + p.executionFee;

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.fromTokenAddress, "wrapped");

  const swapOrder: PendingOrderData = {
    account: p.account,
    marketAddress: ZeroAddress,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount: p.fromTokenAmount,
    swapPath: p.swapPath,
    externalSwapQuote: undefined,
    sizeDeltaUsd: 0n,
    minOutputAmount: p.minOutputAmount,
    isLong: false,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: p.referralCode,
    txnType: "create",
    isTwapOrder: true,
  };

  if (subaccount) {
    p.setPendingOrder(swapOrder);
  }

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    router,
    "multicall",
    [encodedPayload],
    totalWntAmount,
    subaccount?.customSigners,
    undefined,
    p.metricId
  );

  await callContract(chainId, router, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    customSigners: subaccount?.customSigners,
    customSignersGasLimits,
    customSignersGasPrices,
    bestNonce,
    setPendingTxns: p.setPendingTxns,
    metricId: p.metricId,
    gasLimit,
    gasPriceData,
    pendingTransactionData: {
      estimatedExecutionFee: p.executionFee,
      estimatedExecutionGasLimit: p.executionGasLimit,
    },
  });

  if (!subaccount) {
    p.setPendingOrder(swapOrder);
  }
}

async function getParams(
  router: ethers.Contract,
  signer: Signer,
  subaccount: Subaccount,
  chainId: number,
  p: SwapOrderParams
) {
  const durationMinutes = p.duration.hours * 60 + p.duration.minutes;
  const durationMs = durationMinutes * 60;
  const startTime = Math.ceil(Date.now() / 1000);

  const uiFeeReceiver = createTwapUiFeeReceiver();

  const initialCollateralDeltaAmount = subaccount ? p.fromTokenAmount : 0n;

  const signerAddress = await signer.getAddress();

  const payloads = new Array(p.numberOfParts).fill(0).map((_, i) => {
    return createSingleSwapTwapOrderPayload({
      account: p.account,
      swapPath: p.swapPath,
      triggerRatio: p.triggerRatio,
      minOutputAmount: p.minOutputAmount / BigInt(p.numberOfParts), // TODO: check if this is correct
      orderType: p.orderType,
      executionFee: p.executionFee / BigInt(p.numberOfParts),
      uiFeeReceiver,
      isNativeReceive: p.toTokenAddress === NATIVE_TOKEN_ADDRESS,
      referralCode: p.referralCode,
      initialCollateralDeltaAmount: initialCollateralDeltaAmount / BigInt(p.numberOfParts),
      validFromTime: BigInt(startTime + (durationMs / p.numberOfParts) * i),
      fromTokenAddress: p.fromTokenAddress,
      fromTokenAmount: p.fromTokenAmount / BigInt(p.numberOfParts),
      toTokenAddress: p.toTokenAddress,
      subaccount,
      signer,
      router,
      chainId,
      signerAddress,
    });
  });

  return payloads;
}

function createSingleSwapTwapOrderPayload(p: CreateSwapTwapOrderPayloadParams) {
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const orderVaultAddress = getContract(p.chainId, "OrderVault");
  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : 0n;
  const totalWntAmount = wntSwapAmount + p.executionFee;

  const createOrderParams = getCreateSwapTwapOrderPayload(p);

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment && !p.subaccount
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderVaultAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: p.subaccount ? [p.signerAddress, createOrderParams] : [createOrderParams],
    },
  ];

  return multicall.filter(Boolean).map((call) => p.router.interface.encodeFunctionData(call!.method, call!.params));
}

type CreateSwapTwapOrderPayloadParams = {
  account: string;
  swapPath: string[];
  triggerRatio: bigint;
  minOutputAmount: bigint;
  orderType: OrderType;
  executionFee: bigint;
  uiFeeReceiver: string;
  isNativeReceive: boolean;
  referralCode: string | undefined;
  initialCollateralDeltaAmount: bigint;
  validFromTime: bigint;
  fromTokenAddress: string;
  fromTokenAmount: bigint;
  toTokenAddress: string;
  subaccount: Subaccount;
  signer: Signer;
  router: ethers.Contract;
  chainId: number;
  signerAddress: string;
};

const getCreateSwapTwapOrderPayload = ({
  account,
  swapPath,
  triggerRatio,
  minOutputAmount,
  orderType,
  executionFee,
  uiFeeReceiver,
  isNativeReceive,
  referralCode,
  initialCollateralDeltaAmount,
  validFromTime,
  fromTokenAddress,
  chainId,
}: CreateSwapTwapOrderPayloadParams) => {
  const initialCollateralTokenAddress = convertTokenAddress(chainId, fromTokenAddress, "wrapped");

  return {
    addresses: {
      receiver: account,
      cancellationReceiver: ethers.ZeroAddress,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: ZeroAddress,
      market: ZeroAddress,
      swapPath,
      uiFeeReceiver,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount,
      /**
       * We're passing trigger ratio in here to display actual ratio in table of positions
       * @see https://app.asana.com/0/1207525044994982/1209109731071143/f
       */
      triggerPrice: triggerRatio,
      acceptablePrice: 0n,
      executionFee,
      callbackGasLimit: 0n,
      minOutputAmount,
      validFromTime,
    },
    autoCancel: false,
    orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: referralCode || ethers.ZeroHash,
  };
};
