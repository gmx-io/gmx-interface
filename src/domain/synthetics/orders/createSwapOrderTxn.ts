import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, PendingOrderData } from "context/SyntheticsEvents";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { TokensData } from "../tokens";
import { simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { applySlippageToMinOut } from "../trade";
import { isMarketOrderType } from "./utils";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";

const { AddressZero } = ethers.constants;

export type SwapOrderParams = {
  account: string;
  fromTokenAddress: string;
  fromTokenAmount: BigNumber;
  toTokenAddress: string;
  swapPath: string[];
  referralCode?: string;
  tokensData: TokensData;
  minOutputAmount: BigNumber;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  executionFee: BigNumber;
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
};

export async function createSwapOrderTxn(chainId: number, signer: Signer, subaccount: Subaccount, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;

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
    marketAddress: AddressZero,
    initialCollateralTokenAddress,
    initialCollateralDeltaAmount: p.fromTokenAmount,
    swapPath: p.swapPath,
    sizeDeltaUsd: BigNumber.from(0),
    minOutputAmount,
    isLong: false,
    orderType: p.orderType,
    shouldUnwrapNativeToken: isNativeReceive,
    txnType: "create",
  };

  if (subaccount) {
    p.setPendingOrder(swapOrder);
  }

  if (p.orderType !== OrderType.LimitSwap) {
    await simulateExecuteOrderTxn(chainId, {
      account: p.account,
      primaryPriceOverrides: {},
      secondaryPriceOverrides: {},
      createOrderMulticallPayload: simulationEncodedPayload,
      value: sumaltionTotalWntAmount,
      tokensData: p.tokensData,
      errorTitle: t`Order error.`,
    });
  }

  await callContract(chainId, router, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
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
  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : BigNumber.from(0);
  const totalWntAmount = wntSwapAmount.add(p.executionFee);

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.fromTokenAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputAmount)
    : p.minOutputAmount;

  const initialCollateralDeltaAmount = subaccount ? p.fromTokenAmount : BigNumber.from(0);

  const createOrderParams = {
    addresses: {
      receiver: p.account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: AddressZero,
      market: AddressZero,
      swapPath: p.swapPath,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.constants.AddressZero,
    },
    numbers: {
      sizeDeltaUsd: BigNumber.from(0),
      initialCollateralDeltaAmount,
      triggerPrice: BigNumber.from(0),
      acceptablePrice: BigNumber.from(0),
      executionFee: p.executionFee,
      callbackGasLimit: BigNumber.from(0),
      minOutputAmount,
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: p.referralCode || ethers.constants.HashZero,
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
