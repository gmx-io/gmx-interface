import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { isDevelopment } from "config/env";
import { REWARDS_ONBOARDING_DISMISSED_KEY, REWARDS_PAGE_BANNERS_DISMISSED_KEY } from "config/localStorage";
import { useGmxPrice } from "domain/legacy";
import type { IncentivesAvailability } from "domain/synthetics/incentives/v2/availability";
import { useAccountRewardsHistory } from "domain/synthetics/incentives/v2/useAccountRewardsHistory";
import { useIncentivesLeaderboard } from "domain/synthetics/incentives/v2/useIncentivesLeaderboard";
import { useIncentivesLeaderboardSearch } from "domain/synthetics/incentives/v2/useIncentivesLeaderboardSearch";
import { useLatestGtPrice } from "domain/synthetics/incentives/v2/useLatestGtPrice";
import { useRewardsPromoActivity } from "domain/synthetics/incentives/v2/useRewardsPromoActivity";
import {
  useRewardsVestingData,
  type RewardsVestingData,
  type RewardsVestingDataResult,
} from "domain/vesting/useRewardsVestingData";
import { useLocalStorageSerializeKeySafe } from "lib/localStorage";
import { useIsWalletInitializing } from "lib/wallets/useIsWalletInitializing";
import useWallet from "lib/wallets/useWallet";

import type { RewardsVestingDebugSnapshot } from "../rewardsVestingDebug";
import { useRewardsPageData } from "../useRewardsPageData";
import {
  buildRewardsTesterData,
  getRewardsTesterHistoryPage,
  getRewardsTesterLeaderboardPage,
  getRewardsTesterScenarioValues,
  getRewardsTesterVestingResult,
  REWARDS_TESTER_ALL_BANNERS_DISMISSED,
  REWARDS_TESTER_BASE_VALUES,
  REWARDS_TESTER_DEFAULT_TOGGLES,
  REWARDS_TESTER_LIVE_SCENARIO_ID,
  type RewardsTesterData,
  type RewardsTesterToggles,
  type RewardsTesterValues,
} from "./rewardsTesterFixtures";
import {
  buildRewardsTesterEarnData,
  REWARDS_TESTER_EARN_BASE_VALUES,
  REWARDS_TESTER_EARN_DEFAULT_TOGGLES,
  type RewardsTesterEarnToggles,
  type RewardsTesterEarnValues,
} from "./rewardsTesterEarnFixtures";

// Local-only Rewards tester. In development a floating "Tester" button lets you swap the page's data for
// fixtures. Until a scenario is picked (scenario "live") every drop-in hook below returns the live value
// untouched, and outside development the tester never activates, so production behaviour does not change.
export const REWARDS_TESTER_SEARCH_PARAM = "rewardsTester";

const REWARDS_TESTER_DEBUG_SEARCH_PARAM = "rewardsDebug";
const REWARDS_TESTER_STORAGE_KEY = "rewards-tester-state-v2";
const REWARDS_TESTER_DEFAULT_SCENARIO_ID = "typical";

// ?rewardsDebug=<mode> shortcuts that preselect a tester scenario.
const REWARDS_TESTER_URL_SHORTCUTS: Record<string, string> = {
  "connected-empty": "zero",
  "connected-progress": "typical",
};

const REWARDS_TESTER_PROGRAM_ERROR = new Error("Rewards tester: incentives service unavailable");
const REWARDS_TESTER_LEADERBOARD_ERROR = new Error("Rewards tester: leaderboard unavailable");
const REWARDS_TESTER_HISTORY_ERROR = new Error("Rewards tester: rewards history unavailable");
const REWARDS_TESTER_NO_BANNERS_DISMISSED = {};

export const REWARDS_TESTER_CONTEXT_OPTIONS = [
  { value: "rewards", label: "Rewards" },
  { value: "earn", label: "Earn" },
] as const;

export type RewardsTesterContextId = (typeof REWARDS_TESTER_CONTEXT_OPTIONS)[number]["value"];

