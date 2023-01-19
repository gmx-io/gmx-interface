import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { isDevelopment } from "config/env";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { TokensData, convertToContractPrice, convertToTokenAmount, getTokenData } from "domain/synthetics/tokens";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { formatUsd } from "lib/numbers";
import { ContractEventsContextType } from "../contractEvents";
import { getPositionKey } from "../positions";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { OrderType } from "./types";
import { getAcceptablePriceForPositionOrder, isMarketOrder } from "./utils";

const { AddressZero } = ethers.constants;

type IncreaseOrderParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  market: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  targetCollateralAddress?: string;
  indexTokenAddress: string;
  triggerPrice?: BigNumber;
  priceImpactDelta: BigNumber;
  allowedSlippage: number;
  sizeDeltaUsd: BigNumber;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  tokensData: TokensData;
  setPendingPositionUpdate: ContractEventsContextType["setPendingPositionUpdate"];
};

export async function createIncreaseOrderTxn(chainId: number, library: Web3Provider, p: IncreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderStoreAddress = getContract(chainId, "OrderStore");

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);

  const wntAmount = wntCollateralAmount.add(p.executionFee);

  const indexToken = getTokenData(p.tokensData, p.indexTokenAddress);

  if (!indexToken?.prices) throw new Error("Index token prices are not available");

  const acceptablePrice = getAcceptablePriceForPositionOrder({
    isIncrease: true,
    isLong: p.isLong,
    priceImpactDelta: p.priceImpactDelta,
    triggerPrice: p.triggerPrice,
    indexTokenPrices: indexToken.prices,
    sizeDeltaUsd: p.sizeDeltaUsd,
    allowedSlippage: p.allowedSlippage,
  });

  const multicall = [
    { method: "sendWnt", params: [orderStoreAddress, wntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderStoreAddress, p.initialCollateralAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped"),
            callbackContract: AddressZero,
            market: p.market,
            swapPath: p.swapPath,
          },
          numbers: {
            sizeDeltaUsd: p.sizeDeltaUsd,
            initialCollateralDeltaAmount: BigNumber.from(0),
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken!.decimals),
            acceptablePrice: convertToContractPrice(acceptablePrice, indexToken!.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: BigNumber.from(0),
          },
          orderType: p.orderType,
          isLong: p.isLong,
          shouldUnwrapNativeToken: isNativePayment,
        },
        encodeReferralCode(p.referralCode || ""),
      ],
    },
  ];

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("positionIncreaseTxn multicall", multicall, {
      acceptablePrice: formatUsd(acceptablePrice),
      triggerPrice: formatUsd(p.triggerPrice),
    });
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const primaryPriceOverrides: PriceOverrides = {};
  const secondaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice) {
    secondaryPriceOverrides[p.indexTokenAddress] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  } else {
    // primaryPriceOverrides[p.indexTokenAddress] = {
    //   minPrice: acceptablePrice,
    //   maxPrice: acceptablePrice,
    // };
  }

  await simulateExecuteOrderTxn(chainId, library, {
    primaryPriceOverrides,
    secondaryPriceOverrides,
    createOrderMulticallPayload: encodedPayload,
    value: wntAmount,
    tokensData: p.tokensData,
  });

  const longText = p.isLong ? t`Long` : t`Short`;
  const orderLabel = t`Increase ${longText} ${indexToken.symbol} by ${formatUsd(p.sizeDeltaUsd)}`;

  const txn = await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`${orderLabel} order created`,
    failMsg: t`${orderLabel} order failed`,
  }).then(() => {
    if (isMarketOrder(p.orderType)) {
      p.setPendingPositionUpdate({
        positionKey: getPositionKey(
          p.account,
          p.market,
          p.targetCollateralAddress || p.initialCollateralAddress,
          p.isLong
        )!,
        sizeDeltaUsd: p.sizeDeltaUsd,
        sizeDeltaInTokens: convertToTokenAmount(p.sizeDeltaUsd, indexToken.decimals, indexToken.prices?.minPrice),
        isIncrease: true,
      });
    }
  });

  return txn;
}
