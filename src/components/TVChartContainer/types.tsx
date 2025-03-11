import type { OrderType } from "sdk/types/orders";

export enum LineStyle {
  Solid = 0,
  Dotted = 1,
  Dashed = 2,
}

export type StaticChartLine = {
  price: number;
  title: string;
};

export type DynamicChartLine = {
  id: string;
  price: number;
  orderType: OrderType;
  isLong: boolean;
};
