import { Web3Provider } from "@ethersproject/providers";
import { t } from "@lingui/macro";
import { getContract } from "config/contracts";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getCorrectTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { encodeReferralCode } from "domain/referrals";
import { convertToContractPrice } from "../tokens";
import { OrderType, orderTypeLabels } from "config/synthetics";

type Params = {
  account: string;
  marketAddress?: string;
  initialCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  receiveTokenAddress?: string;
  indexTokenAddress?: string;
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

  const indexToken = p.indexTokenAddress ? getToken(chainId, p.indexTokenAddress) : undefined;

  const acceptablePrice =
    indexToken && p.acceptablePrice
      ? convertToContractPrice(p.acceptablePrice || BigNumber.from(0), indexToken.decimals)
      : BigNumber.from(0);

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
            acceptablePrice: acceptablePrice,
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

  const orderLabel = orderTypeLabels[p.orderType];

  return callContract(chainId, contract, "multicall", [encodedPayload], {
    value: wntAmount,
    gasLimit: 10 ** 6,
    sentMsg: t`${orderLabel} order sent`,
    successMsg: t`Success ${orderLabel} order`,
    failMsg: t`${orderLabel} order failed`,
  });
}
