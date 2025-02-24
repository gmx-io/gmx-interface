import { t } from "@lingui/macro";
import ExchangeRouter from "sdk/abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "sdk/configs/tokens";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { PendingOrderData, SetPendingOrder } from "context/SyntheticsEvents";
import { Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { TokensData } from "../tokens";
import { applySlippageToMinOut } from "../trade";
import { simulateExecuteTxn } from "./simulateExecuteTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { isMarketOrderType } from "sdk/utils/orders";
import { OrderMetricId } from "lib/metrics/types";
import { prepareOrderTxn } from "./prepareOrderTxn";
import { validateSignerAddress } from "lib/contracts/transactionErrors";
import { BlockTimestampData } from "lib/useBlockTimestampRequest";

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
};

export async function createSwapOrderTxn(chainId: number, signer: Signer, subaccount: Subaccount, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;

  await validateSignerAddress(signer, p.account);

  const { encodedPayload, totalWntAmount, minOutputAmount } = await getParams(router, signer, subaccount, chainId, p);
  const { encodedPayload: simulationEncodedPayload, totalWntAmount: sumaltionTotalWntAmount } = await getParams(
    exchangeRouter,
    signer,
    null,
    chainId,
    p
  );

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.fromTokenAddress, "wrapped");

  const swapOrder: PendingOrderData = {
    account: p.account,
    marketAddress: ZeroAddress,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount: p.fromTokenAmount,
    swapPath: p.swapPath,
    sizeDeltaUsd: 0n,
    minOutputAmount,
    isLong: false,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: p.referralCode,
    txnType: "create",
  };

  if (subaccount) {
    p.setPendingOrder(swapOrder);
  }

  const simulationPromise =
    !p.skipSimulation && p.orderType !== OrderType.LimitSwap
      ? simulateExecuteTxn(chainId, {
          account: p.account,
          primaryPriceOverrides: {},
          createMulticallPayload: simulationEncodedPayload,
          value: sumaltionTotalWntAmount,
          tokensData: p.tokensData,
          errorTitle: t`Order error.`,
          metricId: p.metricId,
          blockTimestampData: p.blockTimestampData,
        })
      : undefined;

  const { gasLimit, gasPriceData, customSignersGasLimits, customSignersGasPrices, bestNonce } = await prepareOrderTxn(
    chainId,
    router,
    "multicall",
    [encodedPayload],
    totalWntAmount,
    subaccount?.customSigners,
    simulationPromise,
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
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : 0n;
  const totalWntAmount = wntSwapAmount + p.executionFee;

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.fromTokenAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputAmount)
    : p.minOutputAmount;

  const initialCollateralDeltaAmount = subaccount ? p.fromTokenAmount : 0n;
  console.log("--------> p.triggerRatio", p.triggerRatio);
  const createOrderParams = {
    addresses: {
      receiver: p.account,
      cancellationReceiver: ethers.ZeroAddress,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: ZeroAddress,
      market: ZeroAddress,
      swapPath: p.swapPath,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.ZeroAddress,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount,
      /**
       * We're passing trigger ratio in here to display actual ratio in table of positions
       * @see https://app.asana.com/0/1207525044994982/1209109731071143/f
       */
      triggerPrice: p.triggerRatio,
      acceptablePrice: 0n,
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount,
      validFromTime: 0n,
    },
    autoCancel: false,
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: p.referralCode || ethers.ZeroHash,
  };

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment && !subaccount
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderVaultAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: subaccount ? [await signer.getAddress(), createOrderParams] : [createOrderParams],
    },
  ];

  return {
    minOutputAmount,
    totalWntAmount,
    encodedPayload: multicall
      .filter(Boolean)
      .map((call) => router.interface.encodeFunctionData(call!.method, call!.params)),
  };
}
