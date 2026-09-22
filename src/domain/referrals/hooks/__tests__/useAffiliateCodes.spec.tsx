import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import type { ContractsChainId } from "sdk/configs/chains";
import { encodeReferralCode } from "sdk/utils/referrals";

import { useAffiliateCodes } from "../index";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  endpoint: "https://example.com/referrals" as string | undefined,
}));

vi.mock("config/indexers", () => ({
  getIndexerUrl: () => mocks.endpoint,
}));
vi.mock("sdk/utils/graphqlFetcher", () => ({ default: mocks.query }));

type HookResult = ReturnType<typeof useAffiliateCodes>;

function Harness({
  account,
  enabled,
  chainId = ARBITRUM,
  onResult,
}: {
  account?: string;
  enabled: boolean;
  chainId?: ContractsChainId;
  onResult: (result: HookResult) => void;
}) {
  onResult(useAffiliateCodes(chainId, account, enabled));
  return null;
}

function renderHarness(props: ComponentProps<typeof Harness>) {
  const config = { provider: () => new Map(), dedupingInterval: 0 };
  return render(<Harness {...props} />, {
    wrapper: ({ children }: { children?: ReactNode }) => <SWRConfig value={config}>{children}</SWRConfig>,
  });
}

function ownedCodes(code: string) {
  return { affiliateStats: [], referralCodes: [{ code: encodeReferralCode(code) }] };
}

function setup(enabled = true, account = "0x123") {
  let result!: HookResult;
  renderHarness({ account, enabled, onResult: (nextResult) => (result = nextResult) });
  return () => result;
}

