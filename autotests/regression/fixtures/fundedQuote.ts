import { zeroAddress, zeroHash } from "viem";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import type { PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { USD } from "../funded/economy";
export const address = "0x1111111111111111111111111111111111111111";
export const marketAddress = "0x2222222222222222222222222222222222222222";
export const usdc = {
  address: "0x3333333333333333333333333333333333333333",
  decimals: 6,
  prices: { minPrice: USD, maxPrice: USD },
} as TokenData;
export const weth = {
  address: "0x4444444444444444444444444444444444444444",
  decimals: 18,
  prices: { minPrice: 2_000n * USD, maxPrice: 2_000n * USD },
} as TokenData;
export const intent = { kind: "increase" as const, isLong: true, sizeUsd: 2n * USD, collateralAmount: 2_500_000n };

export function preparedOrder(): PrepareOrderResponse {
  const batchParams = {
    createOrderParams: [
      {
        orderPayload: {
          addresses: {
            receiver: address,
            cancellationReceiver: address,
            callbackContract: zeroAddress,
            uiFeeReceiver: zeroAddress,
            market: marketAddress,
            initialCollateralToken: usdc.address,
            swapPath: [],
          },
          numbers: {
            sizeDeltaUsd: intent.sizeUsd,
            initialCollateralDeltaAmount: intent.collateralAmount,
            triggerPrice: 0n,
            acceptablePrice: 2_006n * 10n ** 12n,
            executionFee: 100_000_000_000_000n,
            callbackGasLimit: 0n,
            minOutputAmount: 0n,
            validFromTime: 0n,
          },
          orderType: 2,
          decreasePositionSwapType: 0,
          isLong: true,
          shouldUnwrapNativeToken: false,
          autoCancel: true,
          referralCode: zeroHash,
          dataList: [],
        },
      },
    ],
    updateOrderParams: [],
    cancelOrderParams: [],
  };
  const relayParams = {
    oracleParams: { tokens: [], providers: [], data: [] },
    tokenPermits: [],
    externalCalls: {
      sendTokens: [],
      sendAmounts: [],
      externalCallTargets: [],
      externalCallDataList: [],
      refundTokens: [],
      refundReceivers: [],
    },
    fee: { feeToken: usdc.address, feeAmount: 400_000n, feeSwapPath: [] },
    deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
    userNonce: 1n,
    desChainId: 42161n,
  };
  const typedData = getBatchTypedData({
    chainId: 42161,
    account: address,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
    batchParams: batchParams as unknown as Parameters<typeof getBatchTypedData>[0]["batchParams"],
    relayParams,
  });
  return {
    requestId: "test-request",
    mode: "express",
    payloadType: "typed-data",
    payload: { typedData, batchParams, relayParams },
    estimates: {
      positionPriceImpactDeltaUsd: 0n,
      swapPriceImpactDeltaUsd: 0n,
      executionFeeAmount: 100_000_000_000_000n,
      acceptablePrice: 0n,
      sizeDeltaUsd: intent.sizeUsd,
      positionFeeUsd: USD / 1_000n,
      borrowingFeeUsd: 0n,
      fundingFeeUsd: 0n,
    },
  };
}

export function rebuildTypedData(prepared: PrepareOrderResponse) {
  prepared.payload.typedData = getBatchTypedData({
    chainId: 42161,
    account: address,
    relayRouterAddress: getContract(42161, "GelatoRelayRouter"),
    batchParams: prepared.payload.batchParams,
    relayParams: prepared.payload.relayParams,
  });
}
