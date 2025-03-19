import type { PublicClient, WalletClient } from "viem";
import type { Token } from "./tokens";
import type { MarketSdkConfig } from "./markets";

export interface GmxSdkConfig {
  /** Chain ID */
  chainId: number;
  /** Account's address */
  account?: string;
  /** GMX Oracle URL */
  oracleUrl: string;
  /** Blockhain RPC URL */
  rpcUrl: string;
  /** GMX Subsquid URL */
  subsquidUrl: string;
  /** GMX Subgraph Synthetics Stats URL */
  subgraphUrl: string;

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
