import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AsyncResult, useThrottledAsync } from "../useThrottledAsync";

const cases = [
  { leading: true, trailing: false, withLoading: false },
  { leading: true, trailing: false, withLoading: true },
  { leading: false, trailing: true, withLoading: false },
  { leading: false, trailing: true, withLoading: true },
] as const;

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useThrottledAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(cases)(
    "when leading=$leading trailing=$trailing withLoading=$withLoading",
    async ({ leading, trailing, withLoading }) => {
      const estimator = vi.fn().mockResolvedValue("ok");
      const params = { x: 1 };

      function TestComponent() {
        useThrottledAsync(estimator, {
          params,
          throttleMs: 5000,
          leading,
          trailing,
          withLoading,
        });
        return null;
      }

      render(<TestComponent />);

      if (leading) {
        await advance(20);
        expect(estimator).toHaveBeenCalled();
      } else {
        expect(estimator).not.toHaveBeenCalled();
        await advance(20);
        expect(estimator).not.toHaveBeenCalled();
        await advance(5000);
        expect(estimator).toHaveBeenCalled();
      }
    }
  );
});

const firstParams = { x: 1 };
const nextParams = { x: 2 };

describe("useThrottledAsync with a rejecting estimator", () => {
  it("marks the loading promise handled while consumers awaiting state.promise still get the rejection", async () => {
    const error = new Error("estimation failed");
    const estimator = vi.fn().mockRejectedValue(error);
    const params = { x: 1 };
    const states: AsyncResult<string>[] = [];
    const onUnhandledRejection = vi.fn();
    // eslint-disable-next-line no-restricted-globals -- the assertion is about Node's unhandled-rejection tracking
    process.on("unhandledRejection", onUnhandledRejection);

    function TestComponent() {
      states.push(
        useThrottledAsync<string, { x: number }>(estimator, {
          params,
          leading: true,
          trailing: false,
          withLoading: true,
        })
      );
      return null;
    }

    try {
      await act(async () => {
        render(<TestComponent />);
        // Node emits unhandledRejection after the microtask queue drains, before the check phase
        await new Promise((resolve) => setImmediate(resolve));
      });

      const loadingState = states.find((state) => state.isLoading);
      const lastState = states[states.length - 1];

      expect(onUnhandledRejection).not.toHaveBeenCalled();
      expect(lastState.error).toBe(error);
      expect(lastState.data).toBeUndefined();
      expect(lastState.promise).toBeUndefined();
      await expect(loadingState?.promise).rejects.toBe(error);
    } finally {
      // eslint-disable-next-line no-restricted-globals
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("keeps the previous error in state while the next estimation is loading", async () => {
    const error = new Error("estimation failed");
    const estimator = vi.fn().mockRejectedValue(error);
    const states: AsyncResult<string>[] = [];

    function TestComponent({ params }: { params: { x: number } }) {
      states.push(
        useThrottledAsync<string, { x: number }>(estimator, {
          params,
          leading: true,
          trailing: false,
          withLoading: true,
          forceRecalculate: true,
        })
      );
      return null;
    }

    const view = render(<TestComponent params={firstParams} />);
    await act(() => new Promise((resolve) => setImmediate(resolve)));

    const firstErrorIndex = states.findIndex((state) => state.error === error && !state.isLoading);
    expect(firstErrorIndex).toBeGreaterThan(-1);

    await act(async () => {
      view.rerender(<TestComponent params={nextParams} />);
      await new Promise((resolve) => setImmediate(resolve));
    });

    const reloadingState = states.slice(firstErrorIndex + 1).find((state) => state.isLoading);
    expect(reloadingState?.error).toBe(error);
  });
});
