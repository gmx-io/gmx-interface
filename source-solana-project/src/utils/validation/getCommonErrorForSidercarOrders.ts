import { BN_ZERO } from '@/config/constants';
import { SidecarOrderEntry } from '@/selectors/sidecar/types';
import { MAX_PERCENTAGE } from '@/utils/sidecar/getDefaultEntry';

export function getCommonErrorForSidercarOrders(
  displayableEntries: SidecarOrderEntry[] = []
) {
  const totalPercentage = displayableEntries.reduce(
    (total, entry) =>
      entry.percentage?.value ? total.add(entry.percentage.value) : total,
    BN_ZERO
  );

  return totalPercentage.gt(MAX_PERCENTAGE)
    ? {
        percentage: 'Max percentage exceeded',
      }
    : null;
}
