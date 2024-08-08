import { OrderType } from "domain/synthetics/orders";

export function getSwapOrderMetricId(data: {
  fromTokenAddress?: string;
  toTokenAddress?: string;
  fromTokenAmount?: bigint;
  minOutputAmount?: bigint;
  swapPath?: string[];
  executionFee?: bigint;
  orderType?: OrderType;
}) {
  return [
    "swap",
    data.fromTokenAddress,
    data.toTokenAddress,
    data.fromTokenAmount?.toString(),
    data.minOutputAmount?.toString(),
    data.swapPath?.join("-"),
    data.executionFee?.toString(),
    data.orderType,
  ].join(":");
}

export function getPositionOrderMetricId(data: {
  marketAddress: string;
  initialCollateralTokenAddress: string;
  initialCollateralDeltaAmount: bigint;
  swapPath: string[];
  sizeDeltaUsd: bigint;
  isLong: boolean;
  orderType: OrderType;
  executionFee: bigint;
}) {
  return [
    "position",
    data.marketAddress,
    data.initialCollateralTokenAddress,
    data.initialCollateralDeltaAmount?.toString(),
    data.swapPath?.join("-"),
    data.sizeDeltaUsd?.toString(),
    data.isLong,
    data.orderType,
    data.executionFee?.toString(),
  ].join(":");
}
