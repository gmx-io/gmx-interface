import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getPositionKey } from "../positions";
import { applySlippageToMinOut, applySlippageToPrice } from "../trade";
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
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode?: string;
  indexToken: Token;
  tokensData: TokensData;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
};

export async function createDecreaseOrderTxn(chainId: number, signer: Signer, p: DecreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const totalWntAmount = p.executionFee;

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const acceptablePrice = shouldApplySlippage
    ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong)
    : p.acceptablePrice;

  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd)
    : p.minOutputUsd;

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

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
            acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: minOutputAmount,
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
    await simulateExecuteOrderTxn(chainId, signer, {
      primaryPriceOverrides,
      secondaryPriceOverrides,
      createOrderMulticallPayload: encodedPayload,
      value: totalWntAmount,
      tokensData: p.tokensData,
    });
  }

  const txnCreatedAt = Date.now();
  const txnCreatedAtBlock = await signer.provider?.getBlockNumber();

  const txn = await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: p.setPendingTxns,
  }).then(() => {
    if (isMarketOrderType(p.orderType)) {
      const positionKey = getPositionKey(p.account, p.marketAddress, p.initialCollateralAddress, p.isLong);

      p.setPendingPosition({
        isIncrease: false,
        positionKey,
        collateralDeltaAmount: p.initialCollateralDeltaAmount,
        sizeDeltaUsd: p.sizeDeltaUsd,
        sizeDeltaInTokens: p.sizeDeltaInTokens,
        updatedAt: txnCreatedAt,
        updatedAtBlock: BigNumber.from(txnCreatedAtBlock),
      });
    }

    p.setPendingOrder({
      account: p.account,
      marketAddress: p.marketAddress,
      initialCollateralTokenAddress,
      initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
      swapPath: p.swapPath,
      sizeDeltaUsd: p.sizeDeltaUsd,
      minOutputAmount: minOutputAmount,
      isLong: p.isLong,
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativeReceive,
    });
  });

  return txn;
}
