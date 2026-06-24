import { getApiUrl, getApiFallbackUrls } from "configs/api";
import { ContractsChainId } from "configs/chains";
import type { SettlementChainId } from "configs/chains";
import { isSettlementChain } from "configs/multichain";
import { fetchApiApy } from "utils/apy/api";
import { ApyParams, ApyResponse } from "utils/apy/types";
import {
  fetchWalletBalances as fetchWalletBalancesRaw,
  fetchAllowances as fetchAllowancesRaw,
  buildApproveTransaction,
  buildErc20ApproveTxn,
  executeErc20Approve,
} from "utils/balances/api";
import type {
  WalletBalance,
  TokenAllowance,
  SpenderType,
  ApproveTokenParams,
  ApproveTokenResult,
  Erc20ApproveParams,
} from "utils/balances/api";
import { fetchApiBuybackWeeklyStats } from "utils/buyback/api";
import { BuybackWeeklyStatsResponse } from "utils/buyback/types";
import {
  executeCrossChainDeposit,
  executeCrossChainWithdraw,
  getCrossChainWithdrawStatus,
  prepareCrossChainDeposit,
  prepareCrossChainWithdraw,
  signCrossChainWithdrawPrepared,
  submitCrossChainWithdraw,
  type CrossChainDepositPrepareRequest,
  type CrossChainDepositPrepareResponse,
  type CrossChainWithdrawPrepareRequest,
  type CrossChainWithdrawPrepareResponse,
  type CrossChainWithdrawStatusResponse,
  type CrossChainWithdrawSubmitRequest,
  type CrossChainWithdrawSubmitResponse,
  type ExecuteCrossChainDepositResult,
} from "utils/gmxAccountApi";
import { HttpClient } from "utils/http/http";
import { HttpClientWithFallback } from "utils/http/httpFallback";
import { IHttp } from "utils/http/types";
import { fetchApiJitLiquidityInfo } from "utils/jitLiquidity/api";
import { FetchJitLiquidityInfoParams, JitLiquidityMap } from "utils/jitLiquidity/types";
import {
  fetchApiMarkets,
  fetchApiMarketsConfig,
  fetchApiMarketsInfo,
  fetchApiMarketsValues,
  fetchApiMarketsTickers,
  fetchApiTokensData,
} from "utils/markets/api";
import { MarketTicker, MarketWithTiers } from "utils/markets/types";
import {
  buildCrossChainWithdrawBridgeOutParams,
  buildSameChainDepositTxn,
  buildSameChainWithdrawBridgeOutParams,
  buildSameChainWithdrawTxn,
  executeSameChainDeposit,
  executeSameChainWithdraw,
  type BridgeOutParams,
  type BuildTxnResult,
  type SameChainDepositRequest,
  type SameChainWithdrawRequest,
} from "utils/multichain";
import { fetchApiOrders } from "utils/orders/api";
import {
  prepareOrder,
  prepareEditOrder,
  prepareCancelOrder,
  prepareCollateral,
  fetchOrderStatus as fetchOrderStatusRaw,
} from "utils/orderTransactions/api";
import type {
  PrepareOrderRequest,
  PrepareOrderResponse,
  SubmitOrderRequest,
  SubmitOrderResponse,
  PrepareEditOrderRequest,
  PrepareCancelOrderRequest,
  PrepareCollateralRequest,
  OrderStatusRequest,
  OrderStatusResponse,
} from "utils/orderTransactions/api";
import { fetchApiPairs } from "utils/pairs/api";
import { fetchApiPerformanceAnnualized, fetchApiPerformanceSnapshots } from "utils/performance/api";
import { PerformanceAnnualized, PerformanceParams, PerformanceSnapshots } from "utils/performance/types";
import { fetchApiPositionsInfo } from "utils/positions/api";
import { fetchApiOhlcv } from "utils/prices/api";
import type { OhlcvParams } from "utils/prices/types";
import { fetchApiRates } from "utils/rates/api";
import { MarketRates, RatesParams } from "utils/rates/types";
import type { IAbstractSigner } from "utils/signer";
import { fetchApiStakingPower } from "utils/staking/api";
import { StakingPowerResponse } from "utils/staking/types";
import { fetchSubaccountStatus, prepareSubaccountApproval, signSubaccountApproval } from "utils/subaccount/api";
import type {
  SubaccountStatusRequest,
  SubaccountStatusResponse,
  SubaccountApprovalPrepareRequest,
  SubaccountApprovalPrepareResponse,
} from "utils/subaccount/api";
import {
  activateSdkSubaccount,
  clearSdkSubaccount,
  executeExpressOrderWithSubaccount,
  generateSdkSubaccount,
  getSdkSubaccountApprovalMessage,
  hasActiveSdkSubaccount,
  prepareWithSubaccount,
  refreshSdkSubaccountState,
  signOrderWithSubaccount,
  submitOrderWithSubaccount,
  type SdkSubaccountClientContext,
} from "utils/subaccount/sdkClient";
import type { SdkSubaccountApproval, SdkSubaccountStatus, SubaccountState } from "utils/subaccount/types";
import { fetchApiTokens } from "utils/tokens/api";
import { fetchApiTrades, searchApiTrades } from "utils/trades/api";
import type { FetchTradesParams, SearchTradesParams, TradesListResponse } from "utils/trades/types";

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
export type {
  FetchJitLiquidityInfoParams,
  GlvShiftParam,
  JitLiquidityApiVersion,
  JitLiquidityData,
  JitLiquidityInfo,
  JitLiquidityMap,
} from "utils/jitLiquidity/types";
export type { StakingPowerResponse } from "utils/staking/types";
export type {
  ApiTradeAction,
  FetchTradesParams,
  MarketDirectionFilter,
  OrderEventCombination,
  SearchTradesParams,
  TradeDirection,
  TradeEventName,
  TradesListResponse,
} from "utils/trades/types";
export type {
  PrepareOrderRequest,
  PrepareOrderResponse,
  SubmitOrderRequest,
  SubmitOrderResponse,
  PrepareEditOrderRequest,
  PrepareCancelOrderRequest,
  PrepareCollateralRequest,
  OrderStatusRequest,
  OrderStatusResponse,
};
export type {
  WalletBalance,
  TokenAllowance,
  SpenderType,
  ApproveTokenParams,
  ApproveTokenResult,
} from "utils/balances/api";
export type {
  BridgeOutParams,
  BuildTxnResult,
  SameChainDepositRequest,
  SameChainWithdrawRequest,
} from "utils/multichain";
export type {
  CrossChainDepositPrepareRequest,
  CrossChainDepositPrepareResponse,
  CrossChainWithdrawPrepareRequest,
  CrossChainWithdrawPrepareResponse,
  CrossChainWithdrawStatusResponse,
  CrossChainWithdrawSubmitRequest,
  CrossChainWithdrawSubmitResponse,
  ExecuteCrossChainDepositResult,
} from "utils/gmxAccountApi";
export type { IAbstractSigner } from "utils/signer";
export { PrivateKeySigner } from "utils/signer";
export { HttpError } from "utils/http/http";
export { HttpClientWithFallback } from "utils/http/httpFallback";
export type { IHttp } from "utils/http/types";
export { getGasPaymentTokens } from "configs/express";
export type {
  SubaccountStatusRequest,
  SubaccountStatusResponse,
  SubaccountApprovalPrepareRequest,
  SubaccountApprovalPrepareResponse,
};
export type { SdkSubaccountStatus } from "utils/subaccount/types";

