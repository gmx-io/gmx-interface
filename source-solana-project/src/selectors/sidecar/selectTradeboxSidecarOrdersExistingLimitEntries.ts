import { PositionOrderInfo } from '@/selectors/order/types';
import { InitialEntry } from './types';
import { selectTradeboxExistingLimitOrders } from './selectTradeboxExistingLimitOrders';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { prepareInitialEntries } from '@/utils/sidecar/prepareInitialEntries';
import { selectChartToken } from '../chart/selectChartToken';

export const selectTradeboxSidecarOrdersExistingLimitEntries =
  createAppStoreSelector(
    [selectTradeboxExistingLimitOrders, selectChartToken],
    (existingLimitOrders, chartToken): InitialEntry[] | undefined => {
      return prepareInitialEntries({
        positionOrders: existingLimitOrders as PositionOrderInfo[],
        sort: 'desc',
        priceDecimals: chartToken?.decimals,
      });
    }
  );
