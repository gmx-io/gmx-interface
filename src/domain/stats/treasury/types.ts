import type { ContractsChainId } from "sdk/configs/chains";
import type { Token } from "sdk/utils/tokens/types";

export type TreasuryEntryType = "token" | "gmxV2" | "glv" | "uniswapV3" | "venus" | "pendle";

export type TreasuryBalanceAsset = {
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
      assets: TreasuryBalanceAsset[];
      totalUsd: bigint;
    }
  | undefined;
