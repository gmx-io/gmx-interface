import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getDepositAmounts } from '@/utils/gmbox/getDepositAmounts';
import { getWithdrawalAmounts } from '@/utils/gmbox/getWithdrawalAmounts';
import { ShiftAmounts } from '@/utils/gmbox/types';
import {
  convertMarketTokenAmountToUsd,
  convertUsdToMarketTokenAmount,
} from '@/utils/legacy/convert';
import { BN } from '@coral-xyz/anchor';

export function getShiftAmounts({
  strategy,
  fromToken,
  fromMarketInfo,
  toToken,
  toMarketInfo,
  fromTokenAmount,
  toTokenAmount,
}: {
  strategy: 'byFromToken' | 'byToToken';
  fromToken: TokenData;
  fromMarketInfo: MarketInfo;
  toToken: TokenData;
  toMarketInfo: MarketInfo;
  fromTokenAmount: BN;
  toTokenAmount: BN;
}): ShiftAmounts {
  const values: ShiftAmounts = {
    fromTokenAmount: BN_ZERO,
    fromTokenUsd: BN_ZERO,
    fromLongTokenAmount: BN_ZERO,
    fromShortTokenAmount: BN_ZERO,
    toTokenAmount: BN_ZERO,
    toTokenUsd: BN_ZERO,
    swapPriceImpactDeltaUsd: BN_ZERO,
  };

  if (strategy === 'byFromToken') {
    values.fromTokenAmount = fromTokenAmount;
    values.fromTokenUsd = convertMarketTokenAmountToUsd(
      fromMarketInfo,
      fromToken,
      fromTokenAmount
    );

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      marketTokenAmount: fromTokenAmount,
      strategy: 'byMarketToken',
      longTokenAmount: BN_ZERO,
      shortTokenAmount: BN_ZERO,
      forShift: true,
    });

    const depositAmounts = getDepositAmounts({
      marketInfo: toMarketInfo,
      marketToken: toToken,
      longToken: toMarketInfo.longToken,
      shortToken: toMarketInfo.shortToken,
      longTokenAmount: withdrawalAmounts.longTokenAmount,
      shortTokenAmount: withdrawalAmounts.shortTokenAmount,
      marketTokenAmount: BN_ZERO,
      strategy: 'byCollaterals',
      includeLongToken: false,
      includeShortToken: false,
      forShift: true,
      isMarketTokenDeposit: false,
    });

    values.fromLongTokenAmount = withdrawalAmounts.longTokenAmount;
    values.fromShortTokenAmount = withdrawalAmounts.shortTokenAmount;

    values.swapPriceImpactDeltaUsd = depositAmounts.swapPriceImpactDeltaUsd;

    values.toTokenAmount = depositAmounts.marketTokenAmount;
    values.toTokenUsd = convertMarketTokenAmountToUsd(
      toMarketInfo,
      toToken,
      depositAmounts.marketTokenAmount
    );
  } else {
    values.toTokenAmount = toTokenAmount;
    values.toTokenUsd = convertMarketTokenAmountToUsd(
      toMarketInfo,
      toToken,
      toTokenAmount
    );

    const withdrawalAmounts = getWithdrawalAmounts({
      marketInfo: fromMarketInfo,
      marketToken: fromToken,
      strategy: 'byMarketToken',
      marketTokenAmount:
        convertUsdToMarketTokenAmount(
          fromMarketInfo,
          fromToken,
          values.toTokenUsd
        ) ?? BN_ZERO,
      longTokenAmount: BN_ZERO,
      shortTokenAmount: BN_ZERO,
      forShift: true,
    });

    const depositAmounts = getDepositAmounts({
      marketInfo: toMarketInfo,
      marketToken: toToken,
      strategy: 'byCollaterals',
      longToken: toMarketInfo.longToken,
      longTokenAmount: withdrawalAmounts.longTokenAmount,
      shortToken: toMarketInfo.shortToken,
      shortTokenAmount: withdrawalAmounts.shortTokenAmount,
      marketTokenAmount: BN_ZERO,
      includeLongToken: true,
      includeShortToken: true,
      forShift: true,
      isMarketTokenDeposit: false,
    });

    values.fromLongTokenAmount = depositAmounts.longTokenAmount;
    values.fromShortTokenAmount = depositAmounts.shortTokenAmount;

    values.swapPriceImpactDeltaUsd = depositAmounts.swapPriceImpactDeltaUsd;

    // Hack to try to take price impact into account during reverse calculation
    values.fromTokenAmount = withdrawalAmounts.marketTokenAmount.sub(
      convertUsdToMarketTokenAmount(
        fromMarketInfo,
        fromToken,
        values.swapPriceImpactDeltaUsd
      ) ?? BN_ZERO
    );
    values.fromTokenUsd = convertMarketTokenAmountToUsd(
      fromMarketInfo,
      fromToken,
      values.fromTokenAmount
    );
  }

  return values;
}
