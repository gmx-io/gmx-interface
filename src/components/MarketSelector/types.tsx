import { GlvOrMarketInfo } from "domain/synthetics/markets";

import { TokensData } from "domain/synthetics/tokens";
import { GmTokensFavoritesContextType } from "domain/synthetics/tokens/useGmTokensFavorites";

export type CommonPoolSelectorProps = {
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: GlvOrMarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  isSideMenu?: boolean;
  chainId: number;
  getMarketState?: (market: GlvOrMarketInfo) => MarketState | undefined;
  onSelectMarket: (market: GlvOrMarketInfo) => void;
  showAllPools?: boolean;
  showIndexIcon?: boolean;
} & GmTokensFavoritesContextType;

export type MarketState = {
  disabled?: boolean;
  message?: string;
  warning?: string;
};

export type MarketOption = {
  indexName: string;
  poolName: string;
  name: string;
  marketInfo: GlvOrMarketInfo;
  balance: bigint;
  balanceUsd: bigint;
  state?: MarketState;
};
