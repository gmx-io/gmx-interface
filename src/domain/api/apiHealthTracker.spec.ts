import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContractsChainId } from "sdk/configs/chains";

import { ApiHealthTracker } from "./apiHealthTracker";

const CONFIRMATION_MS = 3_000;
const COOLDOWN_MS = 15_000;

const tracker = ApiHealthTracker.getInstance();

// Reports stale at startAt and again once the confirmation window has elapsed.
function makeUnhealthy(chainId: ContractsChainId, startAt = 0) {
  vi.setSystemTime(startAt);
  tracker.reportMarketsFreshness(chainId, true);
  vi.setSystemTime(startAt + CONFIRMATION_MS);
  tracker.reportMarketsFreshness(chainId, true);
}

// Each test uses a distinct chainId so the shared singleton's per-chain state stays isolated.
describe("ApiHealthTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is a singleton", () => {
    expect(ApiHealthTracker.getInstance()).toBe(tracker);
  });

  it("defaults to healthy for an unseen chain", () => {
    expect(tracker.isHealthy(111 as ContractsChainId)).toBe(true);
  });

  it("stays healthy on a brief stale blip", () => {
    const chainId = 222 as ContractsChainId;
    tracker.reportMarketsFreshness(chainId, true);
    expect(tracker.isHealthy(chainId)).toBe(true);

    vi.setSystemTime(1_000);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(true);
  });

  it("goes unhealthy once staleness persists for the confirmation window", () => {
    const chainId = 232 as ContractsChainId;
    tracker.reportMarketsFreshness(chainId, true);
    vi.setSystemTime(CONFIRMATION_MS - 1);
    tracker.reportMarketsFreshness(chainId, true);
    expect(tracker.isHealthy(chainId)).toBe(true);

    vi.setSystemTime(CONFIRMATION_MS);
    tracker.reportMarketsFreshness(chainId, true);
    expect(tracker.isHealthy(chainId)).toBe(false);
  });

  it("resets the confirmation window when freshness returns before it elapses", () => {
    const chainId = 242 as ContractsChainId;
    tracker.reportMarketsFreshness(chainId, true);
    vi.setSystemTime(1_000);
    tracker.reportMarketsFreshness(chainId, false);

    vi.setSystemTime(2_000);
    tracker.reportMarketsFreshness(chainId, true);
    vi.setSystemTime(4_000);
    tracker.reportMarketsFreshness(chainId, true);
    expect(tracker.isHealthy(chainId)).toBe(true);

    vi.setSystemTime(2_000 + CONFIRMATION_MS);
    tracker.reportMarketsFreshness(chainId, true);
    expect(tracker.isHealthy(chainId)).toBe(false);
  });

  it("stays unhealthy while fresh but within the restore cooldown", () => {
    const chainId = 333 as ContractsChainId;
    makeUnhealthy(chainId);
    vi.setSystemTime(CONFIRMATION_MS + COOLDOWN_MS - 1);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(false);
  });

  it("restores once freshness holds continuously for the cooldown", () => {
    const chainId = 444 as ContractsChainId;
    makeUnhealthy(chainId);
    vi.setSystemTime(CONFIRMATION_MS + COOLDOWN_MS);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(true);
  });

  it("resets the cooldown when staleness recurs during recovery", () => {
    const chainId = 555 as ContractsChainId;
    makeUnhealthy(chainId);
    vi.setSystemTime(10_000);
    tracker.reportMarketsFreshness(chainId, false);
    vi.setSystemTime(12_000);
    tracker.reportMarketsFreshness(chainId, true);
    vi.setSystemTime(20_000);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(false);

    vi.setSystemTime(12_000 + COOLDOWN_MS);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(true);
  });

  it("isolates health per chain", () => {
    const chainA = 666 as ContractsChainId;
    const chainB = 777 as ContractsChainId;
    makeUnhealthy(chainA);
    expect(tracker.isHealthy(chainA)).toBe(false);
    expect(tracker.isHealthy(chainB)).toBe(true);
  });

  it("notifies subscribers only on actual health flips", () => {
    const chainId = 888 as ContractsChainId;
    const listener = vi.fn();
    const unsubscribe = tracker.subscribe(listener);

    tracker.reportMarketsFreshness(chainId, true);
    expect(listener).toHaveBeenCalledTimes(0);

    vi.setSystemTime(CONFIRMATION_MS);
    tracker.reportMarketsFreshness(chainId, true);
    expect(listener).toHaveBeenCalledTimes(1);

    vi.setSystemTime(CONFIRMATION_MS + 1_000);
    tracker.reportMarketsFreshness(chainId, true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    vi.setSystemTime(CONFIRMATION_MS + 1_000 + COOLDOWN_MS);
    tracker.reportMarketsFreshness(chainId, false);
    expect(tracker.isHealthy(chainId)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
