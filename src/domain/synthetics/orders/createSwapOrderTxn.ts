import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { formatTokenAmount } from "lib/numbers";
import { TokensData, getTokenData } from "../tokens";
import { DecreasePositionSwapType, OrderType } from "./types";
import { simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";

const { AddressZero } = ethers.constants;

// TODO: validate same collaterals markets
export type SwapOrderParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  tokensData: TokensData;
  fromTokenAddress: string;
  fromTokenAmount: BigNumber;
  toTokenAddress: string;
  swapPath: string[];
  minOutputAmount: BigNumber;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  setPendingTxns: (txns: any) => void;
};

export async function createSwapOrderTxn(chainId: number, library: Web3Provider, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;

  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : BigNumber.from(0);

  const wntAmount = wntSwapAmount.add(p.executionFee);

  const fromToken = getTokenData(p.tokensData, p.fromTokenAddress);
  const toToken = getTokenData(p.tokensData, p.toTokenAddress);

  if (!fromToken?.prices || !toToken?.prices) {
    throw new Error("Token prices not available");
  }

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, wntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderVaultAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: convertTokenAddress(chainId, p.fromTokenAddress, "wrapped"),
            callbackContract: AddressZero,
            market: AddressZero,
            swapPath: p.swapPath,
          },
          numbers: {
            sizeDeltaUsd: BigNumber.from(0),
            initialCollateralDeltaAmount: BigNumber.from(0),
            triggerPrice: BigNumber.from(0),
            acceptablePrice: BigNumber.from(0),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: p.minOutputAmount,
          },
          orderType: p.orderType,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: isNativeReceive,
          referralCode: encodeReferralCode(p.referralCode || ""),
        },
      ],
    },
  ];

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("swapTxn multicall", {
      sendWnt: formatTokenAmount(wntAmount, 18, "WNT"),
      sendTokens: !isNativePayment
        ? formatTokenAmount(p.fromTokenAmount, fromToken.decimals, fromToken.symbol)
        : undefined,
      createOrder: {
        addresses: {
          receiver: p.account,
          initialCollateralToken: convertTokenAddress(chainId, p.fromTokenAddress, "wrapped"),
          callbackContract: AddressZero,
          market: AddressZero,
          swapPath: p.swapPath,
        },
        numbers: {
          sizeDeltaUsd: BigNumber.from(0),
          initialCollateralDeltaAmount: BigNumber.from(0),
          triggerPrice: BigNumber.from(0),
          acceptablePrice: BigNumber.from(0),
          executionFee: p.executionFee,
          callbackGasLimit: BigNumber.from(0),
          minOutputAmount: formatTokenAmount(p.minOutputAmount, toToken.decimals, toToken.symbol),
        },
      },
    });
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  // TODO: simulation for limit swaps
  if (p.orderType !== OrderType.LimitSwap) {
    await simulateExecuteOrderTxn(chainId, library, {
      primaryPriceOverrides: {},
      secondaryPriceOverrides: {},
      createOrderMulticallPayload: encodedPayload,
      value: wntAmount,
      tokensData: p.tokensData,
    });
  }

  const fromText = formatTokenAmount(p.fromTokenAmount, fromToken.decimals, fromToken.symbol);
  const toText = formatTokenAmount(p.minOutputAmount, toToken.decimals, toToken.symbol);

  const orderLabel = t`Swap ${fromText} for ${toText}`;

  return callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`${orderLabel} order created`,
    failMsg: t`${orderLabel} order failed`,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  });
}
