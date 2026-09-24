export const GRAPHQL_ENDPOINT =
  'https://gmx-solana-sqd.squids.live/gmx-solana-base:prod/api/graphql';
export const GRAPHQL_ENDPOINT_2 =
  'https://gmx-solana-sqd.squids.live/gmx-solana-base:treasury-prod/api/graphql';

export const GMX_SOLANA_API_ENDPOINT = import.meta.env
  .VITE_GMX_SOLANA_API_ENDPOINT as string;

const GMX_SOLANA_API_BASE_URL = GMX_SOLANA_API_ENDPOINT.replace(/\/$/, '');

export const GMX_SOLANA_SHARE_ENDPOINT = `${GMX_SOLANA_API_BASE_URL}/api/s`;

export const GMX_SOLANA_UPLOAD_ENDPOINT = `${GMX_SOLANA_API_BASE_URL}/v2/upload`;

export const KEEPER_GRAPHQL_ENDPOINT = import.meta.env
  .VITE_KEEPER_GRAPHQL_ENDPOINT as string;

export const MARIN_GRAPHQL_ENDPOINT = import.meta.env
  .VITE_MARIN_GRAPHQL_ENDPOINT as string;

export const GT_SQD_GRAPHQL_ENDPOINT =
  import.meta.env.VITE_GT_SQD_GRAPHQL_ENDPOINT;

export const PRICE_CANDLE_GRAPHQL_ENDPOINT = import.meta.env
  .VITE_PRICE_CANDLE_GRAPHQL_ENDPOINT as string;

export const PRICE_CANDLE_WSS_ENDPOINT = import.meta.env
  .VITE_PRICE_CANDLE_WSS_ENDPOINT as string;

// Helius RPC WebSocket endpoint. Used for the standard Solana JSON-RPC
// `accountSubscribe` and `transactionSubscribe` methods. When set, the
// useTokenBalances hook reads SPL token account state via push deltas
// instead of 5s polling.
export const HELIUS_WSS_ENDPOINT = import.meta.env
  .VITE_HELIUS_WSS_ENDPOINT as string | undefined;
