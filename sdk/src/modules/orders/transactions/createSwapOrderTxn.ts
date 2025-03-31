import { Abi, encodeFunctionData, zeroAddress, zeroHash } from "viem";

import { abis } from "abis";
import { getContract } from "configs/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "configs/tokens";
import { DecreasePositionSwapType, OrderType } from "types/orders";
import { TokensData } from "types/tokens";
import { isMarketOrderType } from "utils/orders";
import { simulateExecuteOrder } from "utils/simulateExecuteOrder";
import { applySlippageToMinOut } from "utils/trade";

import type { GmxSdk } from "../../..";

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
  triggerPrice?: bigint;
};

export async function createSwapOrderTxn(sdk: GmxSdk, p: SwapOrderParams) {
  const { encodedPayload, totalWntAmount } = await getParams(sdk, p);
  const { encodedPayload: simulationEncodedPayload, totalWntAmount: sumaltionTotalWntAmount } = await getParams(sdk, p);

  if (p.orderType !== OrderType.LimitSwap) {
    await simulateExecuteOrder(sdk, {
      primaryPriceOverrides: {},
      createMulticallPayload: simulationEncodedPayload,
      value: sumaltionTotalWntAmount,
      tokensData: p.tokensData,
    });
  }

  await sdk.callContract(
    getContract(sdk.chainId, "ExchangeRouter"),
    abis.ExchangeRouter as Abi,
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
      triggerPrice: p.triggerPrice !== undefined ? p.triggerPrice : 0n,
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
        encodeFunctionData({ abi: abis.ExchangeRouter as Abi, functionName: call!.method, args: call!.params })
      ),
  };
}
