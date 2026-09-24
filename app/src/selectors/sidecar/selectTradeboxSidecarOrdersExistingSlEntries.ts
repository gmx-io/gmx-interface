import { PositionOrderInfo } from '@/selectors/order/types';
import { InitialEntry } from './types';
import { prepareInitialEntries } from '@/utils/sidecar/prepareInitialEntries';
import { selectTradeboxTradeFlags } from '../tradebox/selectTradeboxTradeFlags';
import { selectTradeboxExistingSlOrders } from './selectTradeboxExistingSlOrders';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectChartToken } from '../chart/selectChartToken';

export const selectTradeboxSidecarOrdersExistingSlEntries =
  createAppStoreSelector(
    [
      selectTradeboxExistingSlOrders,
      selectTradeboxTradeFlags,
      selectChartToken,
    ],
    (existingSlOrders, tradeFlags, chartToken): InitialEntry[] | undefined => {
      return prepareInitialEntries({
        positionOrders: existingSlOrders as PositionOrderInfo[],
        sort: tradeFlags.isLong ? 'desc' : 'asc',
        priceDecimals: chartToken?.decimals,
      });
    }
  );