describe("useAffiliateCodes", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.endpoint = "https://example.com/referrals";
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not query while sharing is closed", () => {
    const getResult = setup(false);

    expect(mocks.query).not.toHaveBeenCalled();
    expect(getResult()).toMatchObject({ code: null, success: false });
  });

  it("queries owned codes case-insensitively without changing the account casing", async () => {
    const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
    const ownedCode = encodeReferralCode("H4X");
    mocks.query.mockResolvedValue({
      affiliateStats: [{ referralCode: ownedCode }],
      referralCodes: [{ code: ownedCode }],
    });

    const getResult = setup(true, account);

    await waitFor(() => expect(getResult()).toMatchObject({ code: "H4X", success: true }));

    const [, queryText, variables] = mocks.query.mock.calls[0];
    expect(queryText).toContain("affiliate_contains_nocase: $account");
    expect(queryText).toContain("owner_contains_nocase: $account");
    expect(variables).toEqual({ account });
  });

  it("selects the highest-volume code the user still owns", async () => {
    const transferredCode = encodeReferralCode("sonicash");
    const ownedCode = encodeReferralCode("test_12");
    mocks.query.mockResolvedValue({
      affiliateStats: [{ referralCode: transferredCode }, { referralCode: ownedCode }],
      referralCodes: [{ code: ownedCode }],
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toMatchObject({ code: "test_12", success: true }));
  });

  it("returns an owned code that has no historical volume", async () => {
    const ownedCode = encodeReferralCode("new_code");
    mocks.query.mockResolvedValue({
      affiliateStats: [],
      referralCodes: [{ code: ownedCode }],
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toMatchObject({ code: "new_code", success: true }));
  });

  it("confirms that the user owns no code even when historical stats exist", async () => {
    mocks.query.mockResolvedValue({
      affiliateStats: [{ referralCode: encodeReferralCode("old_code") }],
      referralCodes: [],
    });

    const getResult = setup();

    await waitFor(() => expect(getResult()).toMatchObject({ code: null, success: true }));
  });

  it("retries a transient failure automatically", async () => {
    vi.useFakeTimers();
    mocks.query.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(ownedCodes("tano"));
    const getResult = setup();

    await act(async () => vi.advanceTimersByTimeAsync(1000));

    expect(getResult()).toMatchObject({ code: "tano", success: true, error: false });
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("limits failed lookups to three attempts and allows manual retry", async () => {
    vi.useFakeTimers();
    mocks.query.mockRejectedValue(new Error("Failed to fetch"));
    const getResult = setup();

    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(getResult()).toMatchObject({ code: null, success: false, error: true });
    expect(mocks.query).toHaveBeenCalledTimes(3);
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(mocks.query).toHaveBeenCalledTimes(3);

    mocks.query.mockResolvedValueOnce(ownedCodes("tano"));
    await act(async () => {
      await getResult().mutate();
    });

    expect(getResult()).toMatchObject({ code: "tano", success: true, error: false });
    expect(mocks.query).toHaveBeenCalledTimes(4);
  });

  it("aborts stalled requests and leaves loading after bounded retries even if abort is ignored", async () => {
    vi.useFakeTimers();
    mocks.query.mockImplementation(() => new Promise(() => undefined));
    const getResult = setup();

    await act(async () => vi.advanceTimersByTimeAsync(9999));
    expect(getResult()).toMatchObject({ success: false, error: false });
    expect(mocks.query.mock.calls[0][3].signal.aborted).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(mocks.query.mock.calls[0][3].signal.aborted).toBe(true);

    await act(async () => vi.advanceTimersByTimeAsync(23_000));
    expect(getResult()).toMatchObject({ code: null, success: false, error: true });
    expect(mocks.query).toHaveBeenCalledTimes(3);
    expect(mocks.query.mock.calls.every(([, , , options]) => options.signal.aborted)).toBe(true);
  });

  it("retains the same wallet's code while refreshing and after a failed refresh", async () => {
    vi.useFakeTimers();
    mocks.query.mockResolvedValueOnce(ownedCodes("tano"));
    const getResult = setup();
    await act(() => Promise.resolve());
    expect(getResult()).toMatchObject({ code: "tano", success: true });

    mocks.query.mockRejectedValue(new Error("Unavailable"));
    act(() => {
      void getResult().mutate();
    });
    expect(getResult()).toMatchObject({ code: "tano", success: true, error: false });
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(getResult()).toMatchObject({ code: "tano", success: true, error: false });

    mocks.query.mockResolvedValueOnce({ affiliateStats: [], referralCodes: [] });
    await act(async () => {
      await getResult().mutate();
    });
    expect(getResult()).toMatchObject({ code: null, success: true, error: false });
  });

  it("reuses the cached code when the card remounts for the same wallet", async () => {
    mocks.query.mockResolvedValueOnce(ownedCodes("tano"));
    let result!: HookResult;
    const props = {
      account: "0x123",
      enabled: true,
      onResult: (next: HookResult) => {
        result = next;
      },
    };
    const view = renderHarness(props);
    await waitFor(() => expect(result.code).toBe("tano"));

    mocks.query.mockImplementation(() => new Promise(() => undefined));
    view.rerender(<Harness key="remounted" {...props} />);

    expect(result).toMatchObject({ code: "tano", success: true, error: false });
  });

  it.each([
    { account: "0x456", chainId: ARBITRUM },
    { account: "0x123", chainId: AVALANCHE },
  ] as const)("does not carry a cached code to another wallet or chain: %j", async (next) => {
    mocks.query.mockResolvedValueOnce(ownedCodes("tano"));
    let result!: HookResult;
    const onResult = (value: HookResult) => {
      result = value;
    };
    const view = renderHarness({ account: "0x123", enabled: true, onResult });
    await waitFor(() => expect(result.code).toBe("tano"));

    mocks.query.mockImplementation(() => new Promise(() => undefined));
    view.rerender(<Harness {...next} enabled onResult={onResult} />);

    expect(result).toMatchObject({ code: null, success: false, error: false });
  });

  it("ignores a late response for a previously checked wallet", async () => {
    let resolveFirst!: (value: ReturnType<typeof ownedCodes>) => void;
    mocks.query.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      })
    );
    let result!: HookResult;
    const onResult = (value: HookResult) => {
      result = value;
    };
    const view = renderHarness({ account: "0x123", enabled: true, onResult });

    mocks.query.mockResolvedValueOnce(ownedCodes("other"));
    view.rerender(<Harness account="0x456" enabled onResult={onResult} />);
    await waitFor(() => expect(result.code).toBe("other"));
    await act(async () => resolveFirst(ownedCodes("tano")));

    expect(result.code).toBe("other");
  });

  it("reports an unavailable indexer without querying", () => {
    mocks.endpoint = undefined;
    const getResult = setup();

    expect(getResult()).toMatchObject({ code: null, success: false, error: true });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
