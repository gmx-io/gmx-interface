import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '@/selectors/market/selectMarketsInfo';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';
import { getByKey } from '@/utils/lib/object';

export const selectOrderEditorIndexTokenDecimals = createAppStoreSelector(
  [selectOrderEditorEditingOrder, selectMarketsInfo],
  (order, marketsInfo) => {
    if (!order) return undefined;

    const marketTokenAddress = order.marketTokenAddress;
    return getByKey(marketsInfo, marketTokenAddress.toBase58())?.indexToken
      ?.decimals;
  }
);
