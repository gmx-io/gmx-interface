import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePositionLifecycleIdByKey } from "./usePositionLifecycleIdByKey";
import { fetchPositionLifecycleId } from "./useTradeHistory";

vi.mock("./useTradeHistory", () => ({
  fetchPositionLifecycleId: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPositionLifecycleId);

const CHAIN_ID = 42161;

type HookResult = ReturnType<typeof usePositionLifecycleIdByKey>;

function Harness({
  positionKey,
  onResolve,
  onRender,
}: {
  positionKey: string | undefined;
  onResolve: (lifecycleId: string | undefined) => void;
  onRender: (result: HookResult) => void;
}) {
  const result = usePositionLifecycleIdByKey({ chainId: CHAIN_ID, positionKey, onResolve });
  onRender(result);
  return null;
}

describe("usePositionLifecycleIdByKey", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("does not fetch or resolve when positionKey is undefined", () => {
    const onResolve = vi.fn();
    let latest!: HookResult;

    render(<Harness positionKey={undefined} onResolve={onResolve} onRender={(r) => (latest = r)} />);

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(onResolve).not.toHaveBeenCalled();
    expect(latest.isResolving).toBe(false);
  });

  it("resolves the lifecycle id for a key and reports it once settled", async () => {
    mockedFetch.mockResolvedValue("lifecycle-1");
    const onResolve = vi.fn();
    let latest!: HookResult;

    render(<Harness positionKey="0xkey" onResolve={onResolve} onRender={(r) => (latest = r)} />);

    expect(mockedFetch).toHaveBeenCalledWith({ chainId: CHAIN_ID, positionKey: "0xkey" });
    expect(latest.isResolving).toBe(true);

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith("lifecycle-1"));
    await waitFor(() => expect(latest.isResolving).toBe(false));
  });

  it("reports undefined when no lifecycle id is found", async () => {
    mockedFetch.mockResolvedValue(undefined);
    const onResolve = vi.fn();

    render(<Harness positionKey="0xkey" onResolve={onResolve} onRender={vi.fn()} />);

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(undefined));
  });

  it("reports undefined and stops resolving when the request rejects", async () => {
    mockedFetch.mockRejectedValue(new Error("network"));
    const onResolve = vi.fn();
    let latest!: HookResult;

    render(<Harness positionKey="0xkey" onResolve={onResolve} onRender={(r) => (latest = r)} />);

    await waitFor(() => expect(onResolve).toHaveBeenCalledWith(undefined));
    await waitFor(() => expect(latest.isResolving).toBe(false));
  });
});
