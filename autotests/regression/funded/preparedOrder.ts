import { getAddress, hashTypedData, maxUint256, zeroAddress } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import { hashSubaccountApproval } from "../../../sdk/src/utils/subaccount/hashSubaccountApproval";
import type { RelayParamsPayload } from "../../../sdk/src/utils/express/types";
import type { BatchOrderTxnParams } from "../../../sdk/src/utils/orderTransactions/utils";
import type { PrepareOrderResponse } from "../../../sdk/src/utils/orderTransactions/api";
import type { TokenData } from "../../../sdk/src/utils/tokens/types";
import { convertToUsd } from "../../../sdk/src/utils/tokens/utils";

import { economy, USD } from "./economy";

export type OrderIntent =
  | {
      kind: "increase";
      isLong: boolean;
      sizeUsd: bigint;
      collateralAmount: bigint;
      orderType?: 2 | 3 | 8;
      triggerPrice?: bigint;
      twap?: { start: number; end: number };
    }
  | {
      kind: "close";
      isLong: boolean;
      sizeUsd: bigint;
      collateralAmount: bigint;
      orderType?: 4 | 5 | 6;
      triggerPrice?: bigint;
    }
  | {
      kind: "edit";
      key: string;
      sizeUsd: bigint;
      triggerPrice: bigint;
      acceptablePrice: bigint;
      autoCancel: boolean;
      minOutputAmount: bigint;
      validFromTime: bigint;
    }
  | { kind: "cancel"; keys: string[] }
  | { kind: "swap"; tokenIn: string; amount: bigint; minOutputAmount: bigint; unwrapNative: boolean };

