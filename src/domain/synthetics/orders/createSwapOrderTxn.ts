import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder } from "context/SyntheticsEvents";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { TokensData } from "../tokens";
import { simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { applySlippageToMinOut } from "../trade";
import { isMarketOrderType } from "./utils";

const { AddressZero } = ethers.constants;

export type SwapOrderParams = {
  account: string;
  fromTokenAddress: string;
  fromTokenAmount: BigNumber;
  toTokenAddress: string;
  swapPath: string[];
  referralCode?: string;
  tokensData: TokensData;
  minOutputAmount: BigNumber;
  orderType: OrderType.MarketSwap | OrderType.LimitSwap;
  executionFee: BigNumber;
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
};

export async function createSwapOrderTxn(chainId: number, signer: Signer, p: SwapOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativePayment = p.fromTokenAddress === NATIVE_TOKEN_ADDRESS;
  const isNativeReceive = p.toTokenAddress === NATIVE_TOKEN_ADDRESS;

  const wntSwapAmount = isNativePayment ? p.fromTokenAmount : BigNumber.from(0);
  const totalWntAmount = wntSwapAmount.add(p.executionFee);

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.fromTokenAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputAmount)
    : p.minOutputAmount;

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.fromTokenAddress, orderVaultAddress, p.fromTokenAmount] }
      : undefined,

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: initialCollateralTokenAddress,
            callbackContract: AddressZero,
            market: AddressZero,
            swapPath: p.swapPath,
            uiFeeReceiver: ethers.constants.AddressZero,
          },
          numbers: {
            sizeDeltaUsd: BigNumber.from(0),
            initialCollateralDeltaAmount: BigNumber.from(0),
            triggerPrice: BigNumber.from(0),
            acceptablePrice: BigNumber.from(0),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount,
          },
          orderType: p.orderType,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: false,
          shouldUnwrapNativeToken: isNativeReceive,
          referralCode: p.referralCode || ethers.constants.HashZero,
        },
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  if (p.orderType !== OrderType.LimitSwap) {
    await simulateExecuteOrderTxn(chainId, signer, {
      primaryPriceOverrides: {},
      secondaryPriceOverrides: {},
      createOrderMulticallPayload: encodedPayload,
      value: totalWntAmount,
      tokensData: p.tokensData,
    });
  }

  return callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    p.setPendingOrder({
      account: p.account,
      marketAddress: AddressZero,
      initialCollateralTokenAddress,
      initialCollateralDeltaAmount: p.fromTokenAmount,
      swapPath: p.swapPath,
      sizeDeltaUsd: BigNumber.from(0),
      minOutputAmount,
      isLong: false,
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativeReceive,
    });
  });
}
