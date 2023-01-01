import { Web3Provider } from "@ethersproject/providers";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getConvertedTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { convertToContractPrice } from "../tokens";
import { OrderType } from "./types";
import { orderTypeLabels } from "./constants";
import { callContract } from "lib/contracts";
import { t } from "@lingui/macro";

type CommonParams = {
  account: string;
  executionFee: BigNumber;
  referralCode?: string;
};

// TODO separate by Order type
type PositionParams = CommonParams & {
  marketAddress: string;
  swapPath: string[];
  initialCollateralAddress: string;
  initialCollateralAmount?: BigNumber;
  indexTokenAddress: string;
  minOutputAmount?: BigNumber;
  triggerPrice?: BigNumber;
  acceptablePrice?: BigNumber;
  receiveTokenAddress?: string;
  sizeDeltaUsd?: BigNumber;
  isLong: boolean;
  orderType:
    | OrderType.MarketIncrease
    | OrderType.LimitIncrease
    | OrderType.MarketDecrease
    | OrderType.LimitDecrease
    | OrderType.StopLossDecrease;
};

type SwapParams = CommonParams & {
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  swapPath: string[];
  receiveTokenAddress: string;
  minOutputAmount: BigNumber;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
};

type Params = PositionParams | SwapParams;

// TODO: unit tests
export async function createOrderTxn(chainId: number, library: Web3Provider, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());
  const orderStoreAddress = getContract(chainId, "OrderStore");

  const isIncreaseOrder = [
    OrderType.MarketIncrease,
    OrderType.LimitIncrease,
    OrderType.MarketSwap,
    OrderType.LimitSwap,
  ].includes(p.orderType);

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  const wntPayment =
    isIncreaseOrder && isNativePayment && p.initialCollateralAmount ? p.initialCollateralAmount : BigNumber.from(0);
  const wntAmount = p.executionFee.add(wntPayment);

  const isSwapOrder = p.orderType === OrderType.MarketSwap || p.orderType === OrderType.LimitSwap;

  const txnParams = isSwapOrder ? getSwapTxnParams(p) : getPositionTxnParams(p as PositionParams, chainId);

  const multicall = [
    { method: "sendWnt", params: [orderStoreAddress, wntAmount] },

    isIncreaseOrder && !isNativePayment && p.initialCollateralAmount
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderStoreAddress, p.initialCollateralAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: p.initialCollateralAddress
              ? getConvertedTokenAddress(chainId, p.initialCollateralAddress, "wrapped")
              : ethers.constants.AddressZero,
            callbackContract: ethers.constants.AddressZero,
            market: txnParams.market,
            swapPath: p.swapPath,
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
          },
          numbers: {
            sizeDeltaUsd: txnParams.sizeDeltaUsd,
            triggerPrice: txnParams.triggerPrice,
            acceptablePrice: txnParams.acceptablePrice,
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: txnParams.minOutputAmount,
          },
          orderType: p.orderType,
          isLong: txnParams.isLong,
          shouldUnwrapNativeToken: txnParams.shouldUnwrapNativeToken,
        },
        encodeReferralCode(p.referralCode || ""),
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => contract.interface.encodeFunctionData(call!.method, call!.params));

  // eslint-disable-next-line no-console
  console.log("multicall", multicall);

  const orderLabel = orderTypeLabels[p.orderType];

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`Success ${orderLabel} order`,
    failMsg: t`${orderLabel} order failed`,
  });
}

function getSwapTxnParams(p: SwapParams) {
  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  return {
    market: ethers.constants.AddressZero,
    sizeDeltaUsd: BigNumber.from(0),
    triggerPrice: BigNumber.from(0),
    acceptablePrice: BigNumber.from(0),
    minOutputAmount: p.minOutputAmount.div(2),
    isLong: false,
    shouldUnwrapNativeToken: isNativeReceive,
  };
}

function getPositionTxnParams(p: PositionParams, chainId: number) {
  const indexToken = getToken(chainId, p.indexTokenAddress);

  const acceptablePrice = convertToContractPrice(p.acceptablePrice || BigNumber.from(0), indexToken.decimals);
  const triggerPrice = convertToContractPrice(p.triggerPrice || BigNumber.from(0), indexToken.decimals);

  return {
    market: p.marketAddress,
    sizeDeltaUsd: p.sizeDeltaUsd || BigNumber.from(0),
    triggerPrice,
    acceptablePrice: acceptablePrice,
    minOutputAmount: p.minOutputAmount || BigNumber.from(0),
    isLong: p.isLong,
    shouldUnwrapNativeToken: false,
  };
}
