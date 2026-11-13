import type { CreateOrderParams, UpdateOrderParams } from "@gmsol-labs/gmsol-sdk";
import { maxUint256 } from "viem";

import { appTokenPriceToGmsolUnitPrice, appUsdToGmsolUsd, toGmsolTokenAmount } from "sdk/utils/gmsol";

import type { GmsolCreateOrder, GmsolOrderUpdate } from "./types";

export function toGmsolOrderParams(order: GmsolCreateOrder): CreateOrderParams {
  const isIncrease = order.kind === "MarketIncrease" || order.kind === "LimitIncrease";
  const isMarket = order.kind === "MarketIncrease" || order.kind === "MarketDecrease";
  if (order.sizeDeltaUsd <= 0n || (isIncrease && order.collateralDeltaAmount <= 0n)) {
    throw new Error("Order size and increase collateral must be positive");
  }
  if (
    isMarket &&
    (order.acceptablePrice === undefined || order.acceptablePrice === maxUint256 || order.acceptablePrice <= 0n)
  ) {
    throw new Error("Market orders require a finite positive acceptable price");
  }
  if (!isMarket && (order.triggerPrice === undefined || order.triggerPrice <= 0n)) {
    throw new Error("Trigger orders require a positive trigger price");
  }
  // The Rust ABI uses None for an unlimited bound. Do not convert the EVM u256 sentinel to u128.
  const unlimited = order.acceptablePrice === maxUint256 || order.acceptablePrice === 0n;
  if (unlimited && (order.acceptablePrice === maxUint256) !== (order.isLong === isIncrease)) {
    throw new Error("Invalid unlimited acceptable price direction");
  }
  const size = appUsdToGmsolUsd(order.sizeDeltaUsd, "floor");
  if (size === 0n) throw new Error("Order size rounds to zero");
  return {
    market_token: order.market.marketTokenAddress,
    is_long: order.isLong,
    size,
    amount: toGmsolTokenAmount(order.collateralDeltaAmount),
    min_output: isIncrease ? toGmsolTokenAmount(order.minOutput) : appUsdToGmsolUsd(order.minOutput, "ceil"),
    acceptable_price:
      order.acceptablePrice === undefined || unlimited
        ? undefined
        : appTokenPriceToGmsolUnitPrice({
            price: order.acceptablePrice,
            decimals: order.indexTokenDecimals,
            rounding: order.isLong === isIncrease ? "floor" : "ceil",
          }),
    trigger_price:
      order.triggerPrice === undefined
        ? undefined
        : appTokenPriceToGmsolUnitPrice({
            price: order.triggerPrice,
            decimals: order.indexTokenDecimals,
            rounding: (order.kind === "LimitDecrease" ? order.isLong : !order.isLong) ? "ceil" : "floor",
          }),
    decrease_position_swap_type: order.decreaseSwapType,
    valid_from_ts: order.validFromTs,
  };
}

export function toGmsolUpdateParams(p: GmsolOrderUpdate): UpdateOrderParams {
  const isIncrease = p.kind === "MarketIncrease" || p.kind === "LimitIncrease";
  if (p.validFromTs !== undefined && (!Number.isSafeInteger(p.validFromTs) || p.validFromTs < 0))
    throw new Error("Invalid order timestamp");
  if (p.triggerPrice !== undefined && p.triggerPrice <= 0n) throw new Error("Trigger price must be positive");
  if (p.sizeDeltaUsd !== undefined && p.sizeDeltaUsd <= 0n) throw new Error("Updated size must be positive");
  if (p.acceptablePrice !== undefined && (p.acceptablePrice <= 0n || p.acceptablePrice === maxUint256)) {
    // This ABI's Option cannot distinguish "leave unchanged" from "clear the existing price".
    throw new Error("Updating an unlimited price is not supported by the pinned SDK");
  }
  if (p.sizeDeltaUsd !== undefined && appUsdToGmsolUsd(p.sizeDeltaUsd, "floor") === 0n)
    throw new Error("Updated size rounds to zero");
  return {
    size_delta_value: p.sizeDeltaUsd === undefined ? undefined : appUsdToGmsolUsd(p.sizeDeltaUsd, "floor"),
    acceptable_price:
      p.acceptablePrice === undefined
        ? undefined
        : appTokenPriceToGmsolUnitPrice({
            price: p.acceptablePrice,
            decimals: p.indexTokenDecimals,
            rounding: p.isLong === isIncrease ? "floor" : "ceil",
          }),
    trigger_price:
      p.triggerPrice === undefined
        ? undefined
        : appTokenPriceToGmsolUnitPrice({
            price: p.triggerPrice,
            decimals: p.indexTokenDecimals,
            rounding: (p.kind === "LimitDecrease" ? p.isLong : !p.isLong) ? "ceil" : "floor",
          }),
    min_output:
      p.minOutput === undefined
        ? undefined
        : isIncrease
          ? toGmsolTokenAmount(p.minOutput)
          : appUsdToGmsolUsd(p.minOutput, "ceil"),
    valid_from_ts: p.validFromTs,
  };
}
