import { BN_ZERO } from '@/config/constants';
import { SwapEstimator, SwapRoute } from '@/selectors/trade/types';
import { BN } from '@coral-xyz/anchor';

export function getSwapBestPath(
  routes: SwapRoute[],
  usdIn: BN,
  estimator: SwapEstimator
) {
  if (routes.length === 0) return undefined;

  let bestPath = routes[0].path;
  let bestUsdOut = BN_ZERO;

  for (const route of routes) {
    try {
      const pathUsdOut = route.edged.reduce((prevUsdOut, edge) => {
        const { usdOut } = estimator(edge, prevUsdOut);
        return usdOut;
      }, usdIn);

      if (pathUsdOut.gt(bestUsdOut)) {
        bestPath = route.path;
        bestUsdOut = pathUsdOut;
      }
    } catch (e) {
      continue;
    }
  }

  return bestPath;
}