export type RewardsTesterEarnState = {
  scenarioId: string;
  values: RewardsTesterEarnValues;
  toggles: RewardsTesterEarnToggles;
};

// The top-level scenario, values and toggles belong to the Rewards context; each other context keeps its own.
export type RewardsTesterState = {
  context: RewardsTesterContextId;
  scenarioId: string;
  values: RewardsTesterValues;
  toggles: RewardsTesterToggles;
  earn: RewardsTesterEarnState;
  isCollapsed: boolean;
};

const REWARDS_TESTER_EARN_DEFAULT_STATE: RewardsTesterEarnState = {
  scenarioId: REWARDS_TESTER_LIVE_SCENARIO_ID,
  values: REWARDS_TESTER_EARN_BASE_VALUES,
  toggles: REWARDS_TESTER_EARN_DEFAULT_TOGGLES,
};

function readRewardsTesterEarnState(stored: Partial<RewardsTesterEarnState> | undefined): RewardsTesterEarnState {
  if (!stored) return REWARDS_TESTER_EARN_DEFAULT_STATE;

  const values = { ...REWARDS_TESTER_EARN_BASE_VALUES, ...stored.values };
  const toggles = { ...REWARDS_TESTER_EARN_DEFAULT_TOGGLES, ...stored.toggles };

  if (!buildRewardsTesterEarnData(values, toggles)) return REWARDS_TESTER_EARN_DEFAULT_STATE;

  return {
    scenarioId: typeof stored.scenarioId === "string" ? stored.scenarioId : REWARDS_TESTER_LIVE_SCENARIO_ID,
    values,
    toggles,
  };
}

const REWARDS_TESTER_DEFAULT_STATE: RewardsTesterState = {
  context: "rewards",
  scenarioId: REWARDS_TESTER_LIVE_SCENARIO_ID,
  values: getRewardsTesterScenarioValues(REWARDS_TESTER_DEFAULT_SCENARIO_ID) ?? REWARDS_TESTER_BASE_VALUES,
  toggles: REWARDS_TESTER_DEFAULT_TOGGLES,
  earn: REWARDS_TESTER_EARN_DEFAULT_STATE,
  isCollapsed: true,
};

const rewardsTesterListeners = new Set<() => void>();
const rewardsTesterDataCache = new WeakMap<
  RewardsTesterValues,
  WeakMap<RewardsTesterToggles, RewardsTesterData | undefined>
>();
let rewardsTesterState: RewardsTesterState | undefined;

