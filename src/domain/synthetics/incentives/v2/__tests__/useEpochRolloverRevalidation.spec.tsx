import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useEpochRolloverRevalidation } from "../useEpochRolloverRevalidation";

function Harness({
  epochTimestamp,
  enabled,
  scopeKey = "default",
  revalidate,
}: {
  epochTimestamp: number;
  enabled: boolean;
  scopeKey?: string;
  revalidate: () => Promise<unknown>;
}) {
  useEpochRolloverRevalidation({ epochTimestamp, enabled, scopeKey, revalidate });
  return null;
}

describe("useEpochRolloverRevalidation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("revalidates at 5, 15, and 30 seconds after an epoch rollover", async () => {
    const revalidate = vi.fn(async () => undefined);
    const { rerender } = render(<Harness epochTimestamp={100} enabled revalidate={revalidate} />);

    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(3);
  });

  it("waits until the rollover consumer is enabled", async () => {
    const revalidate = vi.fn(async () => undefined);
    const { rerender } = render(<Harness epochTimestamp={100} enabled={false} revalidate={revalidate} />);

    rerender(<Harness epochTimestamp={200} enabled={false} revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(revalidate).not.toHaveBeenCalled();

    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it("cancels pending retries on unmount", async () => {
    const revalidate = vi.fn(async () => undefined);
    const { rerender, unmount } = render(<Harness epochTimestamp={100} enabled revalidate={revalidate} />);

    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(revalidate).not.toHaveBeenCalled();
  });

  it("cancels pending retries when the consumer scope changes", async () => {
    const firstRevalidate = vi.fn(async () => undefined);
    const nextRevalidate = vi.fn(async () => undefined);
    const { rerender } = render(
      <Harness epochTimestamp={100} enabled scopeKey="account-a" revalidate={firstRevalidate} />
    );

    rerender(<Harness epochTimestamp={200} enabled scopeKey="account-a" revalidate={firstRevalidate} />);
    rerender(<Harness epochTimestamp={200} enabled scopeKey="account-b" revalidate={nextRevalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(firstRevalidate).not.toHaveBeenCalled();
    expect(nextRevalidate).not.toHaveBeenCalled();
  });

  it("does not reschedule a consumed rollover when enabled toggles", async () => {
    const revalidate = vi.fn(async () => undefined);
    const { rerender } = render(<Harness epochTimestamp={100} enabled revalidate={revalidate} />);

    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(3);

    rerender(<Harness epochTimestamp={200} enabled={false} revalidate={revalidate} />);
    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(revalidate).toHaveBeenCalledTimes(3);
  });

  it("resumes pending retries when re-enabled mid-flight", async () => {
    const revalidate = vi.fn(async () => undefined);
    const { rerender } = render(<Harness epochTimestamp={100} enabled revalidate={revalidate} />);

    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(1);

    rerender(<Harness epochTimestamp={200} enabled={false} revalidate={revalidate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    rerender(<Harness epochTimestamp={200} enabled revalidate={revalidate} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(revalidate).toHaveBeenCalledTimes(3);
  });
});
