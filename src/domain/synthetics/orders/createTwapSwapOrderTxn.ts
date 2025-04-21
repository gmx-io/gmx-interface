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

import { prepareOrderTxn } from "./prepareOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TwapDuration } from "../trade/twap/types";
import { createTwapUiFeeReceiver } from "../trade/twap/uiFeeReceiver";
import { makeTwapValidFromTimeGetter } from "../trade/twap/utils";

const { ZeroAddress } = ethers;

export type TwapSwapOrderParams = {
  account: string;
  fromTokenAddress: string;
  fromTokenAmount: bigint;
  toTokenAddress: string;
  swapPath: string[];
  referralCode?: string;
  executionFee: bigint;
  executionGasLimit: bigint;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  metricId: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  duration: TwapDuration;
  numberOfParts: number;
};

export async function createTwapSwapOrderTxn(
  chainId: number,
  signer: Signer,
  subaccount: Subaccount,
  p: TwapSwapOrderParams
) {
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
    minOutputAmount: 0n,
    isLong: false,
    orderType: OrderType.LimitSwap,
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
  p: TwapSwapOrderParams
) {
  const validFromTimeGetter = makeTwapValidFromTimeGetter(p.duration, p.numberOfParts);
  const uiFeeReceiver = createTwapUiFeeReceiver({ numberOfParts: p.numberOfParts });
  const signerAddress = await signer.getAddress();

  const initialCollateralDeltaAmount = subaccount ? p.fromTokenAmount : 0n;

  const payload = new Array(p.numberOfParts).fill(0).flatMap((_, i) => {
    return createSingleSwapTwapOrderPayload({
      account: p.account,
      swapPath: p.swapPath,
      triggerRatio: 0n,
      minOutputAmount: 0n,
      executionFee: p.executionFee / BigInt(p.numberOfParts),
      uiFeeReceiver,
      referralCode: p.referralCode,
      initialCollateralDeltaAmount: initialCollateralDeltaAmount / BigInt(p.numberOfParts),
      validFromTime: validFromTimeGetter(i),
      fromTokenAddress: p.fromTokenAddress,
      fromTokenAmount: p.fromTokenAmount / BigInt(p.numberOfParts),
      toTokenAddress: p.toTokenAddress,
      subaccount,
      router,
      chainId,
      signerAddress,
    });
  });

  return payload;
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
  executionFee: bigint;
  uiFeeReceiver: string;
  referralCode: string | undefined;
  initialCollateralDeltaAmount: bigint;
  validFromTime: bigint;
  fromTokenAddress: string;
  fromTokenAmount: bigint;
  toTokenAddress: string;
  subaccount: Subaccount;
  router: ethers.Contract;
  chainId: number;
  signerAddress: string;
};

const getCreateSwapTwapOrderPayload = ({
  account,
  swapPath,
  triggerRatio,
  minOutputAmount,
  executionFee,
  uiFeeReceiver,
  referralCode,
  initialCollateralDeltaAmount,
  validFromTime,
  fromTokenAddress,
  chainId,
  toTokenAddress,
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
    orderType: OrderType.LimitSwap,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: toTokenAddress === NATIVE_TOKEN_ADDRESS,
    referralCode: referralCode || ethers.ZeroHash,
  };
};
