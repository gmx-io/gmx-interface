import { getApiUrl } from "configs/api";
import { ContractsChainId } from "configs/chains";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "configs/express";
import { fetchApiApy } from "utils/apy/api";
import { ApyParams, ApyResponse } from "utils/apy/types";
import { fetchApiBuybackWeeklyStats } from "utils/buyback/api";
import { BuybackWeeklyStatsResponse } from "utils/buyback/types";
import { HttpClient, HttpError } from "utils/http/http";
import { IHttp } from "utils/http/types";
import { fetchApiMarkets, fetchApiMarketsInfo, fetchApiMarketsTickers, fetchApiTokensData } from "utils/markets/api";
import { MarketTicker, MarketWithTiers } from "utils/markets/types";
import { fetchApiOrders } from "utils/orders/api";
import {
  prepareOrder,
  signPreparedOrder,
  submitOrder,
  executeExpressOrder as executeExpressOrderRaw,
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
import { PrivateKeySigner } from "utils/signer";
import { fetchApiStakingPower } from "utils/staking/api";
import { StakingPowerResponse } from "utils/staking/types";
import { generateSubaccount } from "utils/subaccount/generateSubaccount";
import type { SubaccountSession } from "utils/subaccount/types";
import { fetchSubaccountStatus, prepareSubaccountApproval, signSubaccountApproval } from "utils/subaccount/api";
import type {
  SubaccountStatusRequest,
  SubaccountStatusResponse,
  SubaccountApprovalPrepareRequest,
  SubaccountApprovalPrepareResponse,
} from "utils/subaccount/api";
import { fetchApiTokens } from "utils/tokens/api";
import {
  fetchWalletBalances as fetchWalletBalancesRaw,
  fetchAllowances as fetchAllowancesRaw,
  buildApproveTransaction,
} from "utils/balances/api";
import type { WalletBalance, TokenAllowance, SpenderType, ApproveTokenParams, ApproveTokenResult } from "utils/balances/api";
import { nowInSeconds } from "utils/time";

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
export type { WalletBalance, TokenAllowance, SpenderType, ApproveTokenParams, ApproveTokenResult } from "utils/balances/api";
export type { IAbstractSigner } from "utils/signer";
export { PrivateKeySigner } from "utils/signer";
export { HttpError } from "utils/http/http";
export type {
  SubaccountStatusRequest,
  SubaccountStatusResponse,
  SubaccountApprovalPrepareRequest,
  SubaccountApprovalPrepareResponse,
};

type SubaccountState = {
  address: string;
  approval?: {
    message: Record<string, any>;
    signature: string;
  };
};

const subaccountSigners = new WeakMap<GmxApiSdk, PrivateKeySigner>();

export class GmxApiSdk {
  ctx: { chainId: ContractsChainId; api: IHttp };
  private _subaccount: SubaccountState | undefined;

  constructor({ chainId, apiUrl }: { chainId: ContractsChainId; apiUrl?: string }) {
    const resolvedApiUrl = apiUrl ?? getApiUrl(chainId);

    if (!resolvedApiUrl) {
      throw new Error("api is not supported for current chainId");
    }

    this.ctx = {
      chainId,
      api: new HttpClient(resolvedApiUrl),
    };
  }

  get subaccountAddress(): string | undefined {
    return this._subaccount?.address;
  }

  get hasActiveSubaccount(): boolean {
    return this._subaccount?.approval !== undefined;
  }

  get subaccountApprovalMessage(): Record<string, any> | undefined {
    return this._subaccount?.approval?.message;
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

  fetchWalletBalances(params: { address: string }): Promise<WalletBalance[]> {
    return fetchWalletBalancesRaw(this.ctx, params);
  }

  fetchAllowances(params: { address: string; spender: SpenderType }): Promise<TokenAllowance[]> {
    return fetchAllowancesRaw(this.ctx, params);
  }

  buildApproveTransaction(params: ApproveTokenParams): ApproveTokenResult {
    return buildApproveTransaction(this.ctx, params);
  }

  // ---------------------------------------------------------------------------
  // Order transactions: prepare → sign → submit
  // ---------------------------------------------------------------------------

  prepareOrder(request: PrepareOrderRequest): Promise<PrepareOrderResponse> {
    return prepareOrder(this.ctx, request);
  }

  signOrder(prepared: PrepareOrderResponse, signer: IAbstractSigner): Promise<string> {
    const subSigner = subaccountSigners.get(this);
    const effectiveSigner = subSigner ?? signer;
    // When signing with subaccount, the main account is a valid receiver
    const accountAddress = subSigner ? signer.address : undefined;
    return signPreparedOrder(prepared, effectiveSigner, this.ctx.chainId, accountAddress);
  }

  submitOrder(request: SubmitOrderRequest): Promise<SubmitOrderResponse> {
    return submitOrder(this.ctx, request);
  }

  async executeExpressOrder(request: PrepareOrderRequest, signer: IAbstractSigner): Promise<SubmitOrderResponse> {
    const subSigner = subaccountSigners.get(this);

    if (subSigner && this._subaccount?.approval) {
      const enrichedRequest: PrepareOrderRequest = {
        ...request,
        subaccountAddress: this._subaccount.address,
        subaccountApproval: this._subaccount.approval.message,
      };

      return executeExpressOrderRaw(this.ctx, enrichedRequest, subSigner, request.from);
    }

    return executeExpressOrderRaw(this.ctx, request, signer);
  }

  fetchOrderStatus(request: OrderStatusRequest): Promise<OrderStatusResponse> {
    return fetchOrderStatusRaw(this.ctx, request);
  }

  prepareEditOrder(request: PrepareEditOrderRequest): Promise<PrepareOrderResponse> {
    return prepareEditOrder(this.ctx, request);
  }

  prepareCancelOrder(request: PrepareCancelOrderRequest): Promise<PrepareOrderResponse> {
    return prepareCancelOrder(this.ctx, request);
  }

  prepareCollateral(request: PrepareCollateralRequest): Promise<PrepareOrderResponse> {
    return prepareCollateral(this.ctx, request);
  }

  // ---------------------------------------------------------------------------
  // Subaccounts (1CT)
  // ---------------------------------------------------------------------------

  fetchSubaccountStatus(request: SubaccountStatusRequest): Promise<SubaccountStatusResponse> {
    return fetchSubaccountStatus(this.ctx, request);
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
    const result = await generateSubaccount(mainSigner);
    subaccountSigners.set(this, result.signer);
    this._subaccount = {
      address: result.address,
    };
    return result.address;
  }

  /**
   * Generate (if needed) and activate the subaccount:
   * 1. Generates the subaccount if not already set
   * 2. Prepares and signs a SubaccountApproval with the main signer
   * 3. Stores the approval so subsequent orders use 1CT mode automatically
   */
  async activateSubaccount(
    mainSigner: IAbstractSigner,
    options?: { expiresInSeconds?: number; maxAllowedCount?: number }
  ): Promise<string> {
    if (!this._subaccount) {
      await this.generateSubaccount(mainSigner);
    }

    const expiresAt = String(nowInSeconds() + (options?.expiresInSeconds ?? DEFAULT_SUBACCOUNT_EXPIRY_DURATION));
    const maxAllowedCount = String(options?.maxAllowedCount ?? DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT);

    const prepared = await this.prepareSubaccountApproval({
      account: mainSigner.address,
      subaccountAddress: this._subaccount!.address,
      shouldAdd: true,
      expiresAt,
      maxAllowedCount,
    });

    const signature = await signSubaccountApproval(prepared, mainSigner, {
      chainId: this.ctx.chainId,
      expectedSubaccountAddress: this._subaccount!.address,
    });

    this._subaccount!.approval = {
      message: { ...prepared.message, signature },
      signature,
    };

    return this._subaccount!.address;
  }

  clearSubaccount() {
    subaccountSigners.delete(this);
    this._subaccount = undefined;
  }
}
