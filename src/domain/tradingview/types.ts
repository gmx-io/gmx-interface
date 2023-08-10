import { LibrarySymbolInfo, Bar as BarType } from "charting_library";

export type Bar = BarType & {
  ticker?: string;
  period?: string;
};

export type SymbolInfo = LibrarySymbolInfo & {
  isStable: boolean;
};
