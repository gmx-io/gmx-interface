import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { isMarketOrderType } from "./utils";
import { getPositionKey } from "../positions";
import { applySlippageToPrice } from "../trade";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";
import { getSubaccountRouterContract } from "../subaccount/getSubaccountContract";
import { Subaccount } from "context/SubaccountContext/SubaccountContext";
import { DecreaseOrderParams, createDecreaseEncodedPayload, getPendingOrderFromParams } from "./createDecreaseOrderTxn";

const { AddressZero } = ethers.constants;

type IncreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  targetCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  collateralDeltaAmount: BigNumber;
  swapPath: string[];
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  acceptablePrice: BigNumber;
  triggerPrice: BigNumber | undefined;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  executionFee: BigNumber;
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode: string | undefined;
  indexToken: TokenData;
  tokensData: TokensData;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
};

export async function createIncreaseOrderTxn(
  chainId: number,
  signer: Signer,
  subaccount: Subaccount,
  p: IncreaseOrderParams,
  decreaseOrderParams?: DecreaseOrderParams[]
) {
  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  subaccount = isNativePayment ? null : subaccount;

  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);
  const router = subaccount ? getSubaccountRouterContract(chainId, subaccount.signer) : exchangeRouter;
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);
  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");
  const shouldApplySlippage = isMarketOrderType(p.orderType);
  const acceptablePrice = shouldApplySlippage
    ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong)
    : p.acceptablePrice;

  const wntAmountToIncrease = wntCollateralAmount.add(p.executionFee);
  const totalWntAmount = (decreaseOrderParams || []).reduce((acc, p) => acc.add(p.executionFee), wntAmountToIncrease);

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
    ps: decreaseOrderParams || [],
    subaccount,
    mainAccountAddress: p.account,
    chainId,
  });

  const secondaryPriceOverrides: PriceOverrides = {};
  const primaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice) {
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

  const finalPayload = [...encodedPayload, ...decreaseEncodedPayload];
  const txnCreatedAt = Date.now();
  const txnCreatedAtBlock = await signer.provider?.getBlockNumber();
  const txn = await callContract(chainId, router, "multicall", [finalPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    if (isMarketOrderType(p.orderType)) {
      const positionKey = getPositionKey(p.account, p.marketAddress, p.targetCollateralAddress, p.isLong);

      p.setPendingPosition({
        isIncrease: true,
        positionKey,
        collateralDeltaAmount: p.collateralDeltaAmount,
        sizeDeltaUsd: p.sizeDeltaUsd,
        sizeDeltaInTokens: p.sizeDeltaInTokens,
        updatedAt: txnCreatedAt,
        updatedAtBlock: BigNumber.from(txnCreatedAtBlock),
      });
    }

    const increaseOrder = {
      account: p.account,
      marketAddress: p.marketAddress,
      initialCollateralTokenAddress,
      initialCollateralDeltaAmount: p.initialCollateralAmount,
      swapPath: p.swapPath,
      sizeDeltaUsd: p.sizeDeltaUsd,
      minOutputAmount: BigNumber.from(0),
      isLong: p.isLong,
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativePayment,
    };
    const orders = decreaseOrderParams?.map((p) => getPendingOrderFromParams(chainId, p)) || [];

    p.setPendingOrder([increaseOrder, ...orders]);
  });

  return txn;
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
  totalWntAmount: BigNumber;
  p: IncreaseOrderParams;
  acceptablePrice: BigNumber;
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
  acceptablePrice: BigNumber;
  initialCollateralTokenAddress: string;
  subaccount: Subaccount | null;
  isNativePayment: boolean;
}) {
  return {
    addresses: {
      receiver: p.account,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: AddressZero,
      market: p.marketAddress,
      swapPath: p.swapPath,
      uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.constants.AddressZero,
    },
    numbers: {
      sizeDeltaUsd: p.sizeDeltaUsd,
      initialCollateralDeltaAmount: subaccount ? p.initialCollateralAmount : BigNumber.from(0),
      triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
      acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
      executionFee: p.executionFee,
      callbackGasLimit: BigNumber.from(0),
      minOutputAmount: BigNumber.from(0),
    },
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: p.isLong,
    shouldUnwrapNativeToken: isNativePayment,
    referralCode: p.referralCode || ethers.constants.HashZero,
  };
}
