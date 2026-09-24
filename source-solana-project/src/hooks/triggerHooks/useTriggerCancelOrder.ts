import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import {
  filterBalances,
  filterMarkets,
  filterOrders,
  filterPositions,
  filterUserOrderAddresses,
} from '@/utils/lib/filter';
import { Address, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeCancelOrder } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { helperNotice } from '@/utils/lib/helperNotice';
import usePositionSocketStore from '@/zustand/positionSocketStore';

export function useTriggerCancelOrder() {
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const { computeUnits, computeUnitPrice } = useComputeUnits();
  const setIsRefreshPositionAndOrder = usePositionSocketStore((state) => state.setIsRefreshPositionAndOrder);

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
    void mutate(filterMarkets);
    void mutate(filterPositions);
    void mutate(filterOrders);
    void mutate(filterUserOrderAddresses);
  }, [mutate]);

  const invoker = useCallback(
    async ({
      skipPreflight,
      orderAddress,
    }: {
      skipPreflight: boolean;
      orderAddress: Address | undefined;
    }): Promise<string> => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (!orderAddress) {
        helperNotice.error(t`Please select an order`);
        throw Error('Order address is not set');
      }

      const [signature] = await invokeCancelOrder(
        store,
        {
          owner: user,
          order: translateAddress(orderAddress),
          options: {},
        },
        {
          skipPreflight,
          computeUnits: Math.max(computeUnits, 400_000),
          computeUnitPrice,
        }
      );
      console.log(`canceled order at tx ${signature}`);
      setTimeout(() => {
        // trigger refresh the positions
        setIsRefreshPositionAndOrder(true);
      }, 100);
      return signature;
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'cancel-order',
      onSentMessage: t`Canceling order...`,
      message: t`Order canceled.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
