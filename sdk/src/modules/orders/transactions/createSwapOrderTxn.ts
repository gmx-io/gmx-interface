import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "configs/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "configs/tokens";

import type { GmxSdk } from "../../../index";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { TokensData } from "types/tokens";
import { isMarketOrderType } from "utils/orders";
import { applySlippageToMinOut } from "utils/trade";
import { Abi, encodeFunctionData, zeroAddress, zeroHash } from "viem";

export type SwapOrderParams = {
  fromTokenAddress: string;
  fromTokenAmount: bigint;
  toTokenAddress: string;
  swapPath: string[];
  referralCode?: string;
  tokensData: TokensData;
  minOutputAmount: bigint;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  executionFee: bigint;
  allowedSlippage: number;
};

export async function createSwapOrderTxn(sdk: GmxSdk, p: SwapOrderParams) {
  // const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;

  const { encodedPayload, totalWntAmount, minOutputAmount } = await getParams(sdk, p);
  // const { encodedPayload: simulationEncodedPayload, totalWntAmount: sumaltionTotalWntAmount } = await getParams(sdk, p);

  const initialCollateralTokenAddress = convertTokenAddress(sdk.chainId, p.fromTokenAddress, "wrapped");

  const swapOrder = {
    account: sdk.config.account,
    marketAddress: zeroAddress,
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

  // if (p.orderType !== OrderType.LimitSwap) {
  //   await simulateExecuteTxn(chainId, {
  //     account: p.account,
  //     primaryPriceOverrides: {},
  //     createMulticallPayload: simulationEncodedPayload,
  //     value: sumaltionTotalWntAmount,
  //     tokensData: p.tokensData,
  //     errorTitle: t`Order error.`,
  //   });
  // }

  await sdk.callContract(
    getContract(sdk.chainId, "ExchangeRouter"),
    ExchangeRouter.abi as Abi,
    "multicall",
    [encodedPayload],
    {
      value: totalWntAmount,
    }
  );
}

async function getParams(sdk: GmxSdk, p: SwapOrderParams) {
  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;
  const orderVaultAddress = getContract(sdk.chainId, "OrderVault");
  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : 0n;
  const totalWntAmount = wntSwapAmount + p.executionFee;

  const initialCollateralTokenAddress = convertTokenAddress(sdk.chainId, p.fromTokenAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputAmount)
    : p.minOutputAmount;

  const initialCollateralDeltaAmount = p.fromTokenAmount;

  const createOrderParams = {
    addresses: {
      receiver: sdk.config.account,
      cancellationReceiver: zeroAddress,
      initialCollateralToken: initialCollateralTokenAddress,
      callbackContract: zeroAddress,
      market: zeroAddress,
      swapPath: p.swapPath,
      uiFeeReceiver: zeroAddress,
    },
    numbers: {
      sizeDeltaUsd: 0n,
      initialCollateralDeltaAmount,
      triggerPrice: 0n,
      acceptablePrice: 0n,
      executionFee: p.executionFee,
      callbackGasLimit: 0n,
      minOutputAmount,
    },
    autoCancel: false,
    orderType: p.orderType,
    decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
    referralCode: p.referralCode || zeroHash,
  };

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderVaultAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [createOrderParams],
    },
  ];

  return {
    minOutputAmount,
    totalWntAmount,
    encodedPayload: multicall
      .filter(Boolean)
      .map((call) =>
        encodeFunctionData({ abi: ExchangeRouter.abi as Abi, functionName: call!.method, args: call!.params })
      ),
  };
}
