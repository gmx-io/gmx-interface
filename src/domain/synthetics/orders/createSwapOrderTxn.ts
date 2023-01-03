import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, getConvertedTokenAddress } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { TokensData, formatTokenAmount, getTokenData } from "../tokens";
import { OrderType } from "./types";
import { isDevelopment } from "config/env";
import { simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";

const { AddressZero } = ethers.constants;

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
  priceImpactDeltaUsd: BigNumber;
  allowedSlippage: number;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
};

export async function createSwapOrderTxn(chainId: number, library: Web3Provider, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderStoreAddress = getContract(chainId, "OrderStore");

  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;

  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : BigNumber.from(0);

  const wntAmount = wntSwapAmount.add(p.executionFee);

  const fromToken = getTokenData(p.tokensData, p.fromTokenAddress);
  const toToken = getTokenData(p.tokensData, p.toTokenAddress);

  if (!fromToken?.prices || !toToken?.prices) {
    throw new Error("Token prices not available");
  }

  const amountOut = p.minOutputAmount.sub(p.minOutputAmount.div(10));

  const multicall = [
    { method: "sendWnt", params: [orderStoreAddress, wntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderStoreAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: getConvertedTokenAddress(chainId, p.fromTokenAddress, "wrapped"),
            callbackContract: AddressZero,
            market: AddressZero,
            swapPath: p.swapPath,
          },
          numbers: {
            sizeDeltaUsd: BigNumber.from(0),
            triggerPrice: BigNumber.from(0),
            acceptablePrice: BigNumber.from(0),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: amountOut,
          },
          orderType: p.orderType,
          isLong: false,
          shouldUnwrapNativeToken: isNativeReceive,
        },
        encodeReferralCode(p.referralCode || ""),
      ],
    },
  ];

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("swapTxn multicall", multicall, {
      minOutputAmount: formatTokenAmount(amountOut, toToken.decimals, toToken.symbol),
    });
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const fromText = formatTokenAmount(p.fromTokenAmount, fromToken.decimals, fromToken.symbol);
  const toText = formatTokenAmount(p.minOutputAmount, toToken.decimals, toToken.symbol);

  const orderLabel = t`Swap ${fromText} to ${toText}`;

  await simulateExecuteOrderTxn(chainId, library, {
    primaryPricesMap: {},
    secondaryPricesMap: {},
    createOrderMulticallPayload: encodedPayload,
    value: wntAmount,
    tokensData: p.tokensData,
  });

  return callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`${orderLabel} order created`,
    failMsg: t`${orderLabel} order failed`,
  });
}
