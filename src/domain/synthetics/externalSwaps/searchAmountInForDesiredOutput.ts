import { BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import type { ContractsChainId } from "sdk/configs/chains";

import { getKyberSwapRoute, KyberSwapRouteResult } from "./kyberSwap";

const MAX_ITERATIONS = 5;
const CONVERGENCE_THRESHOLD_BPS = 50n; // 0.5% tolerance
const MIN_OUTPUT_RATIO_BPS = 5000n; // 50% — stop if output is less than 50% of desired

type FetchRoute = typeof getKyberSwapRoute;

export async function searchAmountInForDesiredOutput(
  {
    chainId,
    tokenInAddress,
    tokenOutAddress,
    desiredAmountOut,
    initialAmountIn,
    gasPrice,
  }: {
    chainId: ContractsChainId;
    tokenInAddress: string;
    tokenOutAddress: string;
    desiredAmountOut: bigint;
    initialAmountIn: bigint;
    gasPrice: bigint;
  },
  fetchRoute: FetchRoute = getKyberSwapRoute
): Promise<{ amountIn: bigint; routeResult: KyberSwapRouteResult } | undefined> {
  let amountIn = initialAmountIn;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (amountIn <= 0n) return undefined;

    const routeResult = await fetchRoute({
      chainId,
      tokenInAddress,
      tokenOutAddress,
      amountIn,
      gasPrice,
    });

    if (!routeResult) return undefined;

    const outputAmount = routeResult.outputAmount;
    if (outputAmount <= 0n) return undefined;

    // First-iteration divergence guard: KyberSwap returned a route with wildly lower output than
    // oracle-seeded expectation — signals a dead pool or extreme price impact, not worth iterating.
    if (i === 0 && (outputAmount * BASIS_POINTS_DIVISOR_BIGINT) / desiredAmountOut < MIN_OUTPUT_RATIO_BPS) {
      return undefined;
    }

    const diff = outputAmount > desiredAmountOut ? outputAmount - desiredAmountOut : desiredAmountOut - outputAmount;
    const diffBps = (diff * BASIS_POINTS_DIVISOR_BIGINT) / desiredAmountOut;

    if (diffBps <= CONVERGENCE_THRESHOLD_BPS) {
      return { amountIn, routeResult };
    }

    const newAmountIn = (amountIn * desiredAmountOut) / outputAmount;

    // Exponential-growth guard: secant step blew up (would 3x amountIn in one step).
    if (newAmountIn > amountIn * 3n) return undefined;

    amountIn = newAmountIn;
  }

  return undefined;
}
