import { Token, TokenPrices } from "domain/tokens";

export type TokenChainData = Token & {
  sourceChainId: number;
  sourceChainDecimals: number;
  sourceChainPrices: TokenPrices | undefined;
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
