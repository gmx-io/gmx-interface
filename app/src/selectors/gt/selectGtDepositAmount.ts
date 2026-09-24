import { RootState } from '@/zustand/useAppStore';

import { parseValue } from '@/utils/legacy/parse';
import { selectGtGlobalDetailsDecimals } from './gtGlobalDetailsSelectors';
import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@/config/constants';
import { createAppStoreSelector } from '@/zustand/useAppStore';

export const selectGtDepositInputValue = (state: RootState) =>
  state.gtState.depositInputValue;

export const selectGtSetDepositInputValue = (state: RootState) =>
  state.gtState.setDepositInputValue;

export const selectGtDepositAmount = createAppStoreSelector(
  [selectGtDepositInputValue, selectGtGlobalDetailsDecimals],
  (depositInputValue, gtDecimals): BN => {
    if (!depositInputValue || !gtDecimals) return BN_ZERO;
    return parseValue(depositInputValue, gtDecimals) ?? BN_ZERO;
  }
);
