import { MarketInfo } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { GmTokensFavoritesContextType } from "domain/synthetics/tokens/useGmTokensFavorites";

export type CommonPoolSelectorProps = {
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketTokensData?: TokensData;
  showBalances?: boolean;
  isSideMenu?: boolean;
  chainId: number;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (market: MarketInfo) => void;
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
  marketInfo: MarketInfo;
  balance: bigint;
  balanceUsd: bigint;
  state?: MarketState;
};
