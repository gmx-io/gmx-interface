import type { AnyChainId, GmxAccountPseudoChainId } from "config/chains";
import type { TokenData } from "domain/tokens";

export type DisplayToken = TokenData & {
  isMarketToken?: boolean;
  chainId: AnyChainId | GmxAccountPseudoChainId;
  balance: bigint;
  balanceUsd: bigint;
  sourceChainDecimals?: number;
};
