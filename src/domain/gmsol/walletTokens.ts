import { GMSOL_TOKENS, GMSOL_NATIVE_TOKEN } from "config/gmsol/tokens";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";
import type { TokenPricesData } from "sdk/utils/tokens/types";

import { buildGmsolTokenPrices } from "./gmsolOracleUtils";

export type SolanaWalletToken = {
  address: string;
  symbol: string;
  iconSymbol: string;
  name: string;
  decimals: number;
  isStable: boolean | undefined;
};

export const SOLANA_WALLET_TOKENS: readonly SolanaWalletToken[] = [
  {
    address: GMSOL_NATIVE_TOKEN.address,
    symbol: GMSOL_NATIVE_TOKEN.symbol,
    iconSymbol: GMSOL_NATIVE_TOKEN.symbol,
    name: GMSOL_NATIVE_TOKEN.name,
    decimals: GMSOL_NATIVE_TOKEN.decimals,
    isStable: undefined,
  },
  ...GMSOL_TOKENS.map((token) => ({
    address: token.address,
    symbol: token.symbol,
    iconSymbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    isStable: token.isStable,
  })),
];

export async function fetchSolanaWalletPrices(arbitrumFetcher: OracleFetcher): Promise<TokenPricesData> {
  return buildGmsolTokenPrices(
    await arbitrumFetcher.fetchTickers(),
    SOLANA_WALLET_TOKENS.map((token) => token.address)
  );
}
