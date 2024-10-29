import type { PublicClient, WalletClient } from "viem";
import { Token } from "./tokens";

export interface GmxSdkConfig {
  chainId: number;
  account: string;
  oracleUrl: string;
  rpcUrl: string;
  subgraph: {
    stats?: string;
    referrals?: string;
    nissohVault?: string;
    syntheticsStats?: string;
    subsquid?: string;
  };

  publicClient?: PublicClient;
  walletClient?: WalletClient;

  tokens?: Token[];

  onEmitMetricCounter?(e: { event: string; data: any }): void;
  onEmitMetricTiming?(e: { event: string; time: number; data: any }): void;
  onEmitMetricEvent?(e: { event: string; isError: boolean; data: any }): void;
}
