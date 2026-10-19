import { useCallback, useMemo } from "react";

import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import {
  selectGlvAndMarketsInfoData,
  selectMultichainMarketTokensBalancesIsLoading,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useBuybackWeeklyStats } from "domain/buyback/useBuybackWeeklyStats";
import { USDC_DECIMALS, useGtBuybackSummary } from "domain/gtBuyback/useGtBuybackSummary";
import { useGmxPrice } from "domain/legacy";
import type { MultichainMarketTokensBalances } from "domain/multichain/types";
import { useStakingProcessedData } from "domain/stake/useStakingProcessedData";
import { useTreasuryProjection } from "domain/stake/useTreasuryProjection";
import type { ClaimableAmountsDataByDistributionId } from "domain/synthetics/claims/useUserClaimableAmounts";
import useUserClaimableAmounts from "domain/synthetics/claims/useUserClaimableAmounts";
import useUserIncentiveData from "domain/synthetics/common/useUserIncentiveData";
import { GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { getGlvOrMarketAddress, type GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { useGlvUserEarnings } from "domain/synthetics/markets/useGlvUserEarnings";
import { usePerformanceAnnualized } from "domain/synthetics/markets/usePerformanceAnnualized";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { useTokenBalances, type TokenData } from "domain/synthetics/tokens";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { formatAmountFree, parseValue, PRECISION } from "lib/numbers";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID } from "sdk/configs/chains";
import { getTokens, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import type { StakingPowerResponse } from "sdk/utils/staking/types";

import {
  buildRewardsTesterEarnData,
  buildRewardsTesterEarnDistributions,
  type RewardsTesterEarnData,
  type RewardsTesterEarnToggles,
  type RewardsTesterEarnValues,
} from "./rewardsTesterEarnFixtures";
import { REWARDS_TESTER_LIVE_SCENARIO_ID } from "./rewardsTesterFixtures";
import {
  getRewardsTesterEarnState,
  isRewardsTesterAvailable,
  setRewardsTesterState,
  useRewardsTesterState,
} from "./useRewardsTester";

// Drop-in replacements for the Earn pages. They return the live value untouched unless the app runs in
// development and an Earn scenario is picked in the Tester window.
const REWARDS_TESTER_EARN_LP_TOKEN_PRICE = (3n * PRECISION) / 2n;
const REWARDS_TESTER_EARN_MIN_LP_USD = 10n * PRECISION;
const REWARDS_TESTER_EARN_HISTORY_ERROR = new Error("Rewards tester: distribution history partly unavailable");
const REWARDS_TESTER_EARN_EMPTY_CLAIMABLES: ClaimableAmountsDataByDistributionId = {};

// Placeholder staking power used only when the live response is missing, so "Accumulated rewards" can render.
const REWARDS_TESTER_EARN_STAKING_POWER: StakingPowerResponse = {
  cumulativePower: 0n,
  totalNetworkPower: 1n,
  userSharePercent: 0,
  historicalMaxStaked: null,
  currentStaked: 0n,
  loyaltyRatio: null,
  lastPowerResetAt: null,
  powerResetCount: 0,
  projectedRewardShare: null,
  treasuryGmxBalance: 1n,
  powerAccrualStart: 0,
  loyaltyTrackingStart: 0,
};

const rewardsTesterEarnDataCache = new WeakMap<
  RewardsTesterEarnValues,
  WeakMap<RewardsTesterEarnToggles, RewardsTesterEarnData | undefined>
>();

function getRewardsTesterEarnCachedData(values: RewardsTesterEarnValues, toggles: RewardsTesterEarnToggles) {
  let valuesCache = rewardsTesterEarnDataCache.get(values);

  if (!valuesCache) {
    valuesCache = new WeakMap();
    rewardsTesterEarnDataCache.set(values, valuesCache);
  }

  if (!valuesCache.has(toggles)) {
    valuesCache.set(toggles, buildRewardsTesterEarnData(values, toggles));
  }

  return valuesCache.get(toggles);
}

export function useRewardsTesterEarnData(): RewardsTesterEarnData | undefined {
  const { earn } = useRewardsTesterState();

  if (!isRewardsTesterAvailable() || earn.scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID) return undefined;

  return getRewardsTesterEarnCachedData(earn.values, earn.toggles);
}

type RewardsTesterEarnLpPosition = {
  address: string;
  isGlv: boolean;
  usd: bigint;
  balances: MultichainMarketTokensBalances[string];
};

const rewardsTesterEarnLpCache = new WeakMap<RewardsTesterEarnData, Map<string, RewardsTesterEarnLpPosition[]>>();

function getRewardsTesterEarnLpPositions(
  data: RewardsTesterEarnData,
  marketsInfoData: GlvAndGmMarketsInfoData | undefined,
  chainId: number
): RewardsTesterEarnLpPosition[] {
  if (!data.account || data.lpPositions === 0 || !marketsInfoData) return [];

  let byChain = rewardsTesterEarnLpCache.get(data);
  if (!byChain) {
    byChain = new Map();
    rewardsTesterEarnLpCache.set(data, byChain);
  }

  const cacheKey = `${chainId}:${Object.keys(marketsInfoData).length}`;
  const cached = byChain.get(cacheKey);
  if (cached) return cached;

  const infos = Object.values(marketsInfoData).sort(
    (first, second) => Number(isGlvInfo(second)) - Number(isGlvInfo(first))
  );
  const positions = infos.slice(0, data.lpPositions).map((info, index, list) => {
    const scaledUsd = (data.lpValueUsd * BigInt(list.length - index)) / BigInt(list.length);
    const usd = scaledUsd > REWARDS_TESTER_EARN_MIN_LP_USD ? scaledUsd : REWARDS_TESTER_EARN_MIN_LP_USD;
    const balance = (usd * 10n ** 18n) / REWARDS_TESTER_EARN_LP_TOKEN_PRICE;
    const isMultichain = data.lpLocation === "multichain";
    const walletBalance = isMultichain ? balance / 2n : balance;
    const walletUsd = isMultichain ? usd / 2n : usd;

    return {
      address: getGlvOrMarketAddress(info),
      isGlv: isGlvInfo(info),
      usd,
      balances: {
        totalBalance: balance,
        totalBalanceUsd: usd,
        balances: {
          [chainId]: { balance: walletBalance, balanceUsd: walletUsd },
          ...(isMultichain
            ? { [GMX_ACCOUNT_PSEUDO_CHAIN_ID]: { balance: balance - walletBalance, balanceUsd: usd - walletUsd } }
            : {}),
        },
      },
    };
  });

  byChain.set(cacheKey, positions);

  return positions;
}

function useRewardsTesterEarnLpPositions() {
  const data = useRewardsTesterEarnData();
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const { chainId } = useChainId();

  return { data, positions: data ? getRewardsTesterEarnLpPositions(data, marketsInfoData, chainId) : [] };
}

// Drop-in for useWallet(): swaps in the fake account (or none) and never exposes a signer.
export function useRewardsTesterEarnWallet() {
  const wallet = useWallet();
  const data = useRewardsTesterEarnData();

  if (!data) return wallet;

  return {
    ...wallet,
    account: data.account as typeof wallet.account,
    active: Boolean(data.account),
    status: (data.isWalletInitializing
      ? "reconnecting"
      : data.account
        ? "connected"
        : "disconnected") as typeof wallet.status,
    signer: undefined,
  };
}

// Drop-in for useIsWalletInitializing().
export function useRewardsTesterEarnIsWalletInitializing() {
  const isWalletInitializing = useIsWalletInitializing();
  const data = useRewardsTesterEarnData();

  return data ? data.isWalletInitializing : isWalletInitializing;
}

// Drop-in for useStakingProcessedData(): replaces balances, pending rewards, lifetime rewards and the paused flag.
export function useRewardsTesterEarnStakingProcessedData(...args: Parameters<typeof useStakingProcessedData>) {
  const result = useStakingProcessedData(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(() => {
    if (!data) return result;
    if (data.isLoading) return { ...result, data: undefined };
    if (!result.data) return result;

    return { ...result, data: { ...result.data, ...data.processedDataOverrides } };
  }, [data, result]);
}

// Drop-in for useVestingData(): legacy vester amounts for the esGMX section and the Vest modal.
export function useRewardsTesterEarnVestingData(...args: Parameters<typeof useVestingData>) {
  const result = useVestingData(...args);
  const data = useRewardsTesterEarnData();

  return data?.vestingData ?? (data ? undefined : result);
}

// Drop-in for useIncentivesV2State(): the GT card needs an active incentives program.
export function useRewardsTesterEarnIncentivesV2State() {
  const state = useIncentivesV2State();
  const data = useRewardsTesterEarnData();

  return useMemo(() => (data ? { ...state, isActive: true } : state), [data, state]);
}

// Drop-in for useIncentivesLeaderboard(): returns the tester account's all-time entry (GT rewards).
export function useRewardsTesterEarnIncentivesLeaderboard(...args: Parameters<typeof useIncentivesLeaderboard>) {
  const [chainId, params] = args;
  const data = useRewardsTesterEarnData();
  const result = useIncentivesLeaderboard(chainId, data ? { ...params, enabled: false } : params);

  return useMemo(() => {
    if (!data) return result;

    const entries = data.account && !data.isLoading ? data.leaderboardEntries : undefined;

    return {
      ...result,
      data: entries,
      totalCount: entries?.length,
      hasNextPage: false,
      error: undefined,
      loading: Boolean(data.account && data.isLoading),
      isValidating: false,
    };
  }, [data, result]);
}

// Drop-in for useLatestGtPrice().
export function useRewardsTesterEarnLatestGtPrice(...args: Parameters<typeof useLatestGtPrice>) {
  const [chainId, params = {}] = args;
  const data = useRewardsTesterEarnData();
  const result = useLatestGtPrice(chainId, data ? { ...params, enabled: false } : params);

  return useMemo(
    () => (data ? { ...result, data: data.gtPrice, error: undefined, loading: false, isValidating: false } : result),
    [data, result]
  );
}

// Drop-in for useGmxPrice() on the GMX card.
export function useRewardsTesterEarnGmxPrice(...args: Parameters<typeof useGmxPrice>) {
  const result = useGmxPrice(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(
    () => (data?.gmxPrice !== undefined ? { ...result, gmxPrice: data.gmxPrice } : result),
    [data, result]
  );
}

// Drop-in for useTreasuryProjection() on the GMX card and the staking panel.
export function useRewardsTesterEarnTreasuryProjection(...args: Parameters<typeof useTreasuryProjection>) {
  const result = useTreasuryProjection(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(() => {
    if (!data) return result;
    if (data.isLoading) return { ...result, stakingPowerData: undefined, isLoading: true };
    if (!data.treasury) return { ...result, stakingPowerData: undefined, isLoading: false };

    return {
      ...result,
      stakingPowerData: { ...REWARDS_TESTER_EARN_STAKING_POWER, ...data.treasury.stakingPowerData },
      projectedRewardGmx: data.treasury.projectedRewardGmx,
      projectedRewardUsd: data.treasury.projectedRewardUsd,
      isTreasuryAccumulating: data.treasury.isTreasuryAccumulating,
      isLoading: false,
    };
  }, [data, result]);
}

// Drop-in for useBuybackWeeklyStats(): steady buyback weeks so the estimated APR can show.
export function useRewardsTesterEarnBuybackWeeklyStats(...args: Parameters<typeof useBuybackWeeklyStats>) {
  const result = useBuybackWeeklyStats(...args);
  const data = useRewardsTesterEarnData();

  return data?.buybackWeeklyStats ? { data: data.buybackWeeklyStats, error: undefined, isLoading: false } : result;
}

// Drop-in for useSelector(): fake GM/GLV balances (placeholder positions on real markets).
export function useRewardsTesterEarnSelector<Selected>(selector: (state: SyntheticsState) => Selected): Selected {
  const value = useSelector(selector);
  const { data, positions } = useRewardsTesterEarnLpPositions();
  const balances = useMemo(
    () => Object.fromEntries(positions.map((position) => [position.address, position.balances])),
    [positions]
  );

  if (!data) return value;
  if (selector === (selectMultichainMarketTokenBalances as unknown)) return balances as Selected;
  if (selector === (selectMultichainMarketTokensBalancesIsLoading as unknown)) return false as Selected;

  return value;
}

function getRewardsTesterEarnLpEarnings(positions: RewardsTesterEarnLpPosition[], isGlv: boolean) {
  const byAddress: Record<string, { total: bigint; recent: bigint; expected365d: bigint }> = {};
  const all = { total: 0n, recent: 0n, expected365d: 0n };

  positions
    .filter((position) => position.isGlv === isGlv)
    .forEach((position) => {
      const earnings = {
        total: (position.usd * 8n) / 100n,
        recent: (position.usd * 2n) / 1_000n,
        expected365d: (position.usd * 12n) / 100n,
      };
      byAddress[position.address] = earnings;
      all.total += earnings.total;
      all.recent += earnings.recent;
      all.expected365d += earnings.expected365d;
    });

  return { byAddress, all };
}

function getRewardsTesterEarnLpEarningsState(data: RewardsTesterEarnData) {
  return {
    isLoading: data.lpEarnings === "loading",
    isUnavailable: data.lpEarnings === "unavailable",
    isEstimated365dFeesLoading: data.lpEarnings === "loading",
    isEstimated365dFeesUnavailable: data.lpEarnings === "unavailable",
  };
}

// Drop-in for useUserEarnings().
export function useRewardsTesterEarnUserEarnings(...args: Parameters<typeof useUserEarnings>) {
  const result = useUserEarnings(...args);
  const { data, positions } = useRewardsTesterEarnLpPositions();

  return useMemo(() => {
    if (!data) return result;

    const state = getRewardsTesterEarnLpEarningsState(data);
    const { byAddress, all } = getRewardsTesterEarnLpEarnings(positions, false);

    return {
      ...result,
      ...state,
      userEarnings:
        state.isLoading || state.isUnavailable ? undefined : { byMarketAddress: byAddress, allMarkets: all },
    };
  }, [data, positions, result]);
}

// Drop-in for useGlvUserEarnings().
export function useRewardsTesterEarnGlvUserEarnings(...args: Parameters<typeof useGlvUserEarnings>) {
  const result = useGlvUserEarnings(...args);
  const { data, positions } = useRewardsTesterEarnLpPositions();

  return useMemo(() => {
    if (!data) return result;

    const state = getRewardsTesterEarnLpEarningsState(data);
    const { byAddress, all } = getRewardsTesterEarnLpEarnings(positions, true);

    return {
      ...result,
      ...state,
      glvUserEarnings: state.isLoading || state.isUnavailable ? undefined : { byGlvAddress: byAddress, allGlvs: all },
    };
  }, [data, positions, result]);
}

// Drop-in for usePerformanceAnnualized(): APY per fake position, or N/A when LP data is down.
export function useRewardsTesterEarnPerformanceAnnualized(...args: Parameters<typeof usePerformanceAnnualized>) {
  const result = usePerformanceAnnualized(...args);
  const { data, positions } = useRewardsTesterEarnLpPositions();
  const period = args[0].period;

  return useMemo(() => {
    if (!data) return result;
    if (data.lpEarnings === "loading") return { ...result, performance: {}, isLoading: true };
    if (data.lpEarnings === "unavailable") return { ...result, performance: {}, isLoading: false };

    const performance = Object.fromEntries(
      positions.map((position, index) => [
        position.address,
        (PRECISION * BigInt((period === "30d" ? 900 : 1_200) + index * 37)) / 10_000n,
      ])
    );

    return { ...result, performance, isLoading: false };
  }, [data, period, positions, result]);
}

function getRewardsTesterEarnTokens(chainId: number) {
  const tokens = getTokens(chainId).filter((token) => !token.isNative && !token.isSynthetic);
  const preferred = ["USDC", "ARB", "WETH", "WAVAX"];
  const picked = preferred
    .map((symbol) => tokens.find((token) => token.symbol === symbol))
    .filter((token): token is (typeof tokens)[number] => Boolean(token));

  return picked.length > 0 ? picked : tokens.slice(0, 2);
}

// Drop-in for useUserIncentiveData(): fake distribution history rows.
export function useRewardsTesterEarnUserIncentiveData(...args: Parameters<typeof useUserIncentiveData>) {
  const [chainId] = args;
  const result = useUserIncentiveData(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(() => {
    if (!data) return result;

    return {
      data: buildRewardsTesterEarnDistributions(data, getRewardsTesterEarnTokens(chainId)),
      error: data.distributionHistory === "partial-error" ? REWARDS_TESTER_EARN_HISTORY_ERROR : undefined,
      isLoading: false,
    };
  }, [chainId, data, result]);
}

// Drop-in for useUserClaimableAmounts(): fake claimable distributions.
export function useRewardsTesterEarnUserClaimableAmounts(...args: Parameters<typeof useUserClaimableAmounts>) {
  const [chainId] = args;
  const result = useUserClaimableAmounts(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(() => {
    if (!data) return result;
    if (!data.account || data.claimables === "none") {
      return {
        ...result,
        claimsConfigByDistributionId: {},
        claimableAmountsDataByDistributionId: REWARDS_TESTER_EARN_EMPTY_CLAIMABLES,
        isLoading: false,
      };
    }

    const tokens = getRewardsTesterEarnTokens(chainId).map(
      (token) => ({ ...token, prices: { minPrice: PRECISION, maxPrice: PRECISION } }) as unknown as TokenData
    );
    const claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId = Object.fromEntries(
      ["1001", "2001"].map((distributionId, index) => {
        const token = tokens[index % tokens.length];
        const usd = BigInt(48 + index * 120) * PRECISION;
        const amount = BigInt(48 + index * 120) * 10n ** BigInt(token.decimals);

        return [
          distributionId,
          {
            amounts: [{ title: index === 0 ? "Trading incentives" : "Competition prize", usd, amount, token }],
            totalUsd: usd,
          },
        ];
      })
    );

    return {
      ...result,
      claimsConfigByDistributionId: {
        "1001": { claimsDisabled: false },
        "2001": { claimsDisabled: false },
      },
      claimableAmountsDataByDistributionId,
      isLoading: false,
    };
  }, [chainId, data, result]);
}

// Drop-in for useTokenBalances() in the claimables panel: controls "Insufficient gas for network fees".
export function useRewardsTesterEarnTokenBalances(...args: Parameters<typeof useTokenBalances>) {
  const result = useTokenBalances(...args);
  const data = useRewardsTesterEarnData();

  return useMemo(() => {
    if (!data) return result;

    return {
      ...result,
      balancesData: data.claimables === "gas-ok" ? { [NATIVE_TOKEN_ADDRESS]: 10n ** 18n } : {},
    };
  }, [data, result]);
}

// Drop-in for useGtBuybackSummary(): GT buyback quota, active request and payouts for the GT card. In tester mode
// requestSale simulates the wallet confirmation and walks the request through its statuses; nothing is signed.
const REWARDS_TESTER_EARN_SIGN_DELAY_MS = 1_500;
const REWARDS_TESTER_EARN_STATUS_STEP_MS = 2_000;

function updateRewardsTesterEarnBuyback(update: (values: RewardsTesterEarnValues) => Partial<RewardsTesterEarnValues>) {
  const earn = getRewardsTesterEarnState();
  setRewardsTesterState({ earn: { ...earn, values: { ...earn.values, ...update(earn.values) } } });
}

function simulateRewardsTesterEarnSale(gtAmount: bigint, shouldReject: boolean) {
  return new Promise<void>((resolve, reject) => {
    window.setTimeout(() => {
      if (shouldReject) {
        reject(new Error("Rewards tester: signature rejected"));
        return;
      }

      updateRewardsTesterEarnBuyback((values) => {
        const quotaUsed = parseValue(values.buybackQuotaUsed, GT_DECIMALS) ?? 0n;

        return {
          buybackRequestGt: formatAmountFree(gtAmount, GT_DECIMALS, GT_DECIMALS),
          buybackRequestStatus: "waitingSignature",
          buybackQuotaUsed: formatAmountFree(quotaUsed + gtAmount, GT_DECIMALS, GT_DECIMALS),
        };
      });
      resolve();

      window.setTimeout(() => {
        updateRewardsTesterEarnBuyback(() => ({ buybackRequestStatus: "submitting" }));
        window.setTimeout(
          () => updateRewardsTesterEarnBuyback(() => ({ buybackRequestStatus: "inBuyback" })),
          REWARDS_TESTER_EARN_STATUS_STEP_MS
        );
      }, REWARDS_TESTER_EARN_STATUS_STEP_MS);
    }, REWARDS_TESTER_EARN_SIGN_DELAY_MS);
  });
}

function simulateRewardsTesterEarnSignature(shouldReject: boolean, message: string) {
  return new Promise<void>((resolve, reject) => {
    window.setTimeout(() => (shouldReject ? reject(new Error(message)) : resolve()), REWARDS_TESTER_EARN_SIGN_DELAY_MS);
  });
}

async function simulateRewardsTesterEarnSolanaWithdraw(usdcAmount: bigint, shouldReject: boolean) {
  await simulateRewardsTesterEarnSignature(shouldReject, "Rewards tester: Solana transaction rejected");

  updateRewardsTesterEarnBuyback((values) => {
    const withdrawable = parseValue(values.buybackWithdrawableUsdc, USDC_DECIMALS) ?? 0n;
    const remaining = withdrawable > usdcAmount ? withdrawable - usdcAmount : 0n;

    return {
      buybackWithdrawableUsdc: formatAmountFree(remaining, USDC_DECIMALS, USDC_DECIMALS),
      ...(remaining === 0n && values.buybackRequestStatus === "paid"
        ? {
            buybackRequestStatus: "withdrawn" as const,
            buybackWithdrawnRequests: [
              values.buybackWithdrawnRequests,
              `${parseValue(values.buybackRequestGt, GT_DECIMALS) ?? 0n}:${Math.floor(Date.now() / 1000)}`,
            ]
              .filter(Boolean)
              .join(","),
          }
        : {}),
    };
  });
}

const REWARDS_TESTER_EARN_CODE_CHECK_DELAY_MS = 600;
const REWARDS_TESTER_EARN_TAKEN_CODES = ["GMX", "TAKEN", "ALPHA"];
const REWARDS_TESTER_EARN_SUGGESTED_CODE = "MYGMXCODE";

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function updateRewardsTesterEarnToggles(update: Partial<RewardsTesterEarnToggles>) {
  const earn = getRewardsTesterEarnState();
  setRewardsTesterState({ earn: { ...earn, toggles: { ...earn.toggles, ...update } } });
}

export function useRewardsTesterEarnGtBuybackSummary(...args: Parameters<typeof useGtBuybackSummary>) {
  const result = useGtBuybackSummary(...args);
  const data = useRewardsTesterEarnData();
  const { earn } = useRewardsTesterState();
  const { gtBuybackSign: signResult, gtBuybackCodeCheck: codeCheck, gtBuybackSolana: solanaWallet } = earn.toggles;
  const requestSale = useCallback(
    (gtAmount: bigint) => simulateRewardsTesterEarnSale(gtAmount, signResult === "reject"),
    [signResult]
  );
  const signWithdraw = useCallback(
    // Placeholder signature step; the Solana address is not used.
    () => simulateRewardsTesterEarnSignature(signResult === "reject-evm", "Rewards tester: EVM signature rejected"),
    [signResult]
  );
  const approveSolanaWithdraw = useCallback(
    (usdcAmount: bigint) => simulateRewardsTesterEarnSolanaWithdraw(usdcAmount, signResult === "reject-solana"),
    [signResult]
  );
  const isReferralCodeTaken = useCallback(
    async (code: string) => {
      await wait(REWARDS_TESTER_EARN_CODE_CHECK_DELAY_MS);

      return codeCheck === "taken" || REWARDS_TESTER_EARN_TAKEN_CODES.includes(code.trim().toUpperCase());
    },
    [codeCheck]
  );
  const signSetReferralCode = useCallback(
    () =>
      simulateRewardsTesterEarnSignature(
        signResult === "reject-ref-evm",
        "Rewards tester: referral code signature rejected"
      ),
    [signResult]
  );
  const connectSolanaWallet = useCallback(async () => {
    await simulateRewardsTesterEarnSignature(solanaWallet === "refuse", "Rewards tester: Solana wallet refused");
    updateRewardsTesterEarnToggles({ gtBuybackSolana: "connected" });
  }, [solanaWallet]);
  const approveSolanaSetReferralCode = useCallback(
    async (code: string) => {
      if (signResult === "insufficient-sol") {
        await wait(REWARDS_TESTER_EARN_SIGN_DELAY_MS);
        throw new Error("insufficient-sol");
      }

      await simulateRewardsTesterEarnSignature(
        signResult === "reject-ref-solana",
        "Rewards tester: referral code Solana transaction rejected"
      );
      updateRewardsTesterEarnBuyback(() => ({ buybackReferralCode: code }));
    },
    [signResult]
  );

  return useMemo(() => {
    if (!data) return result;
    if (!data.gtBuyback) return { data: undefined, isLoading: false };

    const hasData = Boolean(data.gtBuyback.data);
    const withData = <T>(value: T) => (hasData ? value : undefined);

    return {
      ...data.gtBuyback,
      requestSale: withData(requestSale),
      signWithdraw: withData(signWithdraw),
      approveSolanaWithdraw: withData(approveSolanaWithdraw),
      suggestedReferralCode: withData(
        earn.toggles.gtBuybackExistingCode === "has" ? REWARDS_TESTER_EARN_SUGGESTED_CODE : undefined
      ),
      isReferralCodeTaken: withData(isReferralCodeTaken),
      signSetReferralCode: withData(signSetReferralCode),
      isSolanaWalletConnected: withData(solanaWallet === "connected"),
      connectSolanaWallet: withData(connectSolanaWallet),
      approveSolanaSetReferralCode: withData(approveSolanaSetReferralCode),
    };
  }, [
    approveSolanaSetReferralCode,
    approveSolanaWithdraw,
    connectSolanaWallet,
    data,
    earn.toggles.gtBuybackExistingCode,
    isReferralCodeTaken,
    requestSale,
    result,
    signSetReferralCode,
    signWithdraw,
    solanaWallet,
  ]);
}
