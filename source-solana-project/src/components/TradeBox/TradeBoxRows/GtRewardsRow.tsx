import ExchangeInfoRow from '@/components/Exchange/ExchangeInfoRow';
import { BN_10, BN_ZERO } from '@/config/constants';
import { FeeItem } from '@/selectors/fee/types';
import {
  selectGtGlobalDetailsDecimals,
  selectGtGlobalDetailsMintingCostRaw,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { formatAmount } from '@/utils/legacy/format';
import { useAppStore } from '@/zustand/useAppStore';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { useMemo } from 'react';

type Props = {
  gtRewards?: FeeItem;
  isTop?: boolean;
};

export function GtRewardsRow({ gtRewards, isTop }: Props) {
  const mintingCostRaw = useAppStore(selectGtGlobalDetailsMintingCostRaw);
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const mintingCost = mintingCostRaw.mul(BN_10.pow(new BN(gtDecimals)));
  console.log('mintingCost', mintingCost.toString());
  const gtRewardsUsd = gtRewards?.deltaUsd;
  const gtRewardsAmount = useMemo(() => {
    return gtRewardsUsd && !mintingCost.isZero()
      ? gtRewardsUsd.abs().div(mintingCostRaw)
      : BN_ZERO;
  }, [gtRewardsUsd, mintingCost, mintingCostRaw]);

  const value = useMemo(() => {
    if (!gtRewards || gtRewards.deltaUsd.isZero()) {
      return '-';
    }

    // Only show GT amount without USD value
    return `+${formatAmount(gtRewardsAmount, gtDecimals, 2)} GT`;
  }, [gtRewards, gtRewardsAmount, gtDecimals]);

  return (
    <ExchangeInfoRow
      className={value !== '-' ? 'text-green-500' : undefined}
      isTop={isTop}
      label={t`Mint GT`}
      value={value}
    />
  );
}
