import ExchangeRouter from "abis/ExchangeRouter.json";
import { getContract } from "config/contracts";
import { NATIVE_TOKEN_ADDRESS, convertTokenAddress } from "config/tokens";
import { SetPendingOrder, SetPendingPosition } from "context/SyntheticsEvents";
import { TokenData, TokensData, convertToContractPrice } from "domain/synthetics/tokens";
import { BigNumber, Signer, ethers } from "ethers";
import { callContract } from "lib/contracts";
import { PriceOverrides, simulateExecuteOrderTxn } from "./simulateExecuteOrderTxn";
import { DecreasePositionSwapType, OrderType } from "./types";
import { isMarketOrderType } from "./utils";
import { getPositionKey } from "../positions";
import { applySlippageToPrice } from "../trade";

const { AddressZero } = ethers.constants;

type IncreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  targetCollateralAddress: string;
  initialCollateralAmount: BigNumber;
  collateralDeltaAmount: BigNumber;
  swapPath: string[];
  sizeDeltaUsd: BigNumber;
  sizeDeltaInTokens: BigNumber;
  acceptablePrice: BigNumber;
  triggerPrice: BigNumber | undefined;
  isLong: boolean;
  orderType: OrderType.MarketIncrease | OrderType.LimitIncrease;
  executionFee: BigNumber;
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode: string | undefined;
  indexToken: TokenData;
  tokensData: TokensData;
  setPendingTxns: (txns: any) => void;
  setPendingOrder: SetPendingOrder;
  setPendingPosition: SetPendingPosition;
};

export async function createIncreaseOrderTxn(chainId: number, signer: Signer, p: IncreaseOrderParams) {
  const exchangeRouter = new ethers.Contract(getContract(chainId, "ExchangeRouter"), ExchangeRouter.abi, signer);

  const orderVaultAddress = getContract(chainId, "OrderVault");

  const isNativePayment = p.initialCollateralAddress === NATIVE_TOKEN_ADDRESS;

  const wntCollateralAmount = isNativePayment ? p.initialCollateralAmount : BigNumber.from(0);
  const totalWntAmount = wntCollateralAmount.add(p.executionFee);

  const initialCollateralTokenAddress = convertTokenAddress(chainId, p.initialCollateralAddress, "wrapped");

  const shouldApplySlippage = isMarketOrderType(p.orderType);

  const acceptablePrice = shouldApplySlippage
    ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, true, p.isLong)
    : p.acceptablePrice;

  const multicall = [
    { method: "sendWnt", params: [orderVaultAddress, totalWntAmount] },

    !isNativePayment
      ? { method: "sendTokens", params: [p.initialCollateralAddress, orderVaultAddress, p.initialCollateralAmount] }
      : undefined,

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
            initialCollateralDeltaAmount: BigNumber.from(0),
            triggerPrice: convertToContractPrice(p.triggerPrice || BigNumber.from(0), p.indexToken.decimals),
            acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
            executionFee: p.executionFee,
            callbackGasLimit: BigNumber.from(0),
            minOutputAmount: BigNumber.from(0),
          },
          orderType: p.orderType,
          decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
          isLong: p.isLong,
          shouldUnwrapNativeToken: isNativePayment,
          referralCode: p.referralCode || ethers.constants.HashZero,
        },
      ],
    },
  ];

  const encodedPayload = multicall
    .filter(Boolean)
    .map((call) => exchangeRouter.interface.encodeFunctionData(call!.method, call!.params));

  const secondaryPriceOverrides: PriceOverrides = {};
  const primaryPriceOverrides: PriceOverrides = {};

  if (p.triggerPrice) {
    primaryPriceOverrides[p.indexToken.address] = {
      minPrice: p.triggerPrice,
      maxPrice: p.triggerPrice,
    };
  }

  if (!p.skipSimulation) {
    await simulateExecuteOrderTxn(chainId, signer, {
      tokensData: p.tokensData,
      primaryPriceOverrides,
      secondaryPriceOverrides,
      createOrderMulticallPayload: encodedPayload,
      value: totalWntAmount,
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
      const positionKey = getPositionKey(p.account, p.marketAddress, p.targetCollateralAddress, p.isLong);

      p.setPendingPosition({
        isIncrease: true,
        positionKey,
        collateralDeltaAmount: p.collateralDeltaAmount,
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
      initialCollateralDeltaAmount: p.initialCollateralAmount,
      swapPath: p.swapPath,
      sizeDeltaUsd: p.sizeDeltaUsd,
      minOutputAmount: BigNumber.from(0),
      isLong: p.isLong,
      orderType: p.orderType,
      shouldUnwrapNativeToken: isNativePayment,
    });
  });

  return txn;
}
