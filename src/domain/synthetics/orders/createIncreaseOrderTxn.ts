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
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";

const { AddressZero } = ethers.constants;

// TODO: validate spot only
type IncreaseOrderParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
  marketAddress: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  targetCollateralAddress?: string;
  indexTokenAddress: string;
  triggerPrice?: BigNumber;
  sizeDeltaUsd: BigNumber;
  acceptablePrice: BigNumber;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  tokensData: TokensData;
  setPendingTxns: (txns: any) => void;
};

export async function createIncreaseOrderTxn(chainId: number, library: Web3Provider, p: IncreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);

  const wntAmount = wntCollateralAmount.add(p.executionFee);

  const indexToken = getTokenData(p.tokensData, p.indexTokenAddress);

  if (!indexToken?.prices) throw new Error("Index token prices are not available");

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, wntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderVaultAddress, p.initialCollateralAmount] }
      : undefined,

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
            initialCollateralDeltaAmount: BigNumber.from(0),
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken!.decimals),
            acceptablePrice: convertToContractPrice(p.acceptablePrice, indexToken!.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: BigNumber.from(0),
          },
          orderType: p.orderType,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: p.isLong,
          shouldUnwrapNativeToken: isNativePayment,
          referralCode: encodeReferralCode(p.referralCode || ""),
        },
      ],
    },
  ];

  if (isDevelopment()) {
    // eslint-disable-next-line no-console
    console.debug("positionIncreaseTxn multicall", multicall, {
      acceptablePrice: formatUsd(p.acceptablePrice),
      triggerPrice: formatUsd(p.triggerPrice),
    });
  }

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const secondaryPriceOverrides: PriceOverrides = {};
  const primaryPriceOverrides: PriceOverrides = {};

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
    tokensData: p.tokensData,
    primaryPriceOverrides,
    secondaryPriceOverrides,
    createOrderMulticallPayload: encodedPayload,
    value: wntAmount,
  });

  const longText = p.isLong ? t`Long` : t`Short`;
  const orderLabel = t`Increase ${longText} ${indexToken.symbol} by ${formatUsd(p.sizeDeltaUsd)}`;

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