export class GmxApiSdk {
  ctx: { chainId: ContractsChainId; api: IHttp };
  private _subaccount: SubaccountState | undefined;
  private preparedSubaccountApprovals = new Map<string, SdkSubaccountApproval>();

  constructor({ chainId, apiUrl, api }: { chainId: ContractsChainId; apiUrl?: string; api?: IHttp }) {
    if (api) {
      this.ctx = { chainId, api };
      return;
    }

    const resolvedApiUrl = apiUrl ?? getApiUrl(chainId);

    if (!resolvedApiUrl) {
      throw new Error("api is not supported for current chainId");
    }

    const fallbackUrls = apiUrl ? [] : getApiFallbackUrls(chainId);
    const allUrls = [resolvedApiUrl, ...fallbackUrls];

    this.ctx = {
      chainId,
      api: allUrls.length > 1 ? new HttpClientWithFallback(allUrls) : new HttpClient(resolvedApiUrl),
    };
  }

  private get subaccountClient(): SdkSubaccountClientContext {
    return {
      ctx: this.ctx,
      owner: this,
      preparedSubaccountApprovals: this.preparedSubaccountApprovals,
      getSubaccount: () => this._subaccount,
      setSubaccount: (subaccount) => {
        this._subaccount = subaccount;
      },
    };
  }

