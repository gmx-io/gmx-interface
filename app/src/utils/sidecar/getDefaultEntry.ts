import { BN_100, ONE_USD, USD_DECIMALS } from '@/config/constants';
import { SidecarOrderEntryBase } from '@/selectors/sidecar/types';
import { getDefaultEntryField } from '@/utils/sidecar/getDefaultEntryField';
import uniqueId from 'lodash/uniqueId';

export const MAX_PERCENTAGE = BN_100.mul(ONE_USD);
export const PERCENTAGE_DECEMALS = 0;

export function getDefaultEntry<T extends SidecarOrderEntryBase>(
  prefix: string,
  override?: Partial<SidecarOrderEntryBase>
): T {
  return {
    id: uniqueId(`${prefix}_`),
    price: getDefaultEntryField(USD_DECIMALS),
    sizeUsd: getDefaultEntryField(USD_DECIMALS),
    percentage: getDefaultEntryField(PERCENTAGE_DECEMALS, {
      value: MAX_PERCENTAGE,
    }),
    mode: 'keepPercentage',
    order: null,
    txnType: null,
    ...override,
  } as T;
}
