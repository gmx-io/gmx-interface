import type { Bar as BarType, LibrarySymbolInfo, ResolutionString } from "charting_library";

export type Bar = BarType & {
  ticker?: string;
  period?: string;
};

export type SymbolInfo = LibrarySymbolInfo & {
  isStable: boolean;
  visualMultiplier?: number;
};

export type TvParamsCache = {
  resolution: ResolutionString;
  countBack: number;
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