  get subaccountAddress(): string | undefined {
    return this._subaccount?.address;
  }

  get subaccountStatus(): SdkSubaccountStatus | undefined {
    return this._subaccount?.onchainData;
  }

  get hasActiveSubaccount(): boolean {
    return hasActiveSdkSubaccount(this.subaccountClient);
  }

  get subaccountApprovalMessage(): SdkSubaccountApproval | undefined {
    return getSdkSubaccountApprovalMessage(this.subaccountClient);
  }

  fetchMarketsInfo() {
    return fetchApiMarketsInfo(this.ctx);
  }

  fetchMarketsConfig() {
    return fetchApiMarketsConfig(this.ctx);
  }

  fetchMarketsValues() {
    return fetchApiMarketsValues(this.ctx);
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

  fetchTrades(params: FetchTradesParams): Promise<TradesListResponse> {
    return fetchApiTrades(this.ctx, params);
  }

  searchTrades(params: SearchTradesParams): Promise<TradesListResponse> {
    return searchApiTrades(this.ctx, params);
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

  fetchJitLiquidityInfo(params?: FetchJitLiquidityInfoParams): Promise<JitLiquidityMap> {
    return fetchApiJitLiquidityInfo(this.ctx, params);
  }

  fetchStakingPower(params: { address: string }): Promise<StakingPowerResponse> {
    return fetchApiStakingPower(this.ctx, params);
  }

  fetchWalletBalances(params: { address: string }): Promise<WalletBalance[]> {
    return fetchWalletBalancesRaw(this.ctx, params);
  }

  fetchAllowances(params: { address: string; spender: SpenderType }): Promise<TokenAllowance[]> {
    return fetchAllowancesRaw(this.ctx, params);
  }

  buildApproveTransaction(params: ApproveTokenParams): ApproveTokenResult {
    return buildApproveTransaction(this.ctx, params);
  }

  buildErc20ApproveTxn(params: Erc20ApproveParams): ApproveTokenResult {
    return buildErc20ApproveTxn(params);
  }

  executeErc20Approve(signer: IAbstractSigner, params: Erc20ApproveParams): Promise<string> {
    return executeErc20Approve(signer, params);
  }

  private requireSettlementChainId(): SettlementChainId {
    if (!isSettlementChain(this.ctx.chainId)) {
      throw new Error(`chainId ${this.ctx.chainId} is not a settlement chain; multichain ops are unsupported`);
    }
    return this.ctx.chainId;
  }

  buildSameChainDepositTxn(params: Omit<SameChainDepositRequest, "chainId">): BuildTxnResult {
    return buildSameChainDepositTxn({ ...params, chainId: this.requireSettlementChainId() });
  }

  buildSameChainWithdrawTxn(params: Omit<SameChainWithdrawRequest, "chainId">): BuildTxnResult {
    return buildSameChainWithdrawTxn({ ...params, chainId: this.requireSettlementChainId() });
  }

  buildSameChainWithdrawBridgeOutParams(params: { tokenAddress: string; amount: bigint }): BridgeOutParams {
    return buildSameChainWithdrawBridgeOutParams(params);
  }

  buildCrossChainWithdrawBridgeOutParams(
    params: Parameters<typeof buildCrossChainWithdrawBridgeOutParams>[0]
  ): BridgeOutParams {
    return buildCrossChainWithdrawBridgeOutParams(params);
  }

  executeSameChainDeposit(signer: IAbstractSigner, params: Omit<SameChainDepositRequest, "chainId">): Promise<string> {
    return executeSameChainDeposit(signer, { ...params, chainId: this.requireSettlementChainId() });
  }

  executeSameChainWithdraw(
    signer: IAbstractSigner,
    params: Omit<SameChainWithdrawRequest, "chainId">
  ): Promise<string> {
    return executeSameChainWithdraw(signer, { ...params, chainId: this.requireSettlementChainId() });
  }

  executeCrossChainDeposit(
    signer: IAbstractSigner,
    request: CrossChainDepositPrepareRequest
  ): Promise<ExecuteCrossChainDepositResult> {
    this.requireSettlementChainId();
    return executeCrossChainDeposit(this.ctx, signer, request);
  }

  prepareCrossChainDeposit(request: CrossChainDepositPrepareRequest): Promise<CrossChainDepositPrepareResponse> {
    return prepareCrossChainDeposit(this.ctx, request);
  }

  prepareCrossChainWithdraw(request: CrossChainWithdrawPrepareRequest): Promise<CrossChainWithdrawPrepareResponse> {
    return prepareCrossChainWithdraw(this.ctx, request);
  }

  signCrossChainWithdraw(prepared: CrossChainWithdrawPrepareResponse, signer: IAbstractSigner): Promise<string> {
    return signCrossChainWithdrawPrepared(prepared, signer);
  }

  submitCrossChainWithdraw(request: CrossChainWithdrawSubmitRequest): Promise<CrossChainWithdrawSubmitResponse> {
    return submitCrossChainWithdraw(this.ctx, request);
  }

  executeCrossChainWithdraw(
    signer: IAbstractSigner,
    request: CrossChainWithdrawPrepareRequest
  ): Promise<CrossChainWithdrawSubmitResponse> {
    this.requireSettlementChainId();
    return executeCrossChainWithdraw(this.ctx, signer, request);
  }

  getCrossChainWithdrawStatus(requestId: string): Promise<CrossChainWithdrawStatusResponse> {
    return getCrossChainWithdrawStatus(this.ctx, requestId);
  }

  prepareOrder(request: PrepareOrderRequest): Promise<PrepareOrderResponse> {
    return prepareWithSubaccount(this.subaccountClient, request, prepareOrder);
  }

  signOrder(prepared: PrepareOrderResponse, signer: IAbstractSigner): Promise<string> {
    return signOrderWithSubaccount(this.subaccountClient, prepared, signer);
  }

  async submitOrder(request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    return submitOrderWithSubaccount(this.subaccountClient, request);
  }

  async executeExpressOrder(request: PrepareOrderRequest, signer: IAbstractSigner): Promise<SubmitOrderResponse> {
    return executeExpressOrderWithSubaccount(this.subaccountClient, request, signer);
  }

  fetchOrderStatus(request: OrderStatusRequest): Promise<OrderStatusResponse> {
    return fetchOrderStatusRaw(this.ctx, request);
  }

  prepareEditOrder(request: PrepareEditOrderRequest): Promise<PrepareOrderResponse> {
    return prepareWithSubaccount(this.subaccountClient, request, prepareEditOrder);
  }

  prepareCancelOrder(request: PrepareCancelOrderRequest): Promise<PrepareOrderResponse> {
    return prepareWithSubaccount(this.subaccountClient, request, prepareCancelOrder);
  }

  prepareCollateral(request: PrepareCollateralRequest): Promise<PrepareOrderResponse> {
    return prepareWithSubaccount(this.subaccountClient, request, prepareCollateral);
  }

  fetchSubaccountStatus(request: SubaccountStatusRequest): Promise<SubaccountStatusResponse> {
    return fetchSubaccountStatus(this.ctx, request);
  }

  async refreshSubaccountState(account: string): Promise<SdkSubaccountStatus | undefined> {
    return refreshSdkSubaccountState(this.subaccountClient, account);
  }

  prepareSubaccountApproval(request: SubaccountApprovalPrepareRequest): Promise<SubaccountApprovalPrepareResponse> {
    return prepareSubaccountApproval(this.ctx, request);
  }

  signSubaccountApproval(prepared: SubaccountApprovalPrepareResponse, signer: IAbstractSigner): Promise<string> {
    return signSubaccountApproval(prepared, signer, {
      chainId: this.ctx.chainId,
      expectedSubaccountAddress: this._subaccount?.address,
    });
  }

  /**
   * Generate a subaccount deterministically from the main signer's signature.
   * The main signer signs a predefined message, and the subaccount private key
   * is derived via keccak256(signature).
   *
   * Returns the subaccount address. Use `activateSubaccount` to sign the
   * approval and start using it for orders.
   */
  async generateSubaccount(mainSigner: IAbstractSigner): Promise<string> {
    return generateSdkSubaccount(this.subaccountClient, mainSigner);
  }

  /**
   * Generate (if needed) and activate the subaccount:
   * 1. Generates the subaccount if not already set
   * 2. Prepares and signs a SubaccountApproval with the main signer
   * 3. Stores the approval so subsequent orders use 1CT mode automatically
   */
  async activateSubaccount(
    mainSigner: IAbstractSigner,
    options?: { expiresInSeconds?: number; maxAllowedCount?: number | bigint }
  ): Promise<string> {
    return activateSdkSubaccount(this.subaccountClient, mainSigner, options);
  }

  clearSubaccount() {
    clearSdkSubaccount(this.subaccountClient);
  }
}
