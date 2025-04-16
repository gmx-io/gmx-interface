import { Token, TokenPrices } from "domain/tokens";

export type TokenChainData = Token & {
  sourceChainId: number;
  sourceChainDecimals: number;
  sourceChainPrices: TokenPrices | undefined;
  sourceChainBalance: bigint | undefined;
};

// operation: "deposit" | "withdraw";
// step: "sent" | "received" | "executed";
// settlementChainId: number;
// sourceChainId: number;
// account: Address;
// token: Address;
// amount: bigint;
// id: string;

// sentTxn: string;
// sentTimestamp: number;
// receivedTxn: string | undefined;
// receivedTimestamp: number | undefined;
// executedTxn: string | undefined;
// executedTimestamp: number | undefined;

export type MultichainFundingHistoryItem = {
  id: string;
  operation: "deposit" | "withdraw";
  step: "executed" | "received" | "sent";
  settlementChainId: number;
  sourceChainId: number;
  account: string;
  token: string;
  amount: bigint;

  sentTxn: string;
  sentTimestamp: number;
  receivedTxn: string | undefined;
  receivedTimestamp: number | undefined;
  executedTxn: string | undefined;
  executedTimestamp: number | undefined;
};
