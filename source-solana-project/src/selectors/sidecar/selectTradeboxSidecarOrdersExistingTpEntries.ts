import { PositionOrderInfo } from '@/selectors/order/types';
import { InitialEntry } from './types';
import { prepareInitialEntries } from '@/utils/sidecar/prepareInitialEntries';
import { selectTradeboxTradeFlags } from '../tradebox/selectTradeboxTradeFlags';
import { selectTradeboxExistingTpOrders } from './selectTradeboxExistingTpOrders';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectChartToken } from '../chart/selectChartToken';

export const selectTradeboxSidecarOrdersExistingTpEntries =
  createAppStoreSelector(
    [
      selectTradeboxExistingTpOrders,
      selectTradeboxTradeFlags,
      selectChartToken,
    ],
    (existingTpOrders, tradeFlags, chartToken): InitialEntry[] | undefined => {
      return prepareInitialEntries({
        positionOrders: existingTpOrders as PositionOrderInfo[],
        sort: tradeFlags.isLong ? 'asc' : 'desc',
        priceDecimals: chartToken?.decimals,
      });
    }
  );
