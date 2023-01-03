import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, getConvertedTokenAddress, getToken } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { TokensData, convertToContractPrice, formatUsdAmount } from "../tokens";
import { OrderType } from "./types";
import { simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { isDevelopment } from "config/env";

const { AddressZero } = ethers.constants;

type IncreaseOrderParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  tokensData: TokensData;
  market: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  indexTokenAddress: string;
  triggerPrice?: BigNumber;
  acceptablePrice: BigNumber;
  sizeDeltaUsd: BigNumber;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
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

  const indexToken = getToken(chainId, p.indexTokenAddress);

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
            initialCollateralToken: getConvertedTokenAddress(chainId, p.initialCollateralAddress, "wrapped"),
            callbackContract: AddressZero,
            market: p.market,
            swapPath: p.swapPath,
          },
          numbers: {
            sizeDeltaUsd: p.sizeDeltaUsd,
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken.decimals),
            acceptablePrice: convertToContractPrice(p.acceptablePrice, indexToken.decimals),
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
    console.debug("positionIncreaseTxn multicall", multicall);
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const longText = p.isLong ? t`Long` : t`Short`;

  const orderLabel = t`Increase ${longText} ${indexToken.symbol} by ${formatUsdAmount(p.sizeDeltaUsd)}`;

  await simulateExecuteOrderTxn(chainId, library, {
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
