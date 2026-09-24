import { selectGmboxOperation } from './baseSelectors';
import { selectGmboxSecondToken } from './selectGmboxSecondToken';
import { selectGmboxSecondTokenAmount } from './selectGmboxSecondTokenAmount';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { Operation } from '@/selectors/gmbox/types';

export const selectGmboxSecondTokenUsd = createAppStoreSelector(
  [selectGmboxSecondTokenAmount, selectGmboxOperation, selectGmboxSecondToken],
  (amount, operation, token) =>
    convertTokenAmountToUsd(
      amount,
      token?.decimals,
      operation === Operation.Deposit
        ? token?.prices.minPrice
        : token?.prices.maxPrice
    )
);
