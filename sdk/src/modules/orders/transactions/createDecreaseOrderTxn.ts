import { getContract } from "configs/contracts";

import type { GmxSdk } from "../../../index";
import type { DecreasePositionSwapType, OrderType } from "types/orders";
import type { Token, TokensData } from "types/tokens";
import type { PriceOverrides } from "./createIncreaseOrderTxn";

import ExchangeRouter from "abis/ExchangeRouter.json";
import { convertTokenAddress, NATIVE_TOKEN_ADDRESS } from "configs/tokens";
import { isMarketOrderType } from "utils/orders";
import { convertToContractPrice } from "utils/tokens";
import { applySlippageToMinOut, applySlippageToPrice } from "utils/trade";
import { Abi, encodeFunctionData, zeroAddress, zeroHash } from "viem";
import { simulateExecuteOrder } from "utils/simulateExecuteOrder";

export type DecreaseOrderParams = {
  account: string;
  marketAddress: string;
  initialCollateralAddress: string;
  initialCollateralDeltaAmount: bigint;
  swapPath: string[];
  receiveTokenAddress: string;
  sizeDeltaUsd: bigint;
  sizeDeltaInTokens: bigint;
  acceptablePrice: bigint;
  triggerPrice: bigint | undefined;
  minOutputUsd: bigint;
  isLong: boolean;
  decreasePositionSwapType: DecreasePositionSwapType;
  orderType: OrderType.MarketDecrease | OrderType.LimitDecrease | OrderType.StopLossDecrease;
  executionFee: bigint;
  allowedSlippage: number;
  skipSimulation?: boolean;
  referralCode?: string;
  indexToken: Token;
  tokensData: TokensData;
  autoCancel: boolean;
};

export async function createDecreaseOrderTxn(sdk: GmxSdk, params: DecreaseOrderParams | DecreaseOrderParams[]) {
  const chainId = sdk.chainId;
  const ps = Array.isArray(params) ? params : [params];
  const orderVaultAddress = getContract(chainId, "OrderVault");
  const totalWntAmount = ps.reduce((acc, p) => acc + p.executionFee, 0n);

  const encodedPayload = createDecreaseEncodedPayload({
    sdk,
    orderVaultAddress,
    ps,
  });

  const simulationEncodedPayload = createDecreaseEncodedPayload({
    sdk,
    orderVaultAddress,
    ps,
  });

  await Promise.all(
    ps.map(async (p) => {
      if (!p.skipSimulation) {
        const primaryPriceOverrides: PriceOverrides = {};
        if (p.triggerPrice != undefined) {
          primaryPriceOverrides[p.indexToken.address] = {
            minPrice: p.triggerPrice,
            maxPrice: p.triggerPrice,
          };
        }
        await simulateExecuteOrder(sdk, {
          primaryPriceOverrides,
          createMulticallPayload: simulationEncodedPayload,
          value: totalWntAmount,
          tokensData: p.tokensData,
        });
      }
    })
  );

  const routerAddress = getContract(chainId, "ExchangeRouter");

  await sdk.callContract(routerAddress, ExchangeRouter.abi as Abi, "multicall", [encodedPayload], {
    value: totalWntAmount,
  });
}

export function createDecreaseEncodedPayload({
  sdk,
  orderVaultAddress,
  ps,
}: {
  sdk: GmxSdk;
  orderVaultAddress: string;
  ps: DecreaseOrderParams[];
}) {
  const multicall = [
    ...ps.flatMap((p) => {
      const isNativeReceive = p.receiveTokenAddress === NATIVE_TOKEN_ADDRESS;

      const initialCollateralTokenAddress = convertTokenAddress(sdk.chainId, p.initialCollateralAddress, "wrapped");

      const shouldApplySlippage = isMarketOrderType(p.orderType);

      const acceptablePrice = shouldApplySlippage
        ? applySlippageToPrice(p.allowedSlippage, p.acceptablePrice, false, p.isLong)
        : p.acceptablePrice;

      const minOutputAmount = shouldApplySlippage
        ? applySlippageToMinOut(p.allowedSlippage, p.minOutputUsd)
        : p.minOutputUsd;
      const orderParams = {
        addresses: {
          cancellationReceiver: zeroAddress,
          receiver: p.account,
          initialCollateralToken: initialCollateralTokenAddress,
          callbackContract: zeroAddress,
          market: p.marketAddress,
          swapPath: p.swapPath,
          uiFeeReceiver: zeroAddress,
        },
        numbers: {
          sizeDeltaUsd: p.sizeDeltaUsd,
          initialCollateralDeltaAmount: p.initialCollateralDeltaAmount,
          triggerPrice: convertToContractPrice(p.triggerPrice ?? 0n, p.indexToken.decimals),
          acceptablePrice: convertToContractPrice(acceptablePrice, p.indexToken.decimals),
          executionFee: p.executionFee,
          callbackGasLimit: 0n,
          minOutputAmount,
          validFromTime: 0n,
        },
        orderType: p.orderType,
        decreasePositionSwapType: p.decreasePositionSwapType,
        isLong: p.isLong,
        shouldUnwrapNativeToken: isNativeReceive,
        autoCancel: p.autoCancel,
        referralCode: p.referralCode || zeroHash,
      };

      return [
        { method: "sendWnt", params: [orderVaultAddress, p.executionFee] },
        {
          method: "createOrder",
          params: [orderParams],
        },
      ];
    }),
  ];

  return multicall.filter(Boolean).map((call) =>
    encodeFunctionData({
      abi: ExchangeRouter.abi as Abi,
      functionName: call!.method,
      args: call!.params,
    })
  );
}
