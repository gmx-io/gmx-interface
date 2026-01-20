import type { PublicClient, WalletClient } from "viem";

import type { ContractsChainId } from "configs/chains";

import type { MarketSdkConfig } from "../../utils/markets/types";
import type { Token } from "../../utils/tokens/types";

export interface GmxSdkConfig {
  /** Chain ID */
  chainId: ContractsChainId;
  /** Account's address */
  account?: string;
  /** GMX Oracle URL */
  oracleUrl: string;
  /** Blockhain RPC URL */
  rpcUrl: string;
  /** GMX Subsquid URL */
  subsquidUrl: string;

  /** Custom viem's public and private client */
  publicClient?: PublicClient;
  walletClient?: WalletClient;

  /** Tokens override configurations */
  tokens?: Record<string, Partial<Token>>;
  /** Markets override configurations */
  markets?: Record<string, Partial<MarketSdkConfig>>;

  settings?: {
    uiFeeReceiverAccount?: string;
  };
}
