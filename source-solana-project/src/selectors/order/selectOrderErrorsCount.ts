import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { findAllPaths } from '@/utils/tradebox/findAllPaths';
import { getSwapBestPath } from '@/utils/tradebox/getSwapBestPath';
import { getSwapPathStats } from '@/utils/tradebox/getSwapPathStats';
import { getOrderErrors } from '@/utils/validation/getOrderErrors';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';

import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { selectSwapEstimator } from '../trade/selectSwapEstimator';
import { selectSwapGraph } from '../trade/selectSwapGraph';
import { selectOrdersInfo } from './selectOrdersInfo';

export const selectOrderErrorsCount = createAppStoreSelector(
  [
    selectOrdersInfo,
    selectPositionsInfo,
    selectMarketsInfo,
    selectSwapGraph,
    selectSwapEstimator,
    selectWrappedNativeToken,
  ],
  (
    ordersInfo,
    positionsInfo,
    marketsInfo,
    marketsGraph,
    swapEstimator,
    wrappedNativeToken
  ) => {
    const result = {
      warnings: 0,
      errors: 0,
    };

    if (!marketsInfo || !ordersInfo || !wrappedNativeToken) {
      return result;
    }

    Object.values(ordersInfo).forEach((orderInfo) => {
      const fromTokenAddress =
        orderInfo.initialCollateralToken.address.toBase58();
      const toTokenAddress = orderInfo.targetCollateralToken.address.toBase58();

      const findSwapPath = (usdIn: BN, opts: { byLiquidity?: boolean }) => {
        if (!marketsInfo || !marketsGraph || !swapEstimator) {
          return undefined;
        }

        const allPaths = findAllPaths(
          marketsInfo,
          marketsGraph,
          fromTokenAddress,
          toTokenAddress ?? ''
        );

        if (!allPaths?.length) {
          return undefined;
        }

        let swapPath: string[] | undefined = undefined;

        if (opts.byLiquidity) {
          swapPath = allPaths[0].path;
        } else {
          swapPath = getSwapBestPath(allPaths, usdIn, swapEstimator);
        }

        if (!swapPath) {
          return undefined;
        }

        return getSwapPathStats({
          marketsInfo,
          swapPath,
          initialCollateralAddress: fromTokenAddress,
          wrappedNativeTokenAddress: WRAPPED_NATIVE_TOKEN_ADDRESS.toBase58(),
          shouldUnwrapNativeToken: isNativeToken(toTokenAddress),
          shouldApplyPriceImpact: true,
          usdIn,
        });
      };

      const { level } = getOrderErrors({
        order: orderInfo,
        positionsInfoData: positionsInfo,
        marketsInfoData: marketsInfo,
        findSwapPath,
        wrappedNativeToken,
      });

      if (level === 'error') result.errors++;
      if (level === 'warning') result.warnings++;
    });

    return result;
  }
);
