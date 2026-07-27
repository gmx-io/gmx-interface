import { ExternalSwapPath, ExternalSwapQuote, ExternalSwapQuoteParams } from "utils/trade/types";

export const getExternalSwapQuoteByPath = (_params: {
  amountIn: bigint;
  externalSwapPath: ExternalSwapPath;
  externalSwapQuoteParams: ExternalSwapQuoteParams;
}): ExternalSwapQuote | undefined => undefined;
