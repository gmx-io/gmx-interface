export type RpcConfig = {
  url: string;
  isPublic: boolean;
  purpose: string;
  // Provider-specific limit for Solana getMultipleAccounts requests.
  maxAccountsPerRequest?: number;
};
