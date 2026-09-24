import {
  GMX_SOLANA_MARKET_TOKENS,
  GMX_SOLANA_STORE_ADDRESS,
} from '@/config/program';
import { useOrders } from '@/hooks/fetchHooks';
import { usePendingOrderAddresses } from '@/hooks/fetchHooks/usePendingOrderAddresses';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useRef, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useShallow } from 'zustand/react/shallow';

import { Order, OrderKind } from '@/selectors/order/types';
import { findMarketPDA, optionalAccount } from 'gmsol';
import { utils, translateAddress, BN } from '@coral-xyz/anchor';
import { MemcmpFilter, PublicKey } from '@solana/web3.js';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { isOrderForFetching } from '@/utils/order/isOrderType';
import { getOrderTypeFromOrderKind } from '@/utils/order/getOrderTypeFromOrderKind';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { getGmw385Enabled } from '@/config/featureFlagEnable';
import isEqual from 'lodash/isEqual';

interface OrderTokens {
  initialCollateral: {
    token: PublicKey;
  };
  longToken: {
    token: PublicKey;
  };
  shortToken: {
    token: PublicKey;
  };
  finalOutputToken: {
    token: PublicKey;
  };
}

interface OrderParams {
  side: number;
  position: PublicKey;
  collateralToken: PublicKey;
  kind: OrderKind;
  acceptablePrice: BN;
  sizeDeltaValue: BN;
  initialCollateralDeltaAmount: BN;
  triggerPrice: BN;
  minOutput: BN;
}

interface headerItem {
  updatedAt: BN
}
interface OrderAccount {
  marketToken: PublicKey;
  tokens: OrderTokens;
  params: OrderParams;
  swap: {
    paths: PublicKey[];
    primaryLength: number;
    secondaryLength: number;
  };
  header: headerItem
}

type OptionalAccount = (
  account: PublicKey | null | undefined
) => PublicKey | null;
const typedOptionalAccount = optionalAccount as OptionalAccount;

export const useOrdersData = ({
  updateOrder = false,
  pollingEnabled = true,
}: {
  updateOrder?: boolean;
  pollingEnabled?: boolean;
}) => {
  const { connected } = useWallet();
  const { owner } = useAnchor();
  const store = GMX_SOLANA_STORE_ADDRESS;
  const marketTokens = GMX_SOLANA_MARKET_TOKENS;
  const { markets, setOrders, setIsOrderLoading, sortedIndexTokens } = useAppStore(
    useShallow((state) => ({
      markets: state.markets.markets,
      setOrders: state.orderState.setOrders,
      setIsOrderLoading: state.orderState.setIsOrdersLoading,
      sortedIndexTokens: state.indexTokens.sortedIndexTokens
    }))
  );

  const prevConnectedRef = useRef(connected);
  const prevCanFetchOrdersRef = useRef(connected && Boolean(owner));
  const prevLoadingRef = useRef(false);
  const prevOrdersRef = useRef({});

  // const { pendingOrders: rawPendingOrders } = usePendingOrderAddresses(
  //   connected ? store : undefined,
  //   connected ? marketTokens : []
  // );
  // const pendingOrders = useMemo(() => rawPendingOrders, [rawPendingOrders]);
  const { orders, isLoading, refresh } = useOrders({ pollingEnabled });

  useEffect(() => {
    const prevConnected = prevConnectedRef.current;
    prevConnectedRef.current = connected;

    if (!connected && prevConnected) {
      setOrders({});
      setIsOrderLoading(false);
    }
  }, [connected, setOrders, setIsOrderLoading]);

  useEffect(() => {
    if (prevLoadingRef.current !== isLoading) {
      prevLoadingRef.current = isLoading;
      setIsOrderLoading(isLoading);
    } else {
      setIsOrderLoading(isLoading);
    }
  }, [isLoading, setIsOrderLoading]);

  useEffect(() => {
    const canFetchOrders = connected && Boolean(owner);
    const prevCanFetchOrders = prevCanFetchOrdersRef.current;
    prevCanFetchOrdersRef.current = canFetchOrders;

    if (!getGmw385Enabled() || !canFetchOrders || prevCanFetchOrders) {
      return;
    }

    let isActive = true;

    setIsOrderLoading(true);
    void refresh().finally(() => {
      if (isActive) {
        setIsOrderLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [connected, owner, refresh, setIsOrderLoading]);

  useEffect(() => {
    if (connected && !isLoading && !isEqual(orders, prevOrdersRef.current)) {
      prevOrdersRef.current = orders;
      // if (!Object.keys(orders).length) {
      //   return;
      // }
      setOrders(orders);
    }
  }, [connected, isLoading, orders, setOrders]);

  useEffect(() => {
    if (updateOrder) {
      void refresh();
      console.log('updateOrder Event subscription')
    }
  }, [refresh, updateOrder])
};
