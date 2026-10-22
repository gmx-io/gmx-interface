import assert from "node:assert/strict";
import {
  createPublicClient,
  erc20Abi,
  getAddress,
  hexToString,
  http,
  isAddress,
  parseAbi,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { arbitrum, avalanche } from "viem/chains";

import { getApiUrl } from "../../../sdk/src/configs/api";
import { getContract } from "../../../sdk/src/configs/contracts";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { convertTokenAddress, getToken, getTokens, isValidTokenSafe } from "../../../sdk/src/configs/tokens";
import { HttpClient } from "../../../sdk/src/utils/http/http";
import { formatBalanceAmount } from "../../../sdk/src/utils/numbers/utils";
import { fetchApiPositionsInfo } from "../../../sdk/src/utils/positions/api";
import { fetchApiOrders } from "../../../sdk/src/utils/orders/api";
import { fetchApiMarketsInfo } from "../../../sdk/src/utils/markets/api";
import { getMarketFullName } from "../../../sdk/src/utils/markets/utils";
import { fetchApiStakingPower } from "../../../sdk/src/utils/staking/api";
import { fetchApiTrades } from "../../../sdk/src/utils/trades/api";
import { decodeTwapUiFeeReceiver } from "../../../sdk/src/utils/twap/uiFeeReceiver";
import type { ApiPositionInfo } from "../../../sdk/src/utils/positions/types";
import type { ApiOrderInfo } from "../../../sdk/src/utils/orders/types";
import type { StakingPowerResponse } from "../../../sdk/src/utils/staking/types";
import { readRegressionIndexers, readRegressionGlvs } from "./deploymentConfig";
import { selectFinancialAccount, type FinancialProfile, type FinancialEvidence } from "./liveFinancialAccounts";

export type LiveProfile =
  | "position"
  | "order"
  | "staking"
  | "glv"
  | "history"
  | "gm"
  | "escrow"
  | "claims"
  | "referral"
  | "ranked"
  | "accrued"
  | "tpsl"
  | "transfers"
  | "fees"
  | "affiliate"
  | "distribution"
  | FinancialProfile;
export type LiveChain = 42161 | 43114;
export type FundingTransfer = {
  id: string;
  step: string;
  operation: "deposit" | "withdrawal";
  sourceChainId: number;
  settlementChainId: number;
  sentTimestamp: number;
  sentTxn: Hex;
  sentAmount: string;
  isExecutionError: boolean | null;
  token: Address;
};
export type Distribution = {
  id: string;
  typeId: string;
  amounts: string[];
  amountsInUsd: string[] | null;
  tokens: string[];
  timestamp: number;
  transactionHash: Hex;
};
// Earn > Distributions query; referral rebates and claims are listed under Referrals instead.
const DISTRIBUTIONS_QUERY =
  'query RegressionDistributions($account: String!) { distributions(orderBy: timestamp_DESC, where: {receiver_eq: $account, typeId_not_in: ["1", "1000", "2"]}, limit: 1000) { id typeId amounts amountsInUsd tokens timestamp transactionHash } }';

// Same lookup order as the Distributions tab: GM market, then token, then configured GLV.
export function distributionToken(chainId: LiveChain, address: string) {
  const token = getAddress(address);
  const market = MARKETS[chainId][token];
  if (market) {
    const symbol = getMarketFullName({
      indexToken: getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native")),
      longToken: getToken(chainId, market.longTokenAddress),
      shortToken: getToken(chainId, market.shortTokenAddress),
      isSpotOnly: market.indexTokenAddress === zeroAddress,
    });
    return { symbol, decimals: 18, isGm: true };
  }
  // The token list also holds non-address placeholders such as the generic GM token.
  const info = getTokens(chainId).find(
    (t) => isAddress(t.address, { strict: false }) && getAddress(t.address) === token
  );
  if (info) return { symbol: info.symbol, decimals: info.decimals, isGm: false };
  if (readRegressionGlvs(chainId).some((glv) => getAddress(glv) === token))
    return { symbol: "GLV", decimals: 18, isGm: false };
}

type TradeActionSummary = {
  id: string;
  eventName: string;
  orderType: number;
  sizeDeltaUsd: string;
  positionFeeAmount: string | null;
  twapGroupId: string | null;
};
type Candidate = {
  account: Address;
  key?: string;
  token?: Address;
  transactionHash?: string;
  timestamp?: number;
  code?: Hex;
};
export type LiveAccount = Candidate & {
  profile: LiveProfile;
  discoveredAt: string;
  checkedAt: string;
  endpoint: string;
  indexerHeight: number;
  candidateNumber: number;
  financial?: FinancialEvidence;
  position?: ApiPositionInfo;
  order?: ApiOrderInfo;
  balance?: bigint;
  referralCodeCount?: number;
  transfers?: { deposit: FundingTransfer; withdrawal: FundingTransfer };
  trades?: { open: string; close: string };
  vesting?: { vested: bigint; maxVestable: bigint; walletEsGmx: bigint; unstakeEsGmxMax: bigint };
  staking?: { gmx: bigint; esGmx: bigint; unstakeMax: bigint; power: StakingPowerResponse };
  distributions?: Distribution[];
};

const fields: Record<Exclude<LiveProfile, FinancialProfile>, string> = {
  ranked: `periodAccountStats(limit:20,where:{maxCapital_gte:"${500n * 10n ** 30n}",from:0}) { id }`,
  accrued:
    'positions(limit:20,orderBy:openedAt_ASC,where:{isSnapshot_eq:false,sizeInUsd_gt:"100000000000000000000000000000000"}) { account positionKey }',
  gm: 'latestUserGmTokensBalanceChangeRefs(first:20,orderBy:latestUserGmTokensBalanceChange__tokensBalance,orderDirection:desc,where:{latestUserGmTokensBalanceChange_:{tokensBalance_gt:"1000000000000000000"}}) { latestUserGmTokensBalanceChange { account marketAddress } }',
  escrow:
    'stakingPowers(limit:20,orderBy:currentStakedBalance_DESC,where:{currentStakedBalance_gt:"1000000000000000000"}) { id }',
  claims:
    "claimActions(limit:20,orderBy:timestamp_DESC,where:{eventName_eq:ClaimFunding}) { account transactionHash timestamp }",
  referral: "referralCodeOwners(limit:20,orderBy:updatedAtTimestamp_DESC) { owner id }",
  position:
    'positions(limit: 20, orderBy: openedAt_ASC, where: {isSnapshot_eq: false, sizeInUsd_gt: "100000000000000000000000000000000"}) { account positionKey }',
  order:
    "orders(limit: 20, orderBy: updatedAtBlock_ASC, where: {status_eq: Created, orderType_eq: 3, twapGroupId_isNull: true}) { account id }",
  tpsl: 'tradeActions(limit: 50, orderBy: timestamp_DESC, where: {eventName_eq: "OrderCreated", orderType_in: [5, 6], twapGroupId_isNull: true}) { account }',
  transfers:
    "multichainFundingSendEvents(limit: 20, orderBy: timestamp_DESC, where: {sourceChainId_gt: 0, operation_eq: withdrawal, timestamp_lt: TRANSFER_CUTOFF}) { account }",
  fees: 'tradeActions(limit: 20, orderBy: timestamp_DESC, where: {eventName_eq: "OrderExecuted", orderType_in: [4,5,6], sizeDeltaUsd_gt: "0", positionFeeAmount_gt: "0", twapGroupId_isNull: true}) { account transactionHash timestamp }',
  affiliate:
    'affiliateReferralTradeStatsByHours(limit: 20, orderBy: timestamp_DESC, where: {rebatesUsd_gt: "0"}) { affiliate }',
  distribution:
    'distributions(limit: 20, orderBy: timestamp_DESC, where: {typeId_not_in: ["1", "1000", "2"]}) { receiver }',
  staking:
    'stakingPowers(limit: 20, orderBy: currentStakedBalance_DESC, where: {currentStakedBalance_gt: "1000000000000000000"}) { id }',
  glv: 'glvTokenBalances(limit: 20, orderBy: balance_DESC, where: {balance_gt: "1000000000000000000"}) { account glvAddress }',
  history:
    'tradeActions(limit: 20, orderBy: timestamp_DESC, where: {eventName_eq: "OrderExecuted", orderType_in: [2,4], sizeDeltaUsd_gt: "0"}) { account orderKey transactionHash timestamp }',
};
const entities: Record<Exclude<LiveProfile, FinancialProfile>, string> = {
  ranked: "periodAccountStats",
  accrued: "positions",
  gm: "latestUserGmTokensBalanceChangeRefs",
  escrow: "stakingPowers",
  claims: "claimActions",
  referral: "referralCodeOwners",
  position: "positions",
  order: "orders",
  tpsl: "tradeActions",
  transfers: "multichainFundingSendEvents",
  fees: "tradeActions",
  affiliate: "affiliateReferralTradeStatsByHours",
  distribution: "distributions",
  staking: "stakingPowers",
  glv: "glvTokenBalances",
  history: "tradeActions",
};
// Older than a week, so the transfer list and details render absolute dates.
const transferCutoff = () => Math.floor(Date.now() / 1000) - 8 * 86_400;

export class LiveAccounts {
  readonly rpc;
  readonly api;
  readonly endpoint: string;
  private candidates = new Map<LiveProfile, { rows: Candidate[]; at: string; height: number; endpoint: string }>();

  constructor(readonly chainId: LiveChain) {
    const chain = chainId === 42161 ? arbitrum : avalanche;
    this.rpc = createPublicClient({
      chain,
      // The public endpoint rate-limits bursts; back off briefly instead of failing on one 429.
      transport: http(chain.rpcUrls.default.http[0], { timeout: 15_000, retryCount: 2, retryDelay: 1_000 }),
    });
    this.api = new HttpClient(getApiUrl(chainId)!, 15_000);
    const endpoint = readRegressionIndexers().endpoints.get(chainId === 42161 ? "[ARBITRUM]" : "[AVALANCHE]");
    assert.ok(endpoint, "No Subsquid endpoint in the selected checkout");
    this.endpoint = endpoint;
  }

  async query<T>(query: string, variables?: Record<string, unknown>, endpoint = this.endpoint): Promise<T> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`LIVE_DATA_UNAVAILABLE: indexer returned HTTP ${response.status}`);
    const result = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (result.errors?.length || !result.data)
      throw new Error(
        `LIVE_DATA_UNAVAILABLE: indexer ${result.errors?.map((e) => e.message).join("; ") || "empty response"}`
      );
    return result.data;
  }

  async select(profile: LiveProfile): Promise<LiveAccount> {
    if (profile === "account" || profile === "funding" || profile === "rebate")
      return selectFinancialAccount(this, profile);
    let pool = this.candidates.get(profile);
    const fresh = profile === "history" || profile === "claims" || profile === "fees";
    if (!pool || fresh || Date.now() - Date.parse(pool.at) > 300_000) {
      const selection =
        profile === "glv"
          ? fields.glv.replace(
              "where: {",
              `where: {glvAddress_in: ${JSON.stringify(readRegressionGlvs(this.chainId))},`
            )
          : fields[profile].replace("TRANSFER_CUTOFF", String(transferCutoff()));
      const endpoint =
        profile === "gm"
          ? readRegressionIndexers("syntheticsStats").endpoints.get(
              this.chainId === 42161 ? "[ARBITRUM]" : "[AVALANCHE]"
            )
          : this.endpoint;
      assert.ok(endpoint, "Missing candidate indexer endpoint");
      const result = await this.query<Record<string, unknown>>(
        `query RegressionLiveCandidates { ${profile === "gm" ? "_meta { block { number } }" : "squidStatus { height }"} ${selection} }`,
        undefined,
        endpoint
      );
      const values =
        profile === "gm"
          ? (result[entities[profile]] as { latestUserGmTokensBalanceChange: Record<string, string | number> }[]).map(
              (r) => r.latestUserGmTokensBalanceChange
            )
          : (result[entities[profile]] as Record<string, string | number>[]);
      assert.ok(Array.isArray(values), "Invalid candidate response");
      const mapped = values.map(
        (row): Candidate => ({
          account: getAddress(
            String(
              profile === "staking" || profile === "escrow" || profile === "ranked"
                ? row.id
                : profile === "referral"
                  ? row.owner
                  : profile === "affiliate"
                    ? row.affiliate
                    : profile === "distribution"
                      ? row.receiver
                      : row.account
            )
          ),
          key:
            profile === "position" || profile === "accrued"
              ? String(row.positionKey)
              : profile === "order"
                ? String(row.id)
                : undefined,
          token:
            profile === "glv"
              ? getAddress(String(row.glvAddress))
              : profile === "gm"
                ? getAddress(String(row.marketAddress))
                : undefined,
          code: profile === "referral" ? (String(row.id) as Hex) : undefined,
          transactionHash: "transactionHash" in row ? String(row.transactionHash) : undefined,
          timestamp: "transactionHash" in row ? Number(row.timestamp) : undefined,
        })
      );
      // Event and hourly-stat sources repeat the same account; check each candidate once.
      const rows = mapped.filter(
        (row, i) =>
          mapped.findIndex(
            (other) =>
              other.account === row.account &&
              other.key === row.key &&
              other.token === row.token &&
              other.code === row.code &&
              other.transactionHash === row.transactionHash
          ) === i
      );
      pool = {
        rows,
        at: new Date().toISOString(),
        endpoint,
        height:
          profile === "gm"
            ? (result._meta as { block: { number: number } }).block.number
            : (result.squidStatus as { height: number }).height,
      };
      this.candidates.set(profile, pool);
    }
    let checked = 0;
    for (const row of pool.rows.slice(0, 12)) {
      checked++;
      // Choose ordinary externally owned accounts.
      const code = await this.rpc.getCode({ address: row.account });
      if (code && code !== "0x") continue;
      const verified = await this.verify(profile, row);
      if (!verified) continue;
      return {
        ...row,
        ...verified,
        profile,
        discoveredAt: pool.at,
        checkedAt: new Date().toISOString(),
        endpoint: pool.endpoint,
        indexerHeight: pool.height,
        candidateNumber: checked,
      };
    }
    this.candidates.delete(profile);
    throw new Error(
      `LIVE_DATA_UNAVAILABLE: no current ${profile} account among ${checked} checked indexer candidates on ${this.chainId}; no mock fallback`
    );
  }

  private async verify(profile: LiveProfile, row: Candidate): Promise<Partial<LiveAccount> | undefined> {
    if (profile === "ranked") {
      const result = await this.query<{ periodAccountStats: { id: string }[] }>(
        `query($account:String!) { periodAccountStats(limit:1,where:{id_eq:$account,maxCapital_gte:"${500n * 10n ** 30n}",from:0}) { id } }`,
        { account: row.account }
      );
      return result.periodAccountStats.some((account) => getAddress(account.id) === row.account) ? {} : undefined;
    }
    if (profile === "position" || profile === "accrued") {
      const positions = await fetchApiPositionsInfo(this, { address: row.account });
      const position = positions.find((p) => p.contractKey === row.key && p.sizeInUsd > 0n);
      if (profile === "accrued" && (position?.pendingClaimableFundingFeesUsd ?? 0n) < 10n ** 29n) return;
      return position ? { position } : undefined;
    }
    if (profile === "order") {
      const orders = await fetchApiOrders(this, { address: row.account });
      const order = orders.find((o) => o.key === row.key && o.orderType === 3 && !o.isFrozen);
      return order ? { order } : undefined;
    }
    if (profile === "tpsl") {
      // Active traders replace TP/SL orders often, so any current one beside its open position qualifies.
      const orders = (await fetchApiOrders(this, { address: row.account })).filter(
        (o) =>
          [5, 6].includes(o.orderType) && !o.isFrozen && !(o.uiFeeReceiver && decodeTwapUiFeeReceiver(o.uiFeeReceiver))
      );
      if (!orders.length) return;
      const positions = await fetchApiPositionsInfo(this, { address: row.account });
      for (const order of orders) {
        const position = positions.find(
          (p) =>
            getAddress(p.marketAddress) === getAddress(order.marketAddress) &&
            getAddress(p.collateralTokenAddress) === getAddress(order.initialCollateralTokenAddress) &&
            p.isLong === order.isLong &&
            p.sizeInUsd > 0n
        );
        if (position) return { key: order.key, order, position };
      }
      return;
    }
    if (profile === "transfers") return this.verifyTransfers(row);
    if (profile === "fees") return this.verifyFees(row);
    if (profile === "affiliate") {
      const result = await this.query<{
        referralCodeOwners: { id: Hex }[];
        affiliateStats: { summary: { volumeUsd: string } } | null;
      }>(
        "query RegressionAffiliate($owner: String!, $where: AffiliateStatsWhereInput) { referralCodeOwners(limit: 51, where: {owner_eq: $owner}) { id } affiliateStats(where: $where) { summary { volumeUsd } } }",
        { owner: row.account, where: { affiliate: row.account, from: 0 } }
      );
      const codes = result.referralCodeOwners;
      // The spec walks all codes on one 50-row page.
      if (codes.length < 1 || codes.length > 50 || !(BigInt(result.affiliateStats?.summary.volumeUsd ?? 0) > 0n))
        return;
      const owner = await this.rpc.readContract({
        address: getAddress(getContract(this.chainId, "ReferralStorage")),
        abi: parseAbi(["function codeOwners(bytes32) view returns(address)"]),
        functionName: "codeOwners",
        args: [codes[0].id],
      });
      return getAddress(owner) === row.account ? { code: codes[0].id, referralCodeCount: codes.length } : undefined;
    }
    if (profile === "distribution") {
      const { distributions } = await this.query<{ distributions: Distribution[] }>(DISTRIBUTIONS_QUERY, {
        account: row.account,
      });
      // The tab shows 15 rows per page; each token there must resolve to a name the app shows.
      const page = distributions.slice(0, 15);
      if (!page.length || !page.every((d) => d.tokens.every((token) => distributionToken(this.chainId, token)))) return;
      const receipt = await this.rpc.getTransactionReceipt({ hash: page[0].transactionHash });
      return receipt.status === "success" ? { distributions: page } : undefined;
    }
    if (profile === "gm") {
      const markets = await fetchApiMarketsInfo(this);
      if (!markets.some((m) => getAddress(m.marketTokenAddress) === row.token && !m.isDisabled)) return;
    }
    if (profile === "glv" || profile === "gm") {
      const balance = await this.rpc.readContract({
        address: row.token!,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [row.account],
      });
      return balance >= 10n ** 18n ? { balance } : undefined;
    }
    if (profile === "staking" || profile === "escrow") {
      const abi = parseAbi(["function depositBalances(address,address) view returns(uint256)"]);
      const tracker = getAddress(getContract(this.chainId, "StakedGmxTracker"));
      const gmx = await this.rpc.readContract({
        address: tracker,
        abi,
        functionName: "depositBalances",
        args: [row.account, getAddress(getContract(this.chainId, "GMX"))],
      });
      if (gmx < 10n ** 18n) return;
      const esGmx = await this.rpc.readContract({
        address: tracker,
        abi,
        functionName: "depositBalances",
        args: [row.account, getAddress(getContract(this.chainId, "ES_GMX"))],
      });
      const power = await fetchApiStakingPower(this, { address: row.account });
      const available = await this.rpc.readContract({
        address: getAddress(getContract(this.chainId, "FeeGmxTracker")),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [row.account],
      });
      const unstakeMax = gmx < available ? gmx : available;
      if (power.currentStaked <= 0n || unstakeMax <= 0n) return;
      const staking = { gmx, esGmx, unstakeMax, power };
      if (profile === "staking") return { staking };
      if (esGmx === 0n) return;
      const vestingInfo = await this.rpc.readContract({
        address: getAddress(getContract(this.chainId, "Reader")),
        abi: parseAbi(["function getVestingInfo(address,address[]) view returns(uint256[])"]),
        functionName: "getVestingInfo",
        args: [row.account, [getAddress(getContract(this.chainId, "GmxVester"))]],
      });
      if (vestingInfo[1] === 0n) return;
      const walletEsGmx = await this.rpc.readContract({
        address: getAddress(getContract(this.chainId, "ES_GMX")),
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [row.account],
      });
      const unstakeEsGmxMax = esGmx < available ? esGmx : available;
      return {
        staking,
        vesting: { vested: vestingInfo[1], maxVestable: vestingInfo[5], walletEsGmx, unstakeEsGmxMax },
      };
    }
    if (profile === "referral") {
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(hexToString(row.code!, { size: 32 }))) return;
      const counts = await this.query<{ referralCodeOwnersConnection: { totalCount: number } }>(
        "query RegressionReferralSize($owner: String!) { referralCodeOwnersConnection(orderBy: id_ASC, where: { owner_eq: $owner }) { totalCount } }",
        { owner: row.account }
      );
      const referralCodeCount = counts.referralCodeOwnersConnection.totalCount;
      if (referralCodeCount < 1 || referralCodeCount > 400) return;
      const owner = await this.rpc.readContract({
        address: getAddress(getContract(this.chainId, "ReferralStorage")),
        abi: parseAbi(["function codeOwners(bytes32) view returns(address)"]),
        functionName: "codeOwners",
        args: [row.code!],
      });
      return getAddress(owner) === row.account ? { referralCodeCount } : undefined;
    }
    assert.ok(row.transactionHash && row.timestamp);
    if (profile === "claims") {
      const receipt = await this.rpc.getTransactionReceipt({ hash: row.transactionHash as Hex });
      return receipt.status === "success" ? {} : undefined;
    }
    const history = await fetchApiTrades(this, { address: row.account, limit: 25 });
    if (!history.trades.some((trade) => trade.transactionHash === row.transactionHash)) return;
    const receipt = await this.rpc.getTransactionReceipt({ hash: row.transactionHash as `0x${string}` });
    return receipt.status === "success" ? {} : undefined;
  }

  private async verifyTransfers(row: Candidate): Promise<Partial<LiveAccount> | undefined> {
    const { multichainFunding } = await this.query<{ multichainFunding: FundingTransfer[] }>(
      "query RegressionTransfers($account: String) { multichainFunding(where: {account: $account}) { id step operation sourceChainId settlementChainId sentTimestamp sentTxn sentAmount isExecutionError token } }",
      { account: row.account }
    );
    const cutoff = transferCutoff();
    const listed = multichainFunding.filter((t) => isValidTokenSafe(t.settlementChainId, t.token));
    // The list has no per-row id, so the chosen rows must differ in operation, token, amount or day.
    const label = (t: FundingTransfer) => {
      const token = getToken(t.settlementChainId, t.token);
      const amount = (t.operation === "deposit" ? 1n : -1n) * BigInt(t.sentAmount);
      const day = new Date(t.sentTimestamp * 1000).toISOString().slice(0, 10);
      return `${token.symbol}:${formatBalanceAmount(amount, token.decimals, undefined, { isStable: token.isStable, signed: true })}:${day}`;
    };
    const pick = (operation: FundingTransfer["operation"], steps: string[]) =>
      listed.find(
        (t) =>
          t.operation === operation &&
          t.sourceChainId !== 0 &&
          steps.includes(t.step) &&
          !t.isExecutionError &&
          t.sentTimestamp < cutoff &&
          listed.filter((other) => label(other) === label(t)).length === 1
      );
    const deposit = pick("deposit", ["executed"]);
    const withdrawal = pick("withdrawal", ["received", "executed"]);
    if (!deposit || !withdrawal) return;
    const receipt = await this.rpc.getTransactionReceipt({ hash: withdrawal.sentTxn });
    return receipt.status === "success" ? { transfers: { deposit, withdrawal } } : undefined;
  }

  private async verifyFees(row: Candidate): Promise<Partial<LiveAccount> | undefined> {
    // Same filters as the default trade history list, so both rows are on its first page.
    const { tradeActions } = await this.query<{ tradeActions: TradeActionSummary[] }>(
      'query RegressionTradeFees($account: String!) { tradeActions(limit: 20, orderBy: [timestamp_DESC, id_DESC], where: {AND: [{account_eq: $account, isFundingFeeSettle_eq: false}, {OR: [{eventName_not_eq: "OrderCreated"}, {orderType_not_in: [0, 2, 4, 7]}]}]}) { id eventName orderType sizeDeltaUsd positionFeeAmount twapGroupId } }',
      { account: row.account }
    );
    const executed = (types: number[]) =>
      tradeActions.find(
        (a) =>
          a.eventName === "OrderExecuted" &&
          types.includes(a.orderType) &&
          BigInt(a.sizeDeltaUsd) > 0n &&
          BigInt(a.positionFeeAmount ?? 0) > 0n &&
          !a.twapGroupId
      );
    const open = executed([2, 3, 8]);
    const close = executed([4, 5, 6]);
    return open && close ? { trades: { open: open.id, close: close.id } } : undefined;
  }

  positions(address: string) {
    return fetchApiPositionsInfo(this, { address });
  }
  orders(address: string) {
    return fetchApiOrders(this, { address });
  }
}
