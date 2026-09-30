/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GMX_SOLANA_API_ENDPOINT?: string;
  readonly VITE_GMX_SOLANA_WSS_ENV?: string;
  readonly VITE_GMX_SOLANA_STORE_ADDRESS?: string;
  readonly VITE_GMX_SOLANA_SOLUSD_MARKET_TOKEN?: string;
  readonly VITE_GMX_SOLANA_USDC_MINT?: string;
  readonly VITE_GMX_SOLANA_SOL_MINT?: string;
  readonly VITE_GMX_SOLANA_SOLUSD_SHORT_TOKEN?: string;
}

declare module "*.po" {
  export const messages: import("@lingui/core").Messages;
}
