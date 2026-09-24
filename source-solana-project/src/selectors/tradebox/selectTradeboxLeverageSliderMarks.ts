import { createAppStoreSelector } from '@/zustand/useAppStore';

import { getTradeLeverageSliderMarks } from '@/utils/tradebox/getTradeLeverageSliderMarks';
import { selectTradeboxMaxLeverage } from './selectTradeboxMaxLeverage';

export const selectTradeboxLeverageSliderMarks = createAppStoreSelector(
  selectTradeboxMaxLeverage,
  (maxLeverage) => {
    return getTradeLeverageSliderMarks(maxLeverage);
  }
);
