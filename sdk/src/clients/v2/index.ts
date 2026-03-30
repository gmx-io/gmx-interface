import { getApiUrl } from "configs/api";
import { ContractsChainId } from "configs/chains";
import { fetchApiApy } from "utils/apy/api";
import { ApyParams, ApyResponse } from "utils/apy/types";
import { fetchApiBuybackWeeklyStats } from "utils/buyback/api";
import { BuybackWeeklyStatsResponse } from "utils/buyback/types";
import { HttpClient } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { fetchApiMarkets, fetchApiMarketsInfo, fetchApiMarketsTickers, fetchApiTokensData } from "utils/markets/api";
import { MarketTicker, MarketWithTiers } from "utils/markets/types";
import { fetchApiOrders } from "utils/orders/api";
import { fetchApiPairs } from "utils/pairs/api";
import { fetchApiPerformanceAnnualized, fetchApiPerformanceSnapshots } from "utils/performance/api";
import { PerformanceAnnualized, PerformanceParams, PerformanceSnapshots } from "utils/performance/types";
import { fetchApiPositionsInfo } from "utils/positions/api";
import { fetchApiOhlcv } from "utils/prices/api";
import type { OhlcvParams } from "utils/prices/types";
import { fetchApiRates } from "utils/rates/api";
import { MarketRates, RatesParams } from "utils/rates/types";
import { fetchApiStakingPower } from "utils/staking/api";
import { StakingPowerResponse } from "utils/staking/types";
import { fetchApiTokens } from "utils/tokens/api";

export type { ApyEntry, ApyParams, ApyResponse } from "utils/apy/types";
export type { MarketTicker, MarketWithTiers } from "utils/markets/types";
export type { Pair } from "utils/pairs/types";
export type {
  PerformanceAnnualized,
  PerformanceParams,
  PerformanceSnapshot,
  PerformanceSnapshots,
} from "utils/performance/types";
export type { OhlcvCandle, OhlcvParams } from "utils/prices/types";
export type { ApiParameterPeriod, MarketRates, RatesParams, RatesSnapshot } from "utils/rates/types";
export type { BuybackWeekData, BuybackSummary, BuybackWeeklyStatsResponse } from "utils/buyback/types";
export type { StakingPowerResponse } from "utils/staking/types";

export class GmxApiSdk {
  ctx: { chainId: ContractsChainId; api: IHttp };

  constructor({ chainId }: { chainId: ContractsChainId }) {
    const apiUrl = getApiUrl(chainId);

    if (!apiUrl) {
      throw new Error("api is not supported for current chainId");
    }

    this.ctx = {
      chainId,
      api: new HttpClient(apiUrl),
    };
  }

  fetchMarketsInfo() {
    return fetchApiMarketsInfo(this.ctx);
  }

  fetchMarkets(): Promise<MarketWithTiers[]> {
    return fetchApiMarkets(this.ctx);
  }

  fetchMarketsTickers(params?: { addresses?: string[]; symbols?: string[] }): Promise<MarketTicker[]> {
    return fetchApiMarketsTickers(this.ctx, params);
  }

  fetchTokensData() {
    return fetchApiTokensData(this.ctx);
  }

  fetchTokens() {
    return fetchApiTokens(this.ctx);
  }

  fetchPositionsInfo(params: { address: string; includeRelatedOrders?: boolean }) {
    return fetchApiPositionsInfo(this.ctx, params);
  }

  fetchOrders(params: { address: string }) {
    return fetchApiOrders(this.ctx, params);
  }

  fetchOhlcv(params: OhlcvParams) {
    return fetchApiOhlcv(this.ctx, params);
  }

  fetchPairs() {
    return fetchApiPairs(this.ctx);
  }

  fetchRates(params?: RatesParams): Promise<MarketRates[]> {
    return fetchApiRates(this.ctx, params);
  }

  fetchApy(params?: ApyParams): Promise<ApyResponse> {
    return fetchApiApy(this.ctx, params);
  }

  fetchPerformanceAnnualized(params?: PerformanceParams): Promise<PerformanceAnnualized[]> {
    return fetchApiPerformanceAnnualized(this.ctx, params);
  }

  fetchPerformanceSnapshots(params?: PerformanceParams): Promise<PerformanceSnapshots[]> {
    return fetchApiPerformanceSnapshots(this.ctx, params);
  }

  fetchBuybackWeeklyStats(): Promise<BuybackWeeklyStatsResponse> {
    return fetchApiBuybackWeeklyStats(this.ctx);
  }

  fetchStakingPower(params: { address: string }): Promise<StakingPowerResponse> {
    return fetchApiStakingPower(this.ctx, params);
  }
}
