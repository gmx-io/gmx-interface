import { LibrarySymbolInfo, Bar as BarType } from "charting_library";

export type Bar = BarType & {
  ticker?: string;
  period?: string;
};

export type SymbolInfo = LibrarySymbolInfo & {
  isStable: boolean;
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
export type FromNewToOldArray<T> = Flavor<Omit<T[], "reverse">, "FromNewToOldArray"> & {
  reverse(): FromOldToNewArray<T>;
};
