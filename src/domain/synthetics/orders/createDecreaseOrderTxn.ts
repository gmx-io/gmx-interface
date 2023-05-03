import { Web3Provider } from "@ethersproject/providers";
import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { isMarketOrderType } from "./utils";

const { AddressZero } = ethers.constants;

export type DecreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: BigNumber;
  swapPath: string[];
  receiveTokenAddress: string;
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  acceptablePrice: BigNumber;
  triggerPrice: BigNumber | undefined;
  minOutputUsd: BigNumber;
  isLong: boolean;
  decreasePositionSwapType: DecreasePositionSwapType;
  orderType: OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease;
  executionFee: BigNumber;
  skipSimulation?: boolean;
  referralCode?: string;
  existingPositionKey: string | undefined;
  indexToken: Token;
  tokensData: TokensData;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
};

export async function createDecreaseOrderTxn(chainId: number, library: Web3Provider, p: DecreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(
    getContract(chainId, "ExchangeRouter"),
    ExchangeRouter.abi,
    library.getSigner()
  );

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const wntAmount = p.executionFee;

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, wntAmount] },

    {
      method: "createOrder",
      params: [
        {
          addresses: {
            receiver: p.account,
            initialCollateralToken: initialCollateralTokenAddress,
            callbackContract: AddressZero,
            market: p.marketAddress,
            swapPath: p.swapPath,
            uiFeeReceiver: ethers.constants.AddressZero,
          },
          numbers: {
            sizeDeltaUsd: p.sizeDeltaUsd,
            initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
            acceptablePrice: convertToContractPrice(p.acceptablePrice, p.indexToken.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: p.minOutputUsd,
          },
          orderType: p.orderType,
          decreasePositionSwapType: p.decreasePositionSwapType,
          isLong: p.isLong,
          shouldUnwrapNativeToken: isNativeReceive,
          referralCode: p.referralCode || ethers.constants.HashZero,
        },
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  if (!p.skipSimulation) {
    const primaryPriceOverrides: PriceOverrides = {};
    const secondaryPriceOverrides: PriceOverrides = {};

    if (p.triggerPrice) {
      primaryPriceOverrides[p.indexToken.address] = {
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
  }

  const txn = await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: wntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    if (isMarketOrderType(p.orderType) && p.existingPositionKey) {
      p.setPendingPosition({
        isIncrease: false,
        positionKey: p.existingPositionKey,
        collateralDeltaAmount: p.initialCollateralDeltaAmount,
        sizeDeltaUsd: p.sizeDeltaUsd,
        sizeDeltaInTokens: p.sizeDeltaInTokens,
      });
    }

    p.setPendingOrder({
      account: p.account,
      marketAddress: p.marketAddress,
      initialCollateralTokenAddress,
      initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
      swapPath: p.swapPath,
      sizeDeltaUsd: p.sizeDeltaUsd,
      minOutputAmount: p.minOutputUsd,
      isLong: p.isLong,
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativeReceive,
    });
  });

  return txn;
}
