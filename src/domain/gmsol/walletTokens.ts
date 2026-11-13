import { GMSOL_BALANCE_TOKENS, GMSOL_NATIVE_TOKEN } from "config/gmsol/tokens";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { GmsolOracleFetcher } from "./gmsolOracleFetcher";

export type SolanaWalletToken = {
  address: string;
  symbol: string;
  // the app ships no WSOL or WGMX icon, so wrapped tokens use their base asset's
  iconSymbol: string;
  name: string;
  decimals: number;
  isStable: boolean | undefined;
};

// Native SOL plus the non-synthetic mints; synthetic ones are never held as collateral.
export const SOLANA_WALLET_TOKENS: readonly SolanaWalletToken[] = [
  {
    address: GMSOL_NATIVE_TOKEN.address,
    symbol: GMSOL_NATIVE_TOKEN.symbol,
    iconSymbol: GMSOL_NATIVE_TOKEN.symbol,
    name: GMSOL_NATIVE_TOKEN.name,
    decimals: GMSOL_NATIVE_TOKEN.decimals,
    isStable: undefined,
  },
  ...GMSOL_BALANCE_TOKENS.map((token) => ({
    address: token.address,
    symbol: token.symbol,
    iconSymbol: token.baseSymbol ?? (token.symbol === "WGMX" ? "GMX" : token.symbol),
    name: token.name,
    decimals: token.decimals,
    isStable: token.isStable,
  })),
];

export function fetchSolanaWalletPrices(arbitrumFetcher: OracleFetcher): Promise<TokenPricesData> {
  return new GmsolOracleFetcher(arbitrumFetcher).fetchPrices(SOLANA_WALLET_TOKENS.map((token) => token.address));
}
