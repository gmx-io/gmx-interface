import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { PendingOrderData, SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { OrderMetricId } from "lib/metrics/types";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";
import concat from "lodash/concat";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import Token from "sdk/abis/Token.json";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress, getNativeToken } from "sdk/configs/tokens";
import { getOpenOceanTxnData } from "../externalSwaps/openOcean";
import { ExternalSwapQuote } from "../externalSwaps/useExternalSwapsQuote";
import { getPositionKey } from "../positions";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { applySlippageToPrice } from "../trade";
import { createCancelEncodedPayload } from "./cancelOrdersTxn";
import { DecreaseOrderParams as BaseDecreaseOrderParams, createDecreaseEncodedPayload } from "./createDecreaseOrderTxn";
import { prepareOrderTxn } from "./prepareOrderTxn";
import { PriceOverrides, simulateExecuteTxn } from "./simulateExecuteTxn";
import { DecreasePositionSwapType, OrderTxnType, OrderType } from "./types";
import { createUpdateEncodedPayload } from "./updateOrderTxn";
import { getPendingOrderFromParams, isMarketOrderType } from "./utils";
import { ErrorLike } from "lib/parseError";

const { ZeroAddress } = ethers;

type IncreaseOrderParams = {
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
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  executionFee: bigint;
  executionGasLimit: bigint;
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
  autoCancel: boolean;
};

export async function createIncreaseOrderTxn({
  chainId,
  signer,
  subaccount,
  metricId,
  blockTimestampData,
  createIncreaseOrderParams: p,
  createDecreaseOrderParams,
  cancelOrderParams,
  updateOrderParams,
}: {
  chainId: number;
  signer: Signer;
  subaccount: Subaccount;
  metricId?: OrderMetricId;
  blockTimestampData: BlockTimestampData | undefined;
  createIncreaseOrderParams: IncreaseOrderParams;
  createDecreaseOrderParams?: SecondaryDecreaseOrderParams[];
  cancelOrderParams?: SecondaryCancelOrderParams[];
  updateOrderParams?: SecondaryUpdateOrderParams[];
}) {
  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;

  const walletExchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const exchangeRouter = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : walletExchangeRouter;

  await validateSignerAddress(signer, p.account);

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
    externalSwapQuote: p.externalSwapQuote,
    sizeDeltaUsd: p.sizeDeltaUsd,
    minOutputAmount: 0n,
    isLong: p.isLong,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativePayment,
    txnType: "create",
  };

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
    chainId,
    router: walletExchangeRouter,
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
    router: exchangeRouter,
    orderVaultAddress,
    ps: createDecreaseOrderParams || [],
    subaccount,
    mainAccountAddress: p.account,
    chainId,
  });

  const cancelEncodedPayload = createCancelEncodedPayload({
    router: exchangeRouter,
    orderKeys: cancelOrderParams?.map(({ orderKey }) => orderKey) || [],
  });

  const updateEncodedPayload =
    updateOrderParams?.reduce<string[]>(
      (
        acc,
        { orderKey, sizeDeltaUsd, executionFee, indexToken, acceptablePrice, triggerPrice, minOutputAmount, autoCancel }
      ) => {
        return [
          ...acc,
          ...createUpdateEncodedPayload({
            chainId,
            router: exchangeRouter,
            orderKey,
            sizeDeltaUsd,
            executionFee,
            indexToken,
            acceptablePrice,
            triggerPrice,
            minOutputAmount,
            autoCancel,
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

  const finalPayload = [...encodedPayload, ...decreaseEncodedPayload, ...cancelEncodedPayload, ...updateEncodedPayload];

  const simulationPromise = !p.skipSimulation
    ? simulateExecuteTxn(chainId, {
        account: p.account,
        tokensData: p.tokensData,
        primaryPriceOverrides,
        createMulticallPayload: simulationEncodedPayload,
        value: totalWntAmount,
        errorTitle: t`Order error.`,
        metricId,
        blockTimestampData,
      })
    : undefined;

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    exchangeRouter,
    "multicall",
    [finalPayload],
    totalWntAmount,
    subaccount?.customSigners,
    simulationPromise,
    metricId
  );

  const txnCreatedAt = Date.now();

  await callContract(chainId, exchangeRouter, "multicall", [finalPayload], {
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
  chainId,
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
  chainId: number;
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
  const externalSwap = p.externalSwapQuote
    ? await getOpenOceanTxnData({
        chainId,
        senderAddress: getContract(chainId, "ExternalHandler"),
        receiverAddress: orderVaultAddress,
        tokenInAddress: p.initialCollateralAddress,
        tokenOutAddress: p.targetCollateralAddress,
        tokenInAmount: p.initialCollateralAmount,
        slippage: p.allowedSlippage,
        gasPrice: gasPrice.toString(),
      }).catch((error: ErrorLike) => {
        error.errorSource = "externalSwap";

        throw error;
      })
    : undefined;

  const createOrderProps = { ...p };

  if (externalSwap) {
    createOrderProps.swapPath = [];
    initialCollateralTokenAddress = p.targetCollateralAddress;
  }

  const orderParams = createOrderParams({
    p: createOrderProps,
    acceptablePrice,
    initialCollateralTokenAddress,
    subaccount,
    isNativePayment,
  });

  const tokenContract = new ethers.Contract(p.initialCollateralAddress, Token.abi);

  const tokensDestination = externalSwap ? getContract(chainId, "ExternalHandler") : orderVaultAddress;

  const multicall1 = [
    { method: "sendWnt", params: [tokensDestination, totalWntAmount] },

    !isNativePayment && !subaccount
      ? {
          method: "sendTokens",
          params: [p.initialCollateralAddress, tokensDestination, p.initialCollateralAmount],
        }
      : undefined,

    externalSwap
      ? {
          method: "makeExternalCalls",
          params: [
            [p.initialCollateralAddress, externalSwap?.to],
            [
              tokenContract.interface.encodeFunctionData("approve", [externalSwap?.to, p.initialCollateralAmount]),
              externalSwap?.data,
            ],
            [getNativeToken(chainId).wrappedAddress, p.initialCollateralAddress],
            [p.account, p.account],
          ],
        }
      : undefined,

    {
      method: "createOrder",
      params: subaccount ? [await signer.getAddress(), orderParams] : [orderParams],
    },
  ];

  const encodedData = multicall1
    .filter(Boolean)
    .map((call) => router.interface.encodeFunctionData(call!.method, call!.params));

  return encodedData;
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
      cancellationReceiver: ethers.ZeroAddress,
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
      validFromTime: 0n,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: isNativePayment,
    autoCancel: false,
    referralCode: p.referralCode || ethers.ZeroHash,
  };
}
