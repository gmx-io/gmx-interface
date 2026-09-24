import { Operation } from '@/selectors/gmbox/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectGmboxOperation } from './baseSelectors';
import { selectGmboxMarketOrGLvToken } from './selectGmboxMarketOrGlvToken';
import { selectGmboxMarketOrGlvTokenAmount } from './selectGmboxMarketOrGlvTokenAmount';

export const selectGmboxMarketOrGlvTokenUsd = createAppStoreSelector(
  [
    selectGmboxMarketOrGlvTokenAmount,
    selectGmboxMarketOrGLvToken,
    selectGmboxOperation,
  ],
  (amount, token, operation) =>
    convertTokenAmountToUsd(
      amount,
      token?.decimals,
      operation === Operation.Deposit
        ? token?.prices.minPrice
        : token?.prices.maxPrice
    )
);
