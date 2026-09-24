import { USD_DECIMALS } from '@/config/constants';

import { BN_ZERO } from '@/config/constants';
import { parseValue } from '@/utils/legacy/parse';
import { isSwapOrderType } from '@/utils/order/isOrderType';
import { selectOrderEditorTriggerRatioInputValue } from './baseSelectors';
import { selectOrderEditorMarkRatio } from './selectOrderEditorMarkRatio';
import { TokensRatio } from '@/selectors/token/types';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';

export const selectOrderEditorTriggerRatio = createAppStoreSelector(
  [
    selectOrderEditorEditingOrder,
    selectOrderEditorMarkRatio,
    selectOrderEditorTriggerRatioInputValue,
  ],
  (order, markRatio, triggerRatioInputValue): TokensRatio | undefined => {
    if (!order) return undefined;
    if (!markRatio || !isSwapOrderType(order.orderType)) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio != undefined && ratio.gt(BN_ZERO) ? ratio : markRatio.ratio,
      largestToken: markRatio.largestToken,
      smallestToken: markRatio.smallestToken,
    };
  }
);
