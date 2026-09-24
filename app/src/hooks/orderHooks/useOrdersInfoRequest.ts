import { MarketFilterLongShortItemData } from '@/components/Common/Table/TableMarketFilter/MarketFilterLongShort';
import { MarketsInfo } from '@/selectors/market/types';
import { getByKey } from '@/utils/lib/object';
import { OrdersInfo, OrderType } from '@/selectors/order/types';
import { TokensData } from '@/selectors/token/types';
import { useAppStore } from '@/zustand/useAppStore';
import { useMemo } from 'react';
import { selectOrdersCountForDisplay } from '@/selectors/order/baseSelectors';
import { selectOrdersInfo } from '@/selectors/order/selectOrdersInfo';
import { selectWrappedNativeToken } from '@/selectors/token/selectWrappedNativeToken';
import { getOrderInfo } from '@/utils/order/getOrderInfo';

export type AggregatedOrdersDataResult = {
  ordersInfoData?: OrdersInfo;
  count?: number;
  isLoading: boolean;
};

export function useOrdersInfoRequest(p: {
  marketsInfoData?: MarketsInfo;
  marketsDirectionsFilter?: MarketFilterLongShortItemData[];
  orderTypesFilter?: OrderType[];
  tokensData?: TokensData;
  account: string | null | undefined;
}): AggregatedOrdersDataResult {
  const { marketsInfoData, tokensData, account } = p;
  const ordersData = useAppStore(selectOrdersInfo);
  const orderCount = useAppStore(selectOrdersCountForDisplay);
  const wrappedToken = useAppStore(selectWrappedNativeToken);

  return useMemo(() => {
    if (!account) {
      return {
        isLoading: false,
      };
    }

    if (!marketsInfoData || !ordersData || !tokensData) {
      return {
        isLoading: true,
      };
    }

    const ordersInfoData = Object.keys(ordersData).reduce(
      (acc: OrdersInfo, orderKey: string) => {
        const order = getByKey(ordersData, orderKey)!;

        if (!wrappedToken) {
          return acc;
        }

        const orderInfo = getOrderInfo({
          marketsInfoData,
          tokensData,
          wrappedNativeToken: wrappedToken,
          order,
        });

        if (!orderInfo) {
          // eslint-disable-next-line no-console
          console.warn(`OrderInfo parsing error`, order);

          return acc;
        }

        acc[orderKey] = orderInfo;

        return acc;
      },
      {} as OrdersInfo
    );

    return {
      count: orderCount,
      ordersInfoData,
      isLoading: false,
    };
  }, [
    account,
    orderCount,
    marketsInfoData,
    ordersData,
    tokensData,
    wrappedToken,
  ]);
}
