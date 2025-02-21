import type { OrderType } from "sdk/types/orders";

export enum LineStyle {
  /**
   * Solid line style.
   */
  Solid = 0,
  /**
   * Dotted line style.
   */
  Dotted = 1,
  /**
   * Dashed line style.
   */
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
