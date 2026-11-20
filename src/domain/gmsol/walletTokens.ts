import { GMSOL_TOKENS, GMSOL_NATIVE_TOKEN } from "config/gmsol/tokens";
import type { SolanaWalletToken } from "domain/solana/solanaWalletAssets";

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
