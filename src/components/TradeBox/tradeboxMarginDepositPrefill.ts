import { getIsEquivalentTokens } from "sdk/utils/tokens";
import type { Token } from "sdk/utils/tokens/types";

export type TradeboxMarginDepositPrefill = {
  collateralInputValue: string | undefined;
  triggerPriceInputValue: string | undefined;
};

/** The pay amount carries over only when the pay token is the position collateral (never converted). */
export function getTradeboxMarginDepositPrefill(p: {
  payToken: Token | undefined;
  payTokenInputValue: string | undefined;
  payTokenAmount: bigint | undefined;
  positionCollateralToken: Token | undefined;
  triggerPriceInputValue: string | undefined;
  triggerPrice: bigint | undefined;
}): TradeboxMarginDepositPrefill {
  const isCollateralPayToken =
    p.payToken !== undefined &&
    p.positionCollateralToken !== undefined &&
    getIsEquivalentTokens(p.payToken, p.positionCollateralToken);

  const hasPayAmount = p.payTokenAmount !== undefined && p.payTokenAmount > 0n && p.payTokenInputValue !== "";

  const hasTriggerPrice = p.triggerPrice !== undefined && p.triggerPrice > 0n && p.triggerPriceInputValue !== "";

  return {
    collateralInputValue: isCollateralPayToken && hasPayAmount ? p.payTokenInputValue : undefined,
    triggerPriceInputValue: hasTriggerPrice ? p.triggerPriceInputValue : undefined,
  };
}
