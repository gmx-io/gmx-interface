import { PublicKey } from "@solana/web3.js";

const required = (name: string, value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is not configured`);
  return trimmed;
};

export function getSolanaMarketLongConfig() {
  return {
    store: required(
      "VITE_GMX_SOLANA_STORE_ADDRESS",
      import.meta.env.VITE_GMX_SOLANA_STORE_ADDRESS ?? "CTDLvGGXnoxvqLyTpGzdGLg9pD6JexKxKXSV8tqqo8bN"
    ),
    marketToken: required("VITE_GMX_SOLANA_SOLUSD_MARKET_TOKEN", import.meta.env.VITE_GMX_SOLANA_SOLUSD_MARKET_TOKEN),
    collateralToken: required(
      "VITE_GMX_SOLANA_USDC_MINT",
      import.meta.env.VITE_GMX_SOLANA_USDC_MINT ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ),
    longToken: required(
      "VITE_GMX_SOLANA_SOL_MINT",
      import.meta.env.VITE_GMX_SOLANA_SOL_MINT ?? "So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH"
    ),
    shortToken: required(
      "VITE_GMX_SOLANA_SOLUSD_SHORT_TOKEN",
      import.meta.env.VITE_GMX_SOLANA_SOLUSD_SHORT_TOKEN ?? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ),
  };
}

export function validateSolanaMarketLongConfig(config: ReturnType<typeof getSolanaMarketLongConfig>) {
  for (const value of Object.values(config)) new PublicKey(value);
  return config;
}
