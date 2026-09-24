import { BN } from '@coral-xyz/anchor';

export type ShiftAmounts = {
  fromTokenAmount: BN;
  fromTokenUsd: BN;
  fromLongTokenAmount: BN;
  fromShortTokenAmount: BN;
  toTokenAmount: BN;
  toTokenUsd: BN;
  swapPriceImpactDeltaUsd: BN;
};

export type DepositAmounts = {
  marketTokenAmount: BN;
  marketTokenUsd: BN;
  longTokenAmount: BN;
  longTokenUsd: BN;
  shortTokenAmount: BN;
  shortTokenUsd: BN;
  glvTokenAmount: BN;
  glvTokenUsd: BN;
  swapFeeUsd: BN;
  swapPriceImpactDeltaUsd: BN;
};

export type WithdrawalAmounts = {
  marketTokenAmount: BN;
  marketTokenUsd: BN;
  longTokenAmount: BN;
  longTokenUsd: BN;
  shortTokenAmount: BN;
  shortTokenUsd: BN;
  glvTokenAmount: BN;
  glvTokenUsd: BN;
  swapFeeUsd: BN;
  swapPriceImpactDeltaUsd: BN;
};
