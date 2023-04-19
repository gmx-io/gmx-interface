import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { TokensData, convertToContractPrice, getTokenData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { formatUsd } from "lib/numbers";
import { DecreasePositionSwapType, OrderType } from "./types";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";

const { AddressZero } = ethers.constants;

export type DecreaseOrderParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  tokensData: TokensData;
  marketAddress: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: BigNumber;
  indexTokenAddress: string;
  receiveTokenAddress: string;
  triggerPrice?: BigNumber;
  sizeDeltaUsd: BigNumber;
  minOutputUsd: BigNumber;
  isLong: boolean;
  acceptablePrice: BigNumber;
  decreasePositionSwapType: DecreasePositionSwapType;
  orderType: OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease;
  setPendingTxns: (txns: any) => void;
};

export async function createDecreaseOrderTxn(chainId: number, library: Web3Provider, p: DecreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const indexToken = getTokenData(p.tokensData, p.indexTokenAddress);

  if (!indexToken?.prices) throw new Error("Index token prices are not available");

  const wntAmount = p.executionFee;

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, wntAmount] },

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped"),
            callbackContract: AddressZero,
            market: p.marketAddress,
            swapPath: p.swapPath,
          },
          numbers: {
            sizeDeltaUsd: p.sizeDeltaUsd,
            initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken.decimals),
            acceptablePrice: convertToContractPrice(p.acceptablePrice, indexToken.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: p.minOutputUsd,
          },
          orderType: p.orderType,
          decreasePositionSwapType: p.decreasePositionSwapType,
          isLong: p.isLong,
          shouldUnwrapNativeToken: isNativeReceive,
          referralCode: encodeReferralCode(p.referralCode || ""),
        },
      ],
    },
  ];

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("positionDecreaseTxn multicall", multicall);
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const primaryPriceOverrides: PriceOverrides = {};
  const secondaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice) {
    primaryPriceOverrides[p.indexTokenAddress] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
    secondaryPriceOverrides[p.indexTokenAddress] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  await simulateExecuteOrderTxn(chainId, library, {
    primaryPriceOverrides,
    secondaryPriceOverrides,
    createOrderMulticallPayload: encodedPayload,
    value: wntAmount,
    tokensData: p.tokensData,
  });

  const longText = p.isLong ? t`Long` : t`Short`;

  const orderLabel = t`Decrease ${longText} ${indexToken.symbol} by ${formatUsd(p.sizeDeltaUsd)}`;

  const txn = await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`${orderLabel} order created`,
    failMsg: t`${orderLabel} order failed`,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  });

  return txn;
}
