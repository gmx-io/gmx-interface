import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { PendingOrderData, SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics/types";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";

import { prepareOrderTxn } from "./prepareOrderTxn";
import { PriceOverrides } from "./simulateExecuteTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { getExternalCallsParams } from "../externalSwaps/utils";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TWAPDuration } from "../trade/twap/types";
import { createTWAPUiFeeReceiver } from "../trade/twap/uiFeeReceiver";

const { ZeroAddress } = ethers;

type TWAPIncreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  targetCollateralAddress: string;
  initialCollateralAmount: bigint;
  collateralDeltaAmount: bigint;
  swapPath: string[];
  externalSwapQuote: ExternalSwapQuote | undefined;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  isLong: boolean;
  executionFee: bigint;
  executionGasLimit: bigint;
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode: string | undefined;
  indexToken: TokenData;
  tokensData: TokensData;
  slippageInputId: string | undefined;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;

  duration: TWAPDuration;
  numberOfParts: number;
};

export async function createTWAPIncreaseOrderTxn({
  chainId,
  signer,
  subaccount,
  metricId,
  createTWAPIncreaseOrderParams: p,
  additionalErrorContent,
}: {
  chainId: number;
  signer: Signer;
  subaccount: Subaccount;
  metricId?: OrderMetricId;
  createTWAPIncreaseOrderParams: TWAPIncreaseOrderParams;
  additionalErrorContent?: React.ReactNode;
}) {
  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;

  const walletExchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), abis.ExchangeRouter, signer);
  const exchangeRouter = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : walletExchangeRouter;

  await validateSignerAddress(signer, p.account);

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : 0n;

  const { initialCollateralTokenAddress, swapPath, tokenToSendAddress } = getCollateralAndSwapAddresses(chainId, p);

  const acceptablePrice = p.isLong ? ethers.MaxUint256 : 0n;
  const triggerPrice = acceptablePrice;

  const totalExecutionFee = p.executionFee * BigInt(p.numberOfParts);
  const totalWntAmount = wntCollateralAmount + totalExecutionFee;

  const increaseOrders = new Array(p.numberOfParts).fill(0).map(() => {
    const increaseOrder: PendingOrderData = {
      account: p.account,
      marketAddress: p.marketAddress,
      initialCollateralTokenAddress,
      initialCollateralDeltaAmount: p.initialCollateralAmount / BigInt(p.numberOfParts),
      swapPath,
      externalSwapQuote: p.externalSwapQuote,
      sizeDeltaUsd: p.sizeDeltaUsd / BigInt(p.numberOfParts),
      minOutputAmount: 0n,
      isLong: p.isLong,
      orderType: OrderType.LimitIncrease,
      shouldUnwrapNativeToken: isNativePayment,
      txnType: "create",
    };

    return increaseOrder;
  });

  const encodedPayload = await createEncodedPayload({
    chainId,
    router: exchangeRouter,
    orderVaultAddress,
    p,
    acceptablePrice,
    triggerPrice,
    subaccount,
    isNativePayment,
    initialCollateralTokenAddress,
    tokenToSendAddress,
    swapPath,
    signer,
  });

  if (subaccount) {
    p.setPendingOrder(increaseOrders);
  }

  const primaryPriceOverrides: PriceOverrides = {};

  primaryPriceOverrides[p.indexToken.address] = {
    minPrice: triggerPrice,
    maxPrice: triggerPrice,
  };

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    exchangeRouter,
    "multicall",
    [encodedPayload],
    totalWntAmount,
    subaccount?.customSigners,
    undefined,
    metricId,
    additionalErrorContent
  );

  await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    customSigners: subaccount?.customSigners,
    customSignersGasLimits,
    customSignersGasPrices,
    metricId,
    gasLimit,
    gasPriceData,
    bestNonce,
    setPendingTxns: p.setPendingTxns,
    pendingTransactionData: {
      estimatedExecutionFee: totalExecutionFee,
      estimatedExecutionGasLimit: p.executionGasLimit,
    },
  });

  if (!subaccount) {
    p.setPendingOrder(increaseOrders);
  }
}

