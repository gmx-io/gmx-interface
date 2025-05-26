import type { Token, TokenPrices } from "domain/tokens";

export type TokenChainData = Token & {
  sourceChainId: number;
  sourceChainDecimals: number;
  sourceChainPrices: TokenPrices | undefined;
  sourceChainBalance: bigint | undefined;
};

export type MultichainFundingHistoryItem = {
  id: string;
  operation: "deposit" | "withdrawal";
  step: "executed" | "received" | "sent" | "submitted";
  settlementChainId: number;
  sourceChainId: number;
  account: string;
  token: string;
  sentAmount: bigint;
  receivedAmount: bigint | undefined;

  sentTxn: string | undefined;
  sentTimestamp: number;
  receivedTxn: string | undefined;
  receivedTimestamp: number | undefined;
  isExecutionError: boolean | null | undefined;
  executedTxn: string | undefined;
  executedTimestamp: number | undefined;

  isFromWs?: boolean;
};
