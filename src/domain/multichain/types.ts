import type { SourceChainId } from "config/chains";
import type { Token, TokenPrices } from "domain/tokens";
import type { IRelayUtils } from "typechain-types/LayerZeroProvider";
import type {
  MessagingFeeStructOutput,
  OFTFeeDetailStruct,
  OFTLimitStruct,
  OFTReceiptStruct,
} from "typechain-types-stargate/IStargate";

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

  isFromWs?: boolean;
};

export type StrippedGeneratedType<T> = Omit<T, keyof [] | `${number}`>;

export type BridgeOutParams = StrippedGeneratedType<IRelayUtils.BridgeOutParamsStructOutput>;

export type LayerZeroEndpointId = 40161 | 40231 | 40232 | 30184 | 30110 | 30106 | 30102;

export type QuoteOft = {
  limit: OFTLimitStruct;
  oftFeeDetails: OFTFeeDetailStruct[];
  receipt: OFTReceiptStruct;
};

export type QuoteSend = StrippedGeneratedType<MessagingFeeStructOutput>;
