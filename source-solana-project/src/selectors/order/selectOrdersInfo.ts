import { createAppStoreSelector } from '@/zustand/useAppStore';
import { selectMarketsInfo } from '../market/selectMarketsInfo';
import { selectTokensData } from '../token/selectTokensData';
import { selectOrders } from './baseSelectors';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { OrdersInfo } from '@/selectors/order/types';
import { getTokenData } from '@/utils/token/getTokenData';
import { getOrderInfo } from '@/utils/order/getOrderInfo';

export const selectOrdersInfo = createAppStoreSelector(
  [selectMarketsInfo, selectTokensData, selectOrders],
  (marketsInfoData, tokensData, ordersData) => {
    if (!marketsInfoData || !tokensData || !ordersData) {
      return {};
    }

    const ordersInfo: OrdersInfo = {};
    const wrappedToken = getTokenData(tokensData, WRAPPED_NATIVE_TOKEN_ADDRESS);

    if (!wrappedToken) {
      return {};
    }

    for (const key in ordersData) {
      const order = ordersData[key];
      const orderInfo = getOrderInfo({
        marketsInfoData,
        tokensData,
        wrappedNativeToken: wrappedToken,
        order,
      });

      if (orderInfo) {
        ordersInfo[key] = orderInfo;
      }
    }

    return ordersInfo;
  }
);
