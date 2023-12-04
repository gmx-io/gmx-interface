import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingFundingFeeSettlement, SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { getPositionKey } from "../positions";
import { applySlippageToMinOut, applySlippageToPrice } from "../trade";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { isMarketOrderType } from "./utils";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { t } from "@lingui/macro";

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
};

export type DecreaseOrderCallbacks = {
  setPendingTxns: (txns: any) => void;
  setPendingOrder?: SetPendingOrder;
  setPendingPosition?: SetPendingPosition;
  setPendingFundingFeeSettlement?: SetPendingFundingFeeSettlement;
};

export async function createDecreaseOrderTxn(
  chainId: number,
  signer: Signer,
  params: DecreaseOrderParams | DecreaseOrderParams[],
  callbacks: DecreaseOrderCallbacks
) {
  const ps = Array.isArray(params) ? params : [params];
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const orderVaultAddress = getContract(chainId, "OrderVault");
  const totalWntAmount = ps.reduce((acc, p) => acc.add(p.executionFee), BigNumber.from(0));

  const multicall = [
    ...ps.flatMap((p) => {
      const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

      const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

      const shouldApplySlippage = isMarketOrderType(p.orderType);

      const acceptablePrice = shouldApplySlippage
        ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong)
        : p.acceptablePrice;

      const minOutputAmount = shouldApplySlippage
        ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd)
        : p.minOutputUsd;
      return [
        { method: "sendWnt", params: [orderVaultAddress, p.executionFee] },
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
                uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? ethers.constants.AddressZero,
              },
              numbers: {
                sizeDeltaUsd: p.sizeDeltaUsd,
                initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
                triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
                acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
                executionFee: p.executionFee,
                callbackGasLimit: BigNumber.from(0),
                minOutputAmount,
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
    }),
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  ps.forEach(async (p) => {
    if (!p.skipSimulation) {
      const primaryPriceOverrides: PriceOverrides = {};
      const secondaryPriceOverrides: PriceOverrides = {};
      if (p.triggerPrice) {
        primaryPriceOverrides[p.indexToken.address] = {
          minPrice: p.triggerPrice,
          maxPrice: p.triggerPrice,
        };
      }
      await simulateExecuteOrderTxn(chainId, {
        account: p.account,
        primaryPriceOverrides,
        secondaryPriceOverrides,
        createOrderMulticallPayload: encodedPayload,
        value: totalWntAmount,
        tokensData: p.tokensData,
        errorTitle: t`Order error.`,
      });
    }
  });

  const txnCreatedAt = Date.now();
  const txnCreatedAtBlock = await signer.provider?.getBlockNumber();

  const txn = await callContract(chainId, exchangeRouter, "multicall", [encodedPayload], {
    value: totalWntAmount,
    hideSentMsg: true,
    hideSuccessMsg: true,
    setPendingTxns: callbacks.setPendingTxns,
  }).then(() => {
    ps.forEach((p) => {
      if (isMarketOrderType(p.orderType)) {
        if (callbacks.setPendingPosition) {
          callbacks.setPendingPosition(getPendingPositionFromParams(txnCreatedAt, txnCreatedAtBlock, p));
        }
      }

      if (callbacks.setPendingOrder) {
        callbacks.setPendingOrder(getPendingOrderFromParams(chainId, p));
      }
    });

    if (callbacks.setPendingFundingFeeSettlement) {
      callbacks.setPendingFundingFeeSettlement({
        orders: ps.map((p) => getPendingOrderFromParams(chainId, p)),
        positions: ps.map((p) => getPendingPositionFromParams(txnCreatedAt, txnCreatedAtBlock, p)),
      });
    }
  });

  return txn;
}

function getPendingOrderFromParams(chainId: number, p: DecreaseOrderParams) {
  const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

  const shouldApplySlippage = isMarketOrderType(p.orderType);
  const minOutputAmount = shouldApplySlippage
    ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd)
    : p.minOutputUsd;
  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

  return {
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
  };
}

function getPendingPositionFromParams(
  txnCreatedAt: number,
  txnCreatedAtBlock: number | undefined,
  p: DecreaseOrderParams
) {
  const positionKey = getPositionKey(p.account, p.marketAddress, p.initialCollateralAddress, p.isLong);
  return {
    isIncrease: false,
    positionKey,
    collateralDeltaAmount: p.initialCollateralDeltaAmount,
    sizeDeltaUsd: p.sizeDeltaUsd,
    sizeDeltaInTokens: p.sizeDeltaInTokens,
    updatedAt: txnCreatedAt,
    updatedAtBlock: BigNumber.from(txnCreatedAtBlock),
  };
}
