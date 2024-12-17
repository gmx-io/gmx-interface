import { LibrarySymbolInfo, Bar as BarType } from "charting_library";

export type Bar = BarType & {
  ticker?: string;
  period?: string;
};

export type SymbolInfo = LibrarySymbolInfo & {
  isStable: boolean;
  visualMultiplier?: number;
};

export type TvParamsCache = {
  resolution: string;
  countBack: number;
};

interface Flavoring<FlavorT> {
  _type?: FlavorT;
}
type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export type FromOldToNewArray<T> = Flavor<Omit<T[], "reverse">, "FromOldToNewArray"> & {
  reverse(): FromNewToOldArray<T>;
};

export type FromNewToOldArray<T> = Flavor<Omit<T[], "reverse">, "FromNewToOldArray"> & {
  reverse(): FromOldToNewArray<T>;
};