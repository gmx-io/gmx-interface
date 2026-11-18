import type { Bar as BarType } from "charting_library";
import type { PositionsInfoData } from "sdk/utils/positions/types";
import type { Token } from "sdk/utils/tokens/types";

export type Bar = BarType & {
  ticker?: string;
  period?: string;
};

interface Flavoring<FlavorT> {
  _type?: FlavorT;
}
type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

/**
 * This type ensures type safety when dealing with ordered arrays.
 * @see {@link FromNewToOldArray}
 */
export type FromOldToNewArray<T> = Flavor<Omit<T[], "reverse">, "FromOldToNewArray"> & {
  reverse(): FromNewToOldArray<T>;
};

/**
 * This type ensures type safety when dealing with ordered arrays.
 * @see {@link FromOldToNewArray}
 *
 * Try to use `FromOldToNewArray` instead of this type when possible.
 */
export type FromNewToOldArray<T> = Flavor<Omit<T[], "reverse" | "toReversed">, "FromNewToOldArray"> & {
  reverse(): FromOldToNewArray<T>;
  toReversed(): FromOldToNewArray<T>;
};

export type ChartTrade = {
  id: string;
  ts: number;
  marketAddress: string;
  isLong: boolean;
  isIncrease: boolean;
  executionPrice: bigint;
};

export type ChartTradesFetcher = (params: {
  account: string;
  markets: Record<string, { indexToken: Pick<Token, "decimals"> }>;
  positions: PositionsInfoData | undefined;
  mode: "all" | "current";
  from: number;
  to: number;
}) => Promise<ChartTrade[]>;
