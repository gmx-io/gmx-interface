import { getOrderErrors } from '@/utils/validation/getOrderErrors';
import { createAppStoreSelectorFactory } from '@/zustand/useAppStore';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrdersInfo } from './selectOrdersInfo';
import { selectPositionsInfo } from '../position/selectPositionsInfo';
import { OrderErrors } from './types';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectWrappedNativeToken } from '../token/selectWrappedNativeToken';
import { makeSelectFindSwapPath } from '../trade/makeSelectFindSwapPath';

export const makeSelectOrderErrorByOrderAddress = createAppStoreSelectorFactory<
  OrderErrors,
  [string | undefined]
>((orderAddress) =>
  createAppStoreSelector(
    [
      selectOrdersInfo,
      selectPositionsInfo,
      selectMarketsInfo,
      selectWrappedNativeToken,
      (rootState) => rootState,
    ],
    (orders, positionsInfo, marketsInfo, wrappedNativeToken, rootState) => {
      const orderInfo = orderAddress ? orders[orderAddress] : undefined;

      if (!orderInfo) return { errors: [], level: undefined };
      if (!marketsInfo) return { errors: [], level: undefined };
      if (!wrappedNativeToken) return { errors: [], level: undefined };

      const findSwapPath = makeSelectFindSwapPath(
        orderInfo.initialCollateralToken.address.toBase58(),
        orderInfo.targetCollateralToken.address.toBase58()
      );

      const { errors, level } = getOrderErrors({
        order: orderInfo,
        positionsInfoData: positionsInfo,
        marketsInfoData: marketsInfo,
        findSwapPath: findSwapPath(rootState),
        wrappedNativeToken,
      });

      return { errors, level };
    }
  )
);
