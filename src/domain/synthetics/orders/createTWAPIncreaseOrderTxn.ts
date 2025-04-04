import { t } from "@lingui/macro";
import { Signer, ethers } from "ethers";

import { getContract } from "config/contracts";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { PendingOrderData, SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics/types";
import { parseError } from "lib/parseError";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { ExternalSwapQuote } from "sdk/types/trade";
import { isMarketOrderType } from "sdk/utils/orders";
import { applySlippageToPrice } from "sdk/utils/trade";

import { getExternalCallsParams } from "../externalSwaps/utils";
import { getPositionKey } from "../positions";
import { prepareOrderTxn } from "./prepareOrderTxn";
import { PriceOverrides, simulateExecuteTxn } from "./simulateExecuteTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TWAPDuration } from "../trade/twap/types";
import { createTWAPUiFeeReceiver } from "../trade/twap/uiFeeReciver";

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
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease | OrderType.StopIncrease;
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
  blockTimestampData,
  createTWAPIncreaseOrderParams: p,
  additionalErrorContent,
}: {
  chainId: number;
  signer: Signer;
  subaccount: Subaccount;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
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

  const shouldApplySlippage = isMarketOrderType(p.orderType);
  const acceptablePrice = shouldApplySlippage
    ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong)
    : p.acceptablePrice;

  const wntAmountToIncrease = wntCollateralAmount + p.executionFee;
  const totalWntAmount = wntAmountToIncrease;

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
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativePayment,
      txnType: "create",
    };

    return increaseOrder;
  });

  const encodedPayload = await createEncodedPayload({
    chainId,
    router: exchangeRouter,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
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

  const simulationEncodedPayload = await createEncodedPayload({
    chainId,
    router: walletExchangeRouter,
    orderVaultAddress,
    totalWntAmount: wntAmountToIncrease,
    p,
    acceptablePrice,
    subaccount: null,
    isNativePayment,
    initialCollateralTokenAddress,
    tokenToSendAddress,
    swapPath,
    signer,
  });

  const primaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice != undefined) {
    primaryPriceOverrides[p.indexToken.address] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  const simulationPromise = !p.skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: p.account,
        tokensData: p.tokensData,
        primaryPriceOverrides,
        createMulticallPayload: simulationEncodedPayload,
        value: totalWntAmount,
        errorTitle: t`Order error.`,
        additionalErrorParams: {
          content: additionalErrorContent,
          slippageInputId: p.slippageInputId,
        },
        metricId,
        blockTimestampData,
        externalSwapQuote: p.externalSwapQuote,
      })
    : undefined;

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    exchangeRouter,
    "multicall",
    [encodedPayload],
    totalWntAmount,
    subaccount?.customSigners,
    simulationPromise,
    metricId,
    additionalErrorContent
  ).catch((e) => {
    console.log("prepareOrderTxn error", parseError(e));
    throw e;
  });

  const txnCreatedAt = Date.now();

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
      estimatedExecutionFee: p.executionFee,
      estimatedExecutionGasLimit: p.executionGasLimit,
    },
  })

  if (!subaccount) {
    p.setPendingOrder(increaseOrders);
  }

  if (isMarketOrderType(p.orderType)) {
    if (!signer.provider) throw new Error("No provider found");
    const txnCreatedAtBlock = await signer.provider.getBlockNumber();
    const positionKey = getPositionKey(p.account, p.marketAddress, p.targetCollateralAddress, p.isLong);

    p.setPendingPosition({
      isIncrease: true,
      positionKey,
      collateralDeltaAmount: p.collateralDeltaAmount / BigInt(p.numberOfParts),
      sizeDeltaUsd: p.sizeDeltaUsd / BigInt(p.numberOfParts),
      sizeDeltaInTokens: p.sizeDeltaInTokens / BigInt(p.numberOfParts),
      updatedAt: txnCreatedAt,
      updatedAtBlock: BigInt(txnCreatedAtBlock),
    });
  }
}

async function createEncodedPayload({
  chainId,
  router,
  orderVaultAddress,
  totalWntAmount,
  p,
  acceptablePrice,
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
  totalWntAmount: bigint;
  p: TWAPIncreaseOrderParams;
  acceptablePrice: bigint;
  subaccount: Subaccount;
  isNativePayment: boolean;
  initialCollateralTokenAddress: string;
  tokenToSendAddress;
  swapPath: string[];
  signer: Signer;
}) {
  const durationMinutes = p.duration.hours * 60 + p.duration.minutes;
  const durationMs = durationMinutes * 60 * 1000;
  const startTime = Date.now();

  const uiFeeReceiver = createTWAPUiFeeReceiver();

  const ordersParams = new Array(p.numberOfParts).fill(0).map((_, i) => {
    return createOrderParams({
      p,
      acceptablePrice,
      initialCollateralTokenAddress,
      swapPath,
      subaccount,
      isNativePayment,
      uiFeeReceiver: uiFeeReceiver,
      sizeDeltaUsd: p.sizeDeltaUsd / BigInt(p.numberOfParts),
      validFromTime: BigInt(startTime + (durationMs / p.numberOfParts) * i),
    });
  });

  const externalSwapWntAmount = isNativePayment && p.externalSwapQuote?.txnData ? p.externalSwapQuote.amountIn : 0n;
  const orderVaultWntAmount = totalWntAmount - externalSwapWntAmount;

  const externalHandlerAddress = getContract(chainId, "ExternalHandler");

  const tokensDestination = p.externalSwapQuote?.txnData ? externalHandlerAddress : orderVaultAddress;

  const signerAddress = await signer.getAddress();
  const createOrdersCalls = ordersParams.map((orderParams) => ({
    method: "createOrder",
    params: subaccount ? [signerAddress, orderParams] : [orderParams],
  }));

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
          params: [tokenToSendAddress, tokensDestination, p.initialCollateralAmount],
        }
      : undefined,

    p.externalSwapQuote?.txnData
      ? {
          method: "makeExternalCalls",
          params: getExternalCallsParams(chainId, p.account, p.externalSwapQuote),
        }
      : undefined,

     ...createOrdersCalls,
  ];

  const encodedData = multicall
    .filter(Boolean)
    .map((call) => router.interface.encodeFunctionData(call!.method, call!.params));

  return encodedData;
}

function createOrderParams({
  p,
  acceptablePrice,
  initialCollateralTokenAddress,
  swapPath,
  subaccount,
  isNativePayment,
  uiFeeReceiver,
  sizeDeltaUsd,
  validFromTime,
}: {
  p: TWAPIncreaseOrderParams;
  acceptablePrice: bigint;
  initialCollateralTokenAddress: string;
  swapPath: string[];
  subaccount: Subaccount | null;
  isNativePayment: boolean;
  uiFeeReceiver: string;
  sizeDeltaUsd: bigint;
  validFromTime: bigint;
}) {
  return {
    addresses: {
      cancellationReceiver: ethers.ZeroAddress,
      receiver: p.account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: ZeroAddress,
      market: p.marketAddress,
      swapPath,
      uiFeeReceiver,
    },
    numbers: {
      sizeDeltaUsd,
      initialCollateralDeltaAmount: subaccount ? p.initialCollateralAmount / BigInt(p.numberOfParts) : 0n,
      triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, p.indexToken.decimals),
      acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount: 0n,
      validFromTime,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: isNativePayment,
    autoCancel: false,
    referralCode: p.referralCode || ethers.ZeroHash,
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
