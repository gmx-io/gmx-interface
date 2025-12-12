import type { AnyChainId, GmxAccountPseudoChainId, SourceChainId } from "config/chains";
import type { Token, TokenPrices } from "domain/tokens";

export type TokenChainData = Token & {
  sourceChainId: SourceChainId;
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

  source?: "optimistic" | "ws";
};

export type BridgeOutParams = {
  token: string;
  amount: bigint;
  minAmountOut: bigint;
  provider: string;
  data: string;
};

export type LayerZeroEndpointId = 40161 | 40231 | 40232 | 30184 | 30110 | 30106 | 30102;

export type OFTLimit = {
  minAmountLD: bigint;
  maxAmountLD: bigint;
};

export type OFTFeeDetail = {
  feeAmountLD: bigint;
  description: string;
};

export type OFTReceipt = {
  amountSentLD: bigint;
  amountReceivedLD: bigint;
};

export type QuoteOft = {
  limit: OFTLimit;
  oftFeeDetails: OFTFeeDetail[];
  receipt: OFTReceipt;
};

export type TransferRequests = {
  tokens: string[];
  receivers: string[];
  amounts: bigint[];
};

export type SendParam = {
  dstEid: number;
  to: string;
  amountLD: bigint;
  minAmountLD: bigint;
  extraOptions: string;
  composeMsg: string;
  oftCmd: string;
};

export type MessagingFee = {
  nativeFee: bigint;
  lzTokenFee: bigint;
};

export type MultichainMarketTokenBalances = {
  totalBalance: bigint;
  totalBalanceUsd: bigint;
  balances: Partial<
    Record<
      AnyChainId | GmxAccountPseudoChainId,
      {
        balance: bigint;
        balanceUsd: bigint;
      }
    >
  >;
};

export type MultichainMarketTokensBalances = Record<string, MultichainMarketTokenBalances>;
