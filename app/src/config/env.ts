import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

export const IS_TOUCH = 'ontouchstart' in window;
// export const IS_DEVELOPMENT = import.meta.env.MODE === 'development' || 'dev';
export const IS_DEVELOPMENT =
  import.meta.env.VITE_GMX_SOLANA_COMPETITION_ENV === 'devnet' ? true : false;

export const LOCAL_RPC_PROXY_ENDPOINT =
  import.meta.env.VITE_LOCAL_RPC_PROXY_ENDPOINT;

export const DEFAULT_CLUSTER = import.meta.env.DEV && LOCAL_RPC_PROXY_ENDPOINT
  ? LOCAL_RPC_PROXY_ENDPOINT
  : (import.meta.env.VITE_HELIUS_RPC_URL ?? WalletAdapterNetwork.Devnet);

export const getSocketServerUrl = (): string => {
  return import.meta.env.VITE_GMX_SOLANA_WSS_ENV as string;
};

// export const DEFAULT_DOCS_ENV = import.meta.env.VITE_GMX_DOCS_ENV || 'https://docs.gmxsol.io/';
export const DEFAULT_DOCS_ENV = 'https://docs.gmtrade.xyz/';
