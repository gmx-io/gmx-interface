import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useMulticall } from "lib/multicall";

import { useProDiscountFactorRequest } from "../useProDiscountFactor";

vi.mock("lib/multicall", () => ({ useMulticall: vi.fn() }));

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const PRO_TIER = 2n;
const PRO_DISCOUNT_FACTOR = 10n ** 29n;

type MulticallState = { data?: bigint; error?: Error };

const PENDING: MulticallState = {};
const FAILED: MulticallState = { error: new Error("rpc down") };

function mockMulticall(tier: MulticallState, discount: MulticallState = PENDING) {
  vi.mocked(useMulticall).mockImplementation(((_chainId: unknown, name: string) => {
    const state = name === "useProTraderTier" ? tier : discount;

    return { data: state.data, error: state.error, isLoading: false, mutate: vi.fn() };
  }) as unknown as typeof useMulticall);
}

function Probe({ account, resultRef }: { account: string | undefined; resultRef: { current?: bigint } }) {
  resultRef.current = useProDiscountFactorRequest(ARBITRUM, account);

  return null;
}

function readProDiscountFactor(account: string | undefined): bigint | undefined {
  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
  const resultRef: { current?: bigint } = {};

  render(<Probe account={account} resultRef={resultRef} />);

  return resultRef.current;
}

describe("useProDiscountFactorRequest", () => {
  afterEach(() => {
    cleanup();
    vi.mocked(useMulticall).mockReset();
  });

  it("is unknown without an account", () => {
    mockMulticall({ data: PRO_TIER }, { data: PRO_DISCOUNT_FACTOR });

    expect(readProDiscountFactor(undefined)).toBeUndefined();
  });

  it("stays unknown while the tier is loading", () => {
    mockMulticall(PENDING);

    expect(readProDiscountFactor(ACCOUNT)).toBeUndefined();
  });

  it("falls back to no discount when the tier read fails", () => {
    mockMulticall(FAILED);

    expect(readProDiscountFactor(ACCOUNT)).toBe(0n);
  });

  it("has no discount for an account outside the pro tiers", () => {
    mockMulticall({ data: 0n });

    expect(readProDiscountFactor(ACCOUNT)).toBe(0n);
  });

  it("stays unknown while the tier's discount is loading", () => {
    mockMulticall({ data: PRO_TIER }, PENDING);

    expect(readProDiscountFactor(ACCOUNT)).toBeUndefined();
  });

  it("falls back to no discount when the discount read fails", () => {
    mockMulticall({ data: PRO_TIER }, FAILED);

    expect(readProDiscountFactor(ACCOUNT)).toBe(0n);
  });

  it("returns the discount of the account's tier", () => {
    mockMulticall({ data: PRO_TIER }, { data: PRO_DISCOUNT_FACTOR });

    expect(readProDiscountFactor(ACCOUNT)).toBe(PRO_DISCOUNT_FACTOR);
  });
});
