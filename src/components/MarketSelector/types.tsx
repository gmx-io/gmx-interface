import type { TokenFavoriteKey } from "context/TokensFavoritesContext/TokensFavoritesContextProvider";
import type { GlvOrMarketInfo } from "domain/synthetics/markets";
import type { TokensData } from "domain/synthetics/tokens";

export type CommonPoolSelectorProps = {
  chainId: number;
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: GlvOrMarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  isSideMenu?: boolean;
  getMarketState?: (market: GlvOrMarketInfo) => MarketState | undefined;
  onSelectMarket: (market: GlvOrMarketInfo) => void;
  showAllPools?: boolean;
  showIndexIcon?: boolean;
  /**
   * @default true
   */
  withFilters?: boolean;
  favoriteKey: TokenFavoriteKey;
  size?: "l" | "m";
};

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
