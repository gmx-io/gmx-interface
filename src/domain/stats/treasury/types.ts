import type { ContractsChainId } from "sdk/configs/chains";
import type { Token } from "sdk/types/tokens";

export type TreasuryEntryType = "token" | "gmxV2" | "glv" | "uniswapV3" | "venus" | "pendle";

export type TreasuryBalanceEntry = {
  address: string;
  type: TreasuryEntryType;
  balance: bigint;
  usdValue: bigint;
  chainId: ContractsChainId;
  token?: Token;
  decimals?: number;
};

export type TreasuryData =
  | {
      tokens: TreasuryBalanceEntry[];
      totalUsd: bigint;
    }
  | undefined;
