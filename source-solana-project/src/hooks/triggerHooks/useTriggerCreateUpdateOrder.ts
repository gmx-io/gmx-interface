import { BN_10 } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
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
import { helperNotice } from '@/utils/lib/helperNotice';
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeUpdateOrder, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateUpdateOrder() {
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const { computeUnits, computeUnitPrice } = useComputeUnits();

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
      sizeDeltaUsd,
      acceptablePrice,
      triggerPrice,
      minOutputAmount,
      indexTokenDecimals,
    }: {
      skipPreflight: boolean;
      orderAddress: Address | undefined;
      sizeDeltaUsd: BN | undefined;
      acceptablePrice: BN | undefined;
      triggerPrice: BN | undefined;
      minOutputAmount: BN | undefined;
      indexTokenDecimals: number | undefined;
    }): Promise<string> => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw new Error('Wallet is not connected');
      }
      if (!orderAddress) {
        helperNotice.error(t`Please select an order`);
        throw new Error('Order address is not set');
      }
      if (indexTokenDecimals == null) {
        helperNotice.error(t`Index token decimals is not set`);
        throw new Error('Index token decimals is not set');
      }

      const triggerPriceAdjusted = triggerPrice
        ? triggerPrice.div(BN_10.pow(new BN(indexTokenDecimals)))
        : undefined;
      const acceptablePriceAdjusted = acceptablePrice
        ? acceptablePrice.div(BN_10.pow(new BN(indexTokenDecimals)))
        : undefined;

      const [signature] = await invokeUpdateOrder(
        store,
        {
          store: GMX_SOLANA_STORE_ADDRESS,
          owner: user,
          order: translateAddress(orderAddress),
          sizeDeltaUsd: sizeDeltaUsd ? toBigInt(sizeDeltaUsd) : undefined,
          acceptablePrice: acceptablePriceAdjusted
            ? toBigInt(acceptablePriceAdjusted)
            : undefined,
          triggerPrice: triggerPriceAdjusted
            ? toBigInt(triggerPriceAdjusted)
            : undefined,
          minOutputAmount: minOutputAmount
            ? toBigInt(minOutputAmount)
            : undefined,
          options: {},
        },
        {
          skipPreflight,
          computeUnits,
          computeUnitPrice,
        }
      );
      console.log(`updated order at tx ${signature}`);
      return signature;
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'update-order',
      onSentMessage: t`Updating order...`,
      message: t`Order updated.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