function persistRewardsTesterState(state: RewardsTesterState) {
  try {
    window.localStorage.setItem(REWARDS_TESTER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be blocked; the tester still works for this session.
  }
}

// Applies ?rewardsTester=1 and the ?rewardsDebug=connected-* shortcuts on top of the stored state.
function applyRewardsTesterUrl(state: RewardsTesterState, search: string): RewardsTesterState {
  const searchParams = new URLSearchParams(search);
  const shortcutScenarioId = REWARDS_TESTER_URL_SHORTCUTS[searchParams.get(REWARDS_TESTER_DEBUG_SEARCH_PARAM) ?? ""];

  if (shortcutScenarioId && state.scenarioId !== shortcutScenarioId) {
    const values = getRewardsTesterScenarioValues(shortcutScenarioId);

    return values ? { ...state, scenarioId: shortcutScenarioId, values } : state;
  }

  if (searchParams.get(REWARDS_TESTER_SEARCH_PARAM) === "1") {
    if (state.scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID) {
      return {
        ...state,
        context: "rewards",
        scenarioId: REWARDS_TESTER_DEFAULT_SCENARIO_ID,
        values: REWARDS_TESTER_DEFAULT_STATE.values,
        isCollapsed: false,
      };
    }

    if (state.isCollapsed) return { ...state, isCollapsed: false };
  }

  return state;
}

function readRewardsTesterStoredState(): RewardsTesterState {
  if (typeof window === "undefined" || !isDevelopment()) return REWARDS_TESTER_DEFAULT_STATE;

  let state = REWARDS_TESTER_DEFAULT_STATE;

  try {
    const storedValue = window.localStorage.getItem(REWARDS_TESTER_STORAGE_KEY);
    const stored = storedValue ? (JSON.parse(storedValue) as Partial<RewardsTesterState>) : undefined;

    if (stored) {
      const values = { ...REWARDS_TESTER_BASE_VALUES, ...stored.values };
      const toggles = { ...REWARDS_TESTER_DEFAULT_TOGGLES, ...stored.toggles };

      const isValidRewardsState = Boolean(buildRewardsTesterData(values, toggles));

      state = {
        context: REWARDS_TESTER_CONTEXT_OPTIONS.some((option) => option.value === stored.context)
          ? (stored.context as RewardsTesterContextId)
          : REWARDS_TESTER_DEFAULT_STATE.context,
        scenarioId:
          isValidRewardsState && typeof stored.scenarioId === "string"
            ? stored.scenarioId
            : REWARDS_TESTER_LIVE_SCENARIO_ID,
        values: isValidRewardsState ? values : REWARDS_TESTER_DEFAULT_STATE.values,
        toggles: isValidRewardsState ? toggles : REWARDS_TESTER_DEFAULT_STATE.toggles,
        earn: readRewardsTesterEarnState(stored.earn),
        isCollapsed: stored.isCollapsed !== false,
      };
    }
  } catch {
    state = REWARDS_TESTER_DEFAULT_STATE;
  }

  const urlState = applyRewardsTesterUrl(state, window.location.search);

  if (urlState !== state) {
    persistRewardsTesterState(urlState);
  }

  return urlState;
}

function getRewardsTesterState() {
  if (!rewardsTesterState) {
    rewardsTesterState = readRewardsTesterStoredState();
  }

  return rewardsTesterState;
}

function subscribeRewardsTester(listener: () => void) {
  rewardsTesterListeners.add(listener);

  return () => {
    rewardsTesterListeners.delete(listener);
  };
}

function notifyRewardsTesterListeners() {
  rewardsTesterListeners.forEach((listener) => listener());
}

export function setRewardsTesterState(update: Partial<RewardsTesterState>) {
  if (!isDevelopment()) return;

  rewardsTesterState = { ...getRewardsTesterState(), ...update };
  persistRewardsTesterState(rewardsTesterState);
  notifyRewardsTesterListeners();
}

export function syncRewardsTesterStateWithUrl(search: string) {
  if (!isDevelopment()) return;

  const state = getRewardsTesterState();
  const nextState = applyRewardsTesterUrl(state, search);

  if (nextState !== state) {
    setRewardsTesterState(nextState);
  }
}

export function resetRewardsTesterState() {
  if (!isDevelopment()) return;

  const { context, earn, isCollapsed } = getRewardsTesterState();
  rewardsTesterState = { ...REWARDS_TESTER_DEFAULT_STATE, context, earn, isCollapsed };
  persistRewardsTesterState(rewardsTesterState);
  notifyRewardsTesterListeners();
}

export function resetRewardsTesterEarnState() {
  setRewardsTesterState({ earn: REWARDS_TESTER_EARN_DEFAULT_STATE });
}

export function getRewardsTesterEarnState() {
  return getRewardsTesterState().earn;
}

export function getRewardsTesterContext() {
  return getRewardsTesterState().context;
}

export function useRewardsTesterState() {
  return useSyncExternalStore(subscribeRewardsTester, getRewardsTesterState);
}

export function isRewardsTesterAvailable() {
  return typeof window !== "undefined" && isDevelopment();
}

function getRewardsTesterCachedData(values: RewardsTesterValues, toggles: RewardsTesterToggles) {
  let valuesCache = rewardsTesterDataCache.get(values);

  if (!valuesCache) {
    valuesCache = new WeakMap();
    rewardsTesterDataCache.set(values, valuesCache);
  }

  if (!valuesCache.has(toggles)) {
    valuesCache.set(toggles, buildRewardsTesterData(values, toggles));
  }

  return valuesCache.get(toggles);
}

export function useRewardsTesterData(): RewardsTesterData | undefined {
  const state = useRewardsTesterState();

  if (!isRewardsTesterAvailable() || state.scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID) return undefined;

  return getRewardsTesterCachedData(state.values, state.toggles);
}

type RewardsTesterVestingEdit = {
  source: RewardsTesterData;
  snapshot: RewardsVestingDebugSnapshot;
  result: Omit<RewardsVestingDataResult, "mutate">;
};

// Page-session state that is not persisted: where the Tester window renders the vesting simulator, how many
// simulators are mounted, and the vesting values edited in the simulator for the current scenario.
type RewardsTesterRuntime = {
  vestingSlot: HTMLElement | null;
  vestingSimulatorCount: number;
  vestingEdit?: RewardsTesterVestingEdit;
};

const rewardsTesterRuntimeListeners = new Set<() => void>();
let rewardsTesterRuntime: RewardsTesterRuntime = { vestingSlot: null, vestingSimulatorCount: 0 };

function updateRewardsTesterRuntime(update: Partial<RewardsTesterRuntime>) {
  rewardsTesterRuntime = { ...rewardsTesterRuntime, ...update };
  rewardsTesterRuntimeListeners.forEach((listener) => listener());
}

function subscribeRewardsTesterRuntime(listener: () => void) {
  rewardsTesterRuntimeListeners.add(listener);

  return () => {
    rewardsTesterRuntimeListeners.delete(listener);
  };
}

function getRewardsTesterRuntime() {
  return rewardsTesterRuntime;
}

export function useRewardsTesterRuntime() {
  return useSyncExternalStore(subscribeRewardsTesterRuntime, getRewardsTesterRuntime);
}

export function setRewardsTesterVestingSlot(element: HTMLElement | null) {
  if (rewardsTesterRuntime.vestingSlot !== element) {
    updateRewardsTesterRuntime({ vestingSlot: element });
  }
}

export function registerRewardsTesterVestingSimulator() {
  updateRewardsTesterRuntime({ vestingSimulatorCount: rewardsTesterRuntime.vestingSimulatorCount + 1 });

  return () => {
    updateRewardsTesterRuntime({ vestingSimulatorCount: Math.max(rewardsTesterRuntime.vestingSimulatorCount - 1, 0) });
  };
}

function getRewardsTesterVestingEdit(data: RewardsTesterData | undefined, runtime: RewardsTesterRuntime) {
  return data && runtime.vestingEdit?.source === data ? runtime.vestingEdit : undefined;
}

// Drop-in for useWallet(): swaps in the fake account (or none) and never exposes a signer.
export function useRewardsTesterWallet() {
  const wallet = useWallet();
  const data = useRewardsTesterData();

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
export function useRewardsTesterIsWalletInitializing() {
  const isWalletInitializing = useIsWalletInitializing();
  const data = useRewardsTesterData();

  return data ? data.isWalletInitializing : isWalletInitializing;
}

function getRewardsTesterAvailability(data: RewardsTesterData): IncentivesAvailability {
  switch (data.program) {
    case "loading":
      return { status: "loading" };
    case "error":
      return { status: "error", error: REWARDS_TESTER_PROGRAM_ERROR };
    case "inactive":
      return { status: "inactive" };
    case "unsupported-chain":
      return { status: "unsupported-chain" };
    default:
      return { status: "active", config: data.config, isStale: data.program === "stale" };
  }
}

// Drop-in for useRewardsPageData(): replaces availability, config, account status and all-time summary.
export function useRewardsTesterPageData(params: Parameters<typeof useRewardsPageData>[0]) {
  const data = useRewardsTesterData();
  const pageData = useRewardsPageData(data ? { ...params, account: undefined } : params);
  const { loadTierAccountData, loadAllTimeSummary = loadTierAccountData } = params;

  return useMemo(() => {
    if (!data || pageData.availability.status === "unsupported-chain") return pageData;

    const availability = getRewardsTesterAvailability(data);
    const config = availability.status === "active" ? availability.config : undefined;
    const hasAccountData = Boolean(data.account && config);
    const loadsStatus = hasAccountData && loadTierAccountData;
    const loadsSummary = hasAccountData && loadAllTimeSummary;
    const isConnected = data.connection === "connected";
    const isLoading = data.connection === "loading";
    const hasEpochMismatch = isConnected && data.accountWarning === "epoch-mismatch";

    return {
      ...pageData,
      availability,
      config,
      canLoadAllTimeLeaderboard: data.program !== "unsupported-chain",
      accountStatus: loadsStatus && isConnected && !hasEpochMismatch ? data.accountStatus : undefined,
      allTimeSummary: loadsSummary && isConnected ? data.allTimeEntry : undefined,
      allTimeSummaryLoaded: loadsSummary && isConnected,
      isMixedEpoch: loadsStatus && hasEpochMismatch,
      isMixedEpochPersistent: loadsStatus && hasEpochMismatch,
      accountStatusError: loadsStatus ? data.error : undefined,
      allTimeSummaryError: loadsSummary ? data.error : undefined,
      accountStatusLoading: loadsStatus && isLoading,
      allTimeSummaryLoading: loadsSummary && isLoading,
      accountStatusValidating: false,
      allTimeSummaryValidating: false,
    };
  }, [data, loadAllTimeSummary, loadTierAccountData, pageData]);
}

// Drop-in for useRewardsVestingData().
export function useRewardsTesterRewardsVestingData(
  ...args: Parameters<typeof useRewardsVestingData>
): RewardsVestingDataResult {
  const [account, chainId] = args;
  const data = useRewardsTesterData();
  const vestingEdit = getRewardsTesterVestingEdit(data, useRewardsTesterRuntime());
  const result = useRewardsVestingData(data ? undefined : account, chainId);

  return useMemo(() => {
    if (!data?.account || !data.vestingResult) return result;

    return { ...(vestingEdit?.result ?? data.vestingResult), mutate: result.mutate };
  }, [data, result, vestingEdit]);
}

// Drop-in for useLatestGtPrice().
export function useRewardsTesterLatestGtPrice(...args: Parameters<typeof useLatestGtPrice>) {
  const [chainId, params = {}] = args;
  const data = useRewardsTesterData();
  const result = useLatestGtPrice(chainId, data ? { ...params, enabled: false } : params);

  return useMemo(
    () => (data ? { ...result, data: data.gtPrice, error: undefined, loading: false, isValidating: false } : result),
    [data, result]
  );
}

// Drop-in for useGmxPrice().
export function useRewardsTesterGmxPrice(...args: Parameters<typeof useGmxPrice>) {
  const [chainId, libraries, active, options = {}] = args;
  const data = useRewardsTesterData();
  const result = useGmxPrice(chainId, libraries, active, data ? { ...options, enabled: false } : options);

  return useMemo(() => (data ? { ...result, gmxPrice: data.gmxPrice } : result), [data, result]);
}

// Drop-in for useRewardsPromoActivity().
export function useRewardsTesterPromoActivity(...args: Parameters<typeof useRewardsPromoActivity>) {
  const [chainId, params] = args;
  const data = useRewardsTesterData();
  const result = useRewardsPromoActivity(chainId, data ? { ...params, enabled: false } : params);
  const enabled = params.enabled ?? true;

  return useMemo(() => {
    if (!data) return result;
    if (!enabled || !data.account) return { ...result, data: undefined, error: undefined, loading: false };

    return {
      ...result,
      data: data.promoActivity,
      error: undefined,
      loading: data.connection === "loading",
    };
  }, [data, enabled, result]);
}

type RewardsTesterLeaderboardResult = ReturnType<typeof useIncentivesLeaderboard>;

function getRewardsTesterLeaderboardState(
  result: RewardsTesterLeaderboardResult,
  state: { loading?: boolean; error?: Error }
): RewardsTesterLeaderboardResult {
  return {
    ...result,
    data: undefined,
    totalCount: undefined,
    hasNextPage: false,
    error: state.error,
    loading: Boolean(state.loading),
    isValidating: false,
  };
}

function getRewardsTesterLeaderboardResult(
  data: RewardsTesterData,
  result: RewardsTesterLeaderboardResult,
  params: {
    enabled: boolean;
    account?: string;
    accountContains?: string;
    orderBy?: string;
    limit: number;
    offset: number;
  }
): RewardsTesterLeaderboardResult {
  if (!params.enabled) return getRewardsTesterLeaderboardState(result, {});

  const isYourRow = Boolean(
    params.account && data.account && params.account.toLowerCase() === data.account.toLowerCase()
  );

  if (isYourRow) {
    if (data.connection === "loading") return getRewardsTesterLeaderboardState(result, { loading: true });
    if (data.connection === "unavailable" || data.leaderboardRow === "error") {
      return getRewardsTesterLeaderboardState(result, { error: REWARDS_TESTER_LEADERBOARD_ERROR });
    }
  } else {
    if (data.leaderboardTable === "loading") return getRewardsTesterLeaderboardState(result, { loading: true });
    if (data.leaderboardTable === "error") {
      return getRewardsTesterLeaderboardState(result, { error: REWARDS_TESTER_LEADERBOARD_ERROR });
    }
  }

  const page = getRewardsTesterLeaderboardPage(data, params);

  return {
    ...result,
    data: page.entries,
    totalCount: page.totalCount,
    hasNextPage: page.hasNextPage,
    error: undefined,
    loading: false,
    isValidating: false,
  };
}

// Drop-in for useIncentivesLeaderboard(): fake rows with placeholder addresses, plus your own row.
export function useRewardsTesterIncentivesLeaderboard(...args: Parameters<typeof useIncentivesLeaderboard>) {
  const [chainId, params] = args;
  const data = useRewardsTesterData();
  const result = useIncentivesLeaderboard(chainId, data ? { ...params, enabled: false } : params);
  const enabled = params.enabled ?? true;
  const account = params.where?.account;
  const accountContains = params.where?.account_contains;
  const { orderBy, limit, offset } = params;

  return useMemo(
    () =>
      data
        ? getRewardsTesterLeaderboardResult(data, result, { enabled, account, accountContains, orderBy, limit, offset })
        : result,
    [account, accountContains, data, enabled, limit, offset, orderBy, result]
  );
}

// Drop-in for useIncentivesLeaderboardSearch().
export function useRewardsTesterIncentivesLeaderboardSearch(
  ...args: Parameters<typeof useIncentivesLeaderboardSearch>
) {
  const [chainId, params] = args;
  const data = useRewardsTesterData();
  const result = useIncentivesLeaderboardSearch(chainId, data ? { ...params, enabled: false } : params);
  const term = params.term.trim();
  const enabled = (params.enabled ?? true) && term.length > 0;
  const { orderBy, limit, offset } = params;

  return useMemo(
    () =>
      data
        ? getRewardsTesterLeaderboardResult(data, result, { enabled, accountContains: term, orderBy, limit, offset })
        : result,
    [data, enabled, limit, offset, orderBy, result, term]
  );
}

// Drop-in for useAccountRewardsHistory(): fake epochs for the tester account.
export function useRewardsTesterAccountRewardsHistory(...args: Parameters<typeof useAccountRewardsHistory>) {
  const [chainId, params] = args;
  const data = useRewardsTesterData();
  const result = useAccountRewardsHistory(chainId, data ? { ...params, enabled: false } : params);
  const enabled = (params.enabled ?? true) && Boolean(params.account);
  const { currentEpoch, programStartTimestamp, epochDuration, limit, offset } = params;

  return useMemo(() => {
    if (!data) return result;

    const emptyResult = { ...result, data: undefined, totalCount: undefined, hasNextPage: false, isValidating: false };

    if (!enabled) return { ...emptyResult, error: undefined, loading: false };
    if (data.connection === "loading" || data.history === "loading") {
      return { ...emptyResult, error: undefined, loading: true };
    }
    if (data.connection === "unavailable" || data.history === "first-load-error") {
      return { ...emptyResult, error: REWARDS_TESTER_HISTORY_ERROR, loading: false };
    }

    const page = getRewardsTesterHistoryPage(data, {
      currentEpoch,
      programStartTimestamp,
      epochDuration,
      limit,
      offset,
    });

    return {
      ...result,
      data: page.entries,
      totalCount: page.totalCount,
      hasNextPage: page.hasNextPage,
      error: data.history === "refresh-error" ? REWARDS_TESTER_HISTORY_ERROR : undefined,
      loading: false,
      isValidating: false,
    };
  }, [currentEpoch, data, enabled, epochDuration, limit, offset, programStartTimestamp, result]);
}

// Drop-in for useLocalStorageSerializeKeySafe(): only overrides the onboarding and promo-banner dismissals.
export function useRewardsTesterLocalStorageSerializeKeySafe<
  T extends string | number | boolean | null | undefined | Record<string, any>,
>(key: Parameters<typeof useLocalStorageSerializeKeySafe>[0], initialValue: T) {
  const data = useRewardsTesterData();
  const [value, setValue] = useLocalStorageSerializeKeySafe<T>(key, initialValue);

  if (data && key === REWARDS_ONBOARDING_DISMISSED_KEY && data.suppressOnboarding) {
    return [true as T, setValue] as const;
  }

  if (data && Array.isArray(key) && key[0] === REWARDS_PAGE_BANNERS_DISMISSED_KEY && data.banners !== "live") {
    const dismissed =
      data.banners === "all-dismissed" ? REWARDS_TESTER_ALL_BANNERS_DISMISSED : REWARDS_TESTER_NO_BANNERS_DISMISSED;

    return [dismissed as T, setValue] as const;
  }

  return [value, setValue] as const;
}

// Hook-in for the vesting card fixture: the tester scenario (plus any simulator edits) replaces the
// ?rewardsDebug vesting fixture.
export function useRewardsTesterVestingSnapshot(
  snapshot: RewardsVestingDebugSnapshot | undefined
): RewardsVestingDebugSnapshot | undefined {
  const data = useRewardsTesterData();
  const vestingEdit = getRewardsTesterVestingEdit(data, useRewardsTesterRuntime());

  if (!data) return snapshot;
  if (!data.account) return undefined;

  return vestingEdit?.snapshot ?? data.vestingSnapshot;
}

// Hook-in that pushes new tester values into the vesting card's simulator state, and shares the simulator's
// edits with the rest of the page (summary row, tier cards) for the current scenario.
export function useRewardsTesterVestingSync(
  debugData: RewardsVestingData | undefined,
  setDebugData: (data: RewardsVestingData | undefined) => void
) {
  const data = useRewardsTesterData();
  const runtime = useRewardsTesterRuntime();
  const vestingEdit = getRewardsTesterVestingEdit(data, runtime);
  const syncedSnapshotRef = useRef<RewardsVestingDebugSnapshot>();

  useEffect(() => {
    if (!data) {
      syncedSnapshotRef.current = undefined;
      return;
    }

    const baseSnapshot = data.account ? data.vestingSnapshot : undefined;
    const baseData = baseSnapshot?.data;

    if (debugData === undefined && baseData !== undefined) {
      // The simulator's Reset clears its data; fall back to the scenario's vesting values.
      syncedSnapshotRef.current = baseSnapshot;
      if (vestingEdit) updateRewardsTesterRuntime({ vestingEdit: undefined });
      setDebugData(baseData);
      return;
    }

    if (syncedSnapshotRef.current !== baseSnapshot) {
      syncedSnapshotRef.current = baseSnapshot;
      setDebugData(vestingEdit?.snapshot.data ?? baseData);
      return;
    }

    if (debugData === baseData) {
      if (vestingEdit) updateRewardsTesterRuntime({ vestingEdit: undefined });
      return;
    }

    if (debugData && debugData !== vestingEdit?.snapshot.data) {
      updateRewardsTesterRuntime({
        vestingEdit: {
          source: data,
          snapshot: { data: debugData, isLoading: false },
          result: getRewardsTesterVestingResult(debugData),
        },
      });
    }
  }, [data, debugData, setDebugData, vestingEdit]);
}