export function inspectPreparedOrder({
  prepared,
  intent,
  address,
  marketAddress,
  usdc,
  weth,
  subaccountApproval,
}: {
  prepared: PrepareOrderResponse;
  intent: OrderIntent;
  address: string;
  marketAddress: string;
  usdc: TokenData;
  weth: TokenData;
  subaccountApproval?: Record<string, any>;
}) {
  const fail = () => {
    throw new Error("Prepared order differs from the permitted economy action");
  };
  if (prepared.mode !== "express" || prepared.payloadType !== "typed-data" || !prepared.requestId) fail();
  const { typedData, batchParams, relayParams } = prepared.payload;
  if (!typedData || !batchParams || !relayParams) fail();
  const router = getContract(42161, subaccountApproval ? "SubaccountRouter" : "GelatoRelayRouter");
  if (
    getAddress(typedData.domain.verifyingContract) !== getAddress(router) ||
    Number(typedData.domain.chainId) !== 42161
  )
    fail();
  const expected = getBatchTypedData({
    chainId: 42161,
    account: address,
    batchParams: batchParams as BatchOrderTxnParams,
    relayParams: relayParams as RelayParamsPayload,
    relayRouterAddress: router,
    subaccountApprovalHash: subaccountApproval ? hashSubaccountApproval(subaccountApproval) : undefined,
  });
  if (hashTypedData({ ...expected, primaryType: "Batch" }) !== hashTypedData({ ...typedData, primaryType: "Batch" }))
    fail();
  if (Number(relayParams.desChainId) !== 42161 || BigInt(relayParams.deadline) <= BigInt(Math.floor(Date.now() / 1000)))
    fail();
  if (!Array.isArray(relayParams.tokenPermits) || relayParams.tokenPermits.length) fail();
  for (const field of [
    "sendTokens",
    "sendAmounts",
    "externalCallTargets",
    "externalCallDataList",
    "refundTokens",
    "refundReceivers",
  ]) {
    if (!Array.isArray(relayParams.externalCalls?.[field]) || relayParams.externalCalls[field].length) fail();
  }
  const {
    createOrderParamsList: creates,
    updateOrderParamsList: updates,
    cancelOrderKeys: cancels,
  } = typedData.message;
  if (!Array.isArray(creates) || !Array.isArray(updates) || !Array.isArray(cancels)) fail();
  if (intent.kind === "edit") {
    if (creates.length || cancels.length || updates.length !== 1) fail();
    const update = updates[0];
    if (
      update.key !== intent.key ||
      BigInt(update.sizeDeltaUsd) !== intent.sizeUsd ||
      BigInt(update.triggerPrice) !== intent.triggerPrice ||
      BigInt(update.acceptablePrice) !== intent.acceptablePrice ||
      update.autoCancel !== intent.autoCancel ||
      BigInt(update.executionFeeIncrease) !== 0n ||
      BigInt(update.minOutputAmount) !== intent.minOutputAmount ||
      BigInt(update.validFromTime) !== intent.validFromTime ||
      intent.sizeUsd > economy.positionLimitUsd
    )
      fail();
  } else if (intent.kind === "cancel") {
    if (
      creates.length ||
      updates.length ||
      cancels.length !== intent.keys.length ||
      cancels.some((key: string) => !intent.keys.includes(key))
    )
      fail();
  } else {
    const twap = intent.kind === "increase" ? intent.twap : undefined;
    if (creates.length !== (twap ? 2 : 1) || cancels.length || updates.length) fail();
    if (
      intent.kind === "increase" &&
      twap &&
      (creates.reduce((sum, o) => sum + BigInt(o.numbers.sizeDeltaUsd), 0n) !== intent.sizeUsd ||
        creates.reduce((sum, o) => sum + BigInt(o.numbers.initialCollateralDeltaAmount), 0n) !==
          intent.collateralAmount)
    )
      fail();
    for (const order of creates) {
      const { addresses, numbers } = order;
      for (const receiver of [addresses.receiver, addresses.cancellationReceiver]) {
        if (![getAddress(address), zeroAddress].includes(getAddress(receiver))) fail();
      }
      if (
        getAddress(addresses.callbackContract) !== zeroAddress ||
        getAddress(addresses.uiFeeReceiver) !== zeroAddress ||
        BigInt(numbers.callbackGasLimit) !== 0n ||
        (twap
          ? Number(numbers.validFromTime) < twap.start || Number(numbers.validFromTime) > twap.end
          : BigInt(numbers.validFromTime) !== 0n) ||
        BigInt(numbers.triggerPrice) !==
          (twap && intent.kind === "increase"
            ? intent.isLong
              ? maxUint256
              : 0n
            : intent.kind === "increase" || intent.kind === "close"
              ? intent.triggerPrice ?? 0n
              : 0n) ||
        addresses.swapPath.some((market: string) => getAddress(market) !== getAddress(marketAddress)) ||
        addresses.swapPath.length > 1
      )
        fail();
      if (intent.kind === "swap") {
        if (
          Number(order.orderType) !== 0 ||
          getAddress(addresses.initialCollateralToken) !== getAddress(intent.tokenIn) ||
          BigInt(numbers.initialCollateralDeltaAmount) !== intent.amount ||
          BigInt(numbers.sizeDeltaUsd) !== 0n ||
          BigInt(numbers.minOutputAmount) < intent.minOutputAmount ||
          addresses.swapPath.length !== 1 ||
          order.shouldUnwrapNativeToken !== intent.unwrapNative
        )
          fail();
      } else {
        if (
          getAddress(addresses.market) !== getAddress(marketAddress) ||
          getAddress(addresses.initialCollateralToken) !== getAddress(usdc.address) ||
          Number(order.orderType) !== (intent.orderType ?? (intent.kind === "increase" ? 2 : 4)) ||
          order.isLong !== intent.isLong ||
          (!twap && BigInt(numbers.sizeDeltaUsd) !== intent.sizeUsd) ||
          intent.sizeUsd > economy.positionLimitUsd ||
          BigInt(numbers.acceptablePrice) <= 0n
        )
          fail();
        if (
          intent.kind === "increase" &&
          ((!twap && BigInt(numbers.initialCollateralDeltaAmount) !== intent.collateralAmount) ||
            addresses.swapPath.length ||
            (convertToUsd(intent.collateralAmount, usdc.decimals, usdc.prices.maxPrice) ?? 0n) >
              economy.collateralLimitUsd)
        )
          fail();
        if (intent.kind === "close") {
          const withdrawal = BigInt(numbers.initialCollateralDeltaAmount);
          // Full-close quotes may explicitly withdraw the position's remaining collateral.
          if (withdrawal < 0n || withdrawal > intent.collateralAmount || addresses.swapPath.length) fail();
        }
        const buying = intent.kind === "increase" ? intent.isLong : !intent.isLong;
        const contractMin = weth.prices.minPrice / 10n ** BigInt(weth.decimals);
        const contractMax = weth.prices.maxPrice / 10n ** BigInt(weth.decimals);
        const acceptable = BigInt(numbers.acceptablePrice);
        if (
          (buying && acceptable > (contractMax * 10_100n) / 10_000n) ||
          (!buying && acceptable < (contractMin * 9_900n) / 10_000n)
        )
          fail();
      }
    }
  }
  const feeToken = [usdc, weth].find((token) => getAddress(token.address) === getAddress(relayParams.fee.feeToken));
  if (
    !feeToken ||
    (intent.kind !== "cancel" && intent.kind !== "edit" && getAddress(feeToken.address) !== getAddress(usdc.address)) ||
    BigInt(relayParams.fee.feeAmount) <= 0n
  )
    fail();
  if (
    relayParams.fee.feeSwapPath.some((market: string) => getAddress(market) !== getAddress(marketAddress)) ||
    relayParams.fee.feeSwapPath.length > 1
  )
    fail();
  const relayUsd = convertToUsd(BigInt(relayParams.fee.feeAmount), feeToken!.decimals, feeToken!.prices.maxPrice)!;
  // Relay fee already includes execution fees. Never subtract estimated refunds.
  const estimates = prepared.estimates;
  if (intent.kind !== "cancel" && intent.kind !== "edit" && !estimates) fail();
  const costs = [estimates?.positionFeeUsd ?? 0n, estimates?.borrowingFeeUsd ?? 0n, estimates?.fundingFeeUsd ?? 0n];
  const impacts = [estimates?.positionPriceImpactDeltaUsd ?? 0n, estimates?.swapPriceImpactDeltaUsd ?? 0n];
  if (intent.kind === "swap") {
    const input = getAddress(intent.tokenIn) === getAddress(usdc.address) ? usdc : weth;
    const output = input === usdc ? weth : usdc;
    const inputUsd = convertToUsd(intent.amount, input.decimals, input.prices.maxPrice)!;
    const outputUsd = convertToUsd(
      BigInt(creates[0].numbers.minOutputAmount),
      output.decimals,
      output.prices.minPrice
    )!;
    costs.push(inputUsd > outputUsd ? inputUsd - outputUsd : 0n);
  }
  const feeUsd =
    relayUsd +
    costs.reduce((sum, v) => sum + (v > 0n ? v : 0n), 0n) +
    impacts.reduce((sum, v) => sum + (v < 0n ? -v : 0n), 0n) +
    USD / 100n;
  return { feeUsd, feeToken: feeToken!, feeAmount: BigInt(relayParams.fee.feeAmount) };
}
