import { selectGmboxFirstTokenAmount } from './selectGmboxFirstTokenAmount';
import { selectGmboxFirstToken } from './selectGmboxFirstToken';
import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectGmboxOperation } from './baseSelectors';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { Operation } from '@/selectors/gmbox/types';

export const selectGmboxFirstTokenUsd = createAppStoreSelector(
  [selectGmboxFirstTokenAmount, selectGmboxOperation, selectGmboxFirstToken],
  (amount, operation, token) =>
    convertTokenAmountToUsd(
      amount,
      token?.decimals,
      operation === Operation.Deposit
        ? token?.prices.minPrice
        : token?.prices.maxPrice
    )
);