async function createEncodedPayload({
  chainId,
  router,
  orderVaultAddress,
  p,
  acceptablePrice,
  triggerPrice,
  subaccount,
  isNativePayment,
  initialCollateralTokenAddress,
  tokenToSendAddress,
  swapPath,
  signer,
}: {
  chainId: number;
  router: ethers.Contract;
  orderVaultAddress: string;
  p: TWAPIncreaseOrderParams;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  subaccount: Subaccount;
  isNativePayment: boolean;
  initialCollateralTokenAddress: string;
  tokenToSendAddress;
  swapPath: string[];
  signer: Signer;
}) {
  const durationMinutes = p.duration.hours * 60 + p.duration.minutes;
  const durationMs = durationMinutes * 60;
  const startTime = Math.ceil(Date.now() / 1000);

  const uiFeeReceiver = createTWAPUiFeeReceiver();

  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount / BigInt(p.numberOfParts) : 0n;
  const totalWntAmount = wntCollateralAmount + p.executionFee;
  const externalSwapWntAmount = isNativePayment && p.externalSwapQuote?.txnData ? p.externalSwapQuote.amountIn : 0n;
  const orderVaultWntAmount = totalWntAmount - externalSwapWntAmount;

  const signerAddress = await signer.getAddress();

  const payloads = new Array(p.numberOfParts).fill(0).flatMap((_, i) => {
    return createSingleOrderEncodedPayload({
      chainId,
      router,
      orderVaultAddress,
      acceptablePrice,
      initialCollateralTokenAddress,
      swapPath,
      subaccount,
      isNativePayment,
      uiFeeReceiver: uiFeeReceiver,
      sizeDeltaUsd: p.sizeDeltaUsd / BigInt(p.numberOfParts),
      validFromTime: BigInt(startTime + (durationMs / p.numberOfParts) * i),
      triggerPrice,
      account: p.account,
      marketAddress: p.marketAddress,
      indexToken: p.indexToken,
      executionFee: p.executionFee,
      isLong: p.isLong,
      referralCode: p.referralCode,
      externalSwapQuote: p.externalSwapQuote,
      initialCollateralDeltaAmount: p.initialCollateralAmount / BigInt(p.numberOfParts),
      tokenToSendAddress,
      wntAmount: orderVaultWntAmount,
      signerAddress,
    });
  });

  return payloads;
}

type SingleTWAPIncreaseOrderParams = {
  chainId: number;
  router: ethers.Contract;
  orderVaultAddress: string;
  acceptablePrice: bigint;
  triggerPrice: bigint;
  subaccount: Subaccount;
  isNativePayment: boolean;
  initialCollateralTokenAddress: string;
  tokenToSendAddress;
  swapPath: string[];
  uiFeeReceiver: string;
  validFromTime: bigint;
  wntAmount: bigint;
  signerAddress: string;
  sizeDeltaUsd: bigint;
  initialCollateralDeltaAmount: bigint;
  account: string;
  marketAddress: string;
  indexToken: TokenData;
  executionFee: bigint;
  isLong: boolean;
  referralCode: string | undefined;
  externalSwapQuote: ExternalSwapQuote | undefined;
};

function createSingleOrderEncodedPayload(params: SingleTWAPIncreaseOrderParams) {
  const {
    chainId,
    router,
    orderVaultAddress,
    subaccount,
    isNativePayment,
    tokenToSendAddress,
    wntAmount,
    signerAddress,
    externalSwapQuote,
    initialCollateralDeltaAmount,
    account,
  } = params;
  const orderParams = createOrderPayloadParams(params);

  const externalSwapWntAmount = isNativePayment && externalSwapQuote?.txnData ? externalSwapQuote.amountIn : 0n;
  const orderVaultWntAmount = wntAmount - externalSwapWntAmount;

  const externalHandlerAddress = getContract(chainId, "ExternalHandler");

  const tokensDestination = externalSwapQuote?.txnData ? externalHandlerAddress : orderVaultAddress;

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, orderVaultWntAmount] },

    externalSwapWntAmount !== 0n
      ? {
          method: "sendWnt",
          params: [externalHandlerAddress, externalSwapWntAmount],
        }
      : undefined,

    !isNativePayment && !subaccount
      ? {
          method: "sendTokens",
          params: [tokenToSendAddress, tokensDestination, initialCollateralDeltaAmount],
        }
      : undefined,

    externalSwapQuote?.txnData
      ? {
          method: "makeExternalCalls",
          params: getExternalCallsParams(chainId, account, externalSwapQuote),
        }
      : undefined,

    { method: "createOrder", params: subaccount ? [signerAddress, orderParams] : [orderParams] },
  ];

  const encodedData = multicall
    .filter(Boolean)
    .map((call) => router.interface.encodeFunctionData(call!.method, call!.params));

  return encodedData;
}

function createOrderPayloadParams({
  acceptablePrice,
  initialCollateralTokenAddress,
  swapPath,
  isNativePayment,
  uiFeeReceiver,
  sizeDeltaUsd,
  validFromTime,
  triggerPrice,
  account,
  marketAddress,
  indexToken,
  executionFee,
  isLong,
  referralCode,
  initialCollateralDeltaAmount,
}: SingleTWAPIncreaseOrderParams) {
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
      executionFee: executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime,
    },
    orderType: OrderType.LimitIncrease,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: isLong,
    shouldUnwrapNativeToken: isNativePayment,
    autoCancel: false,
    referralCode: referralCode || ethers.ZeroHash,
  };
}

export function getCollateralAndSwapAddresses(
  chainId: number,
  p: {
    swapPath: string[];
    initialCollateralAddress: string;
    targetCollateralAddress: string;
    externalSwapQuote: ExternalSwapQuote | undefined;
  }
) {
  let swapPath = p.swapPath;
  let initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");
  const tokenToSendAddress = initialCollateralTokenAddress;

  if (p.externalSwapQuote?.txnData) {
    swapPath = [];
    initialCollateralTokenAddress = p.targetCollateralAddress;
  }

  return {
    swapPath,
    initialCollateralTokenAddress,
    tokenToSendAddress,
  };
}
