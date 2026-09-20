/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GMX_SOLANA_API_ENDPOINT?: string;
  readonly VITE_GMX_SOLANA_WSS_ENV?: string;
}

declare module "*.po" {
  export const messages: import("@lingui/core").Messages;
}
