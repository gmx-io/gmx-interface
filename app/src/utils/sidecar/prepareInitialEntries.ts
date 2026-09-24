import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { PositionOrderInfo } from '@/selectors/order/types';
import { InitialEntry } from '@/selectors/sidecar/types';
import { getDefaultEntryField } from '@/utils/sidecar/getDefaultEntryField';

export function prepareInitialEntries({
  positionOrders,
  sort = 'desc',
  priceDecimals,
}: {
  positionOrders: PositionOrderInfo[] | undefined;
  sort: 'desc' | 'asc';
  priceDecimals?: number;
}): undefined | InitialEntry[] {
  if (!positionOrders) return;

  return positionOrders
    .sort((a, b) => {
      const [first, second] = sort === 'desc' ? [a, b] : [b, a];
      const diff = first.triggerPrice?.sub(second.triggerPrice ?? BN_ZERO);
      if (diff?.gt(BN_ZERO)) return -1;
      if (diff?.lt(BN_ZERO)) return 1;
      return 0;
    })
    .map((order) => {
      const entry: InitialEntry = {
        sizeUsd: getDefaultEntryField(USD_DECIMALS, {
          value: order.sizeDeltaUsd,
        }),
        price: getDefaultEntryField(
          USD_DECIMALS,
          { value: order.triggerPrice },
          priceDecimals
        ),
        order,
      };

      return entry;
    });
}
