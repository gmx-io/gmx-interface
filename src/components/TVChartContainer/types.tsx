import type { OrderType } from "sdk/utils/orders/types";

export enum LineStyle {
  Solid = 0,
  Dotted = 1,
  Dashed = 2,
}

export type StaticChartLine = {
  price: number;
  title: string;
  /** Position entry line data for displaying PnL and size */
  positionData?: {
    pnl: bigint;
    sizeInUsd: bigint;
    sizeInTokens: bigint;
    isLong: boolean;
    marketIndexName: string;
    tokenSymbol: string;
    tokenDecimals: number;
  };
};

export type DynamicChartLine = {
  id: string;
  price: number;
  orderType: OrderType;
  isLong: boolean;
  marketName: string;
  updatedAtTime: bigint;
};
