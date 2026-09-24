import { BN_ZERO } from '@/config/constants';
import { FeeItem } from '@/selectors/fee/types';

export function getTotalFeeItem(feeItems: (FeeItem | undefined)[]): FeeItem {
  const totalFeeItem: FeeItem = {
    deltaUsd: BN_ZERO,
    bps: 0,
  };

  (feeItems.filter(Boolean) as FeeItem[]).forEach((feeItem) => {
    totalFeeItem.deltaUsd = totalFeeItem.deltaUsd.add(feeItem.deltaUsd);
    totalFeeItem.bps = totalFeeItem.bps + feeItem.bps;
  });

  return totalFeeItem;
}
