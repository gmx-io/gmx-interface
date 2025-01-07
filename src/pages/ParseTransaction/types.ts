import { GlvInfoData, MarketsInfoData } from "domain/synthetics/markets";
import { TokensData } from "domain/tokens";
import { Address } from "viem";

export type Event = {
  key: string;
  topics: Address[];
  name: string;
  values: LogEntry[];
};

export type LogEntry = {
  item: string;
  value: string | bigint | boolean;
  type: string;
  error?: string;
};

export interface LogEntryComponentProps extends LogEntry {
  tokensData: TokensData;
  marketsInfoData: MarketsInfoData;
  chainId: number;
  glvData: GlvInfoData;
  entries: LogEntry[]; // eslint-disable-line react/no-unused-prop-types
  marketTokensData: TokensData; // eslint-disable-line react/no-unused-prop-types
  name: string; // eslint-disable-line react/no-unused-prop-types
  copyToClipboard: (str: string) => void;
  allEvents: Event[];
}
