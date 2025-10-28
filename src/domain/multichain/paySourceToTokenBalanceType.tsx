import type { GmPaySource } from "domain/synthetics/markets/types";
import { TokenBalanceType } from "domain/tokens";

export function paySourceToTokenBalanceType(paySource: GmPaySource): TokenBalanceType {
  switch (paySource) {
    case "gmxAccount":
      return TokenBalanceType.GmxAccount;
    case "sourceChain":
      return TokenBalanceType.SourceChain;
  }
  return TokenBalanceType.Wallet;
}
