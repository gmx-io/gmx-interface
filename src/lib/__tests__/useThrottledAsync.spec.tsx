import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useThrottledAsync } from "../useThrottledAsync";

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
