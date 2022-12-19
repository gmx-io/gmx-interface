import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getCorrectTokenAddress, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";

export enum OrderType {
  // the order will be cancelled if the minOutputAmount cannot be fulfilled
  MarketSwap,
  // @dev LimitSwap: swap token A to token B if the minOutputAmount can be fulfilled
  LimitSwap,
  // @dev MarketIncrease: increase position at the current market price
  // the order will be cancelled if the position cannot be increased at the acceptablePrice
  MarketIncrease,
  // @dev LimitIncrease: increase position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitIncrease,
  // @dev MarketDecrease: decrease position at the curent market price
  // the order will be cancelled if the position cannot be decreased at the acceptablePrice
  MarketDecrease,
  // @dev LimitDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  LimitDecrease,
  // @dev StopLossDecrease: decrease position if the triggerPrice is reached and the acceptablePrice can be fulfilled
  StopLossDecrease,
  // @dev Liquidation: allows liquidation of positions if the criteria for liquidation are met
  Liquidation,
}

const orderTypeTexts = {
  [OrderType.MarketSwap]: t`Market Swap`,
  [OrderType.LimitSwap]: t`Limit Swap`,
  [OrderType.MarketIncrease]: t`Market Increase`,
  [OrderType.LimitIncrease]: t`Limit Increase`,
  [OrderType.MarketDecrease]: t`Market Decrease`,
  [OrderType.LimitDecrease]: t`Limit Decrease`,
  [OrderType.StopLossDecrease]: t`Stop Loss Decrease`,
  [OrderType.Liquidation]: t`Liquidation`,
};

type Params = {
  account: string;
  marketAddress?: string;
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  receiveTokenAddress?: string;
  swapPath: string[];
  sizeDeltaUsd?: BigNumber;
  triggerPrice?: BigNumber;
  acceptablePrice?: BigNumber;
  executionFee: BigNumber;
  isLong?: boolean;
  orderType: OrderType;
  minOutputAmount: BigNumber;
  referralCode?: string;
};

export function createOrderTxn(chainId: number, library: Web3Provider, p: Params) {
  const contract = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, library.getSigner());
  const orderStoreAddress = getContract(chainId, "OrderStore");

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const wntPayment = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);

  const wntAmount = p.executionFee.add(wntPayment);

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
            initialCollateralToken: getCorrectTokenAddress(chainId, p.initialCollateralAddress, "wrapped"),
            callbackContract: ethers.constants.AddressZero,
            market: p.marketAddress || ethers.constants.AddressZero,
            swapPath: p.swapPath,
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
          },
          numbers: {
            sizeDeltaUsd: p.sizeDeltaUsd || BigNumber.from(0),
            triggerPrice: p.triggerPrice || BigNumber.from(0),
            acceptablePrice: p.acceptablePrice || BigNumber.from(0),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: p.minOutputAmount,
          },
          orderType: p.orderType,
          isLong: p.isLong || false,
          shouldUnwrapNativeToken: isNativeReceive,
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

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    gasLimit: 10 ** 6,
    sentMsg: t`${orderTypeTexts[p.orderType]} order sent`,
    successMsg: t`Success ${orderTypeTexts[p.orderType]} order`,
    failMsg: t`${orderTypeTexts[p.orderType]} order failed`,
  });
}
