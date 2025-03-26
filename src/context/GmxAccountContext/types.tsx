import { Token, TokenPrices } from "domain/tokens";

export type TokenChainData = Token & {
  sourceChainId: number;
  sourceChainDecimals: number;
  sourceChainPrices: TokenPrices;
  sourceChainBalance: bigint | undefined;
};

export type FundingHistoryItem = {
  id: string;
  chainId: number;
  walletAddress: string;
  txnId: string;
  token: Token;
  operation: "deposit" | "withdraw";
  timestamp: number;
  size: bigint;
  sizeUsd: bigint;
  status: "pending" | "completed" | "failed";
};

export type MultichainBalances = {
  token: TokenChainData;
  chainId: number;
  balanceAmount: bigint;
  balanceUsd: bigint;
}[];
