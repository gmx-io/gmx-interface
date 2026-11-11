import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { metrics } from "lib/metrics";

import { useApiDataFallbackCounter } from "./useApiDataFallbackCounter";

const pushCounter = vi.spyOn(metrics, "pushCounter").mockImplementation(() => undefined);

function Counter({ chainId, isApiStale }: { chainId: number; isApiStale: boolean }) {
  useApiDataFallbackCounter({
    domain: "wsPrices",
    chainId,
    apiEnabled: true,
    apiData: {},
    isApiStale,
    apiError: undefined,
  });
  return null;
}

function renderCounter(chainId: number) {
  const { rerender } = render(<Counter chainId={chainId} isApiStale={false} />);
  return { setStale: (isApiStale: boolean) => rerender(<Counter chainId={chainId} isApiStale={isApiStale} />) };
}

describe("useApiDataFallbackCounter", () => {
  afterEach(() => {
    cleanup();
    pushCounter.mockClear();
  });

  it.each([
    { name: "two hooks entering one outage", chains: [ARBITRUM, ARBITRUM], steps: [[true, true]], pushes: 1 },
    {
      name: "one hook recovering while the other stays in fallback",
      chains: [ARBITRUM, ARBITRUM],
      steps: [
        [true, true],
        [false, true],
        [true, true],
      ],
      pushes: 1,
    },
    {
      name: "every hook recovering, then a second outage",
      chains: [ARBITRUM, ARBITRUM],
      steps: [
        [true, true],
        [false, false],
        [false, true],
      ],
      pushes: 2,
    },
    { name: "outages on two chains", chains: [ARBITRUM, AVALANCHE], steps: [[true, true]], pushes: 2 },
  ])("pushes $pushes fallback(s) for $name", ({ chains, steps, pushes }) => {
    const counters = chains.map(renderCounter);

    steps.forEach((staleByHook) => staleByHook.forEach((isApiStale, i) => counters[i].setStale(isApiStale)));

    expect(pushCounter).toHaveBeenCalledTimes(pushes);
  });
});
