import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import {
  filterBalances,
  filterMarkets,
  filterMarketStatus,
  filterMarketTokenPrices,
  filterMetadatas,
} from '@/utils/lib/filter';
import { helperNotice } from '@/utils/lib/helperNotice';
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeCreateShift, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateGmShift() {
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const { computeUnits, computeUnitPrice } = useComputeUnits();

  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
    void mutate(filterMetadatas);
    void mutate(filterMarkets);
    void mutate(filterMarketStatus);
    void mutate(filterMarketTokenPrices);
  }, [mutate]);

  const invoker = useCallback(
    async ({
      skipPreflight,
      fromMarketTokenAddress,
      toMarketTokenAddress,
      shiftAmount,
    }: {
      skipPreflight: boolean;
      fromMarketTokenAddress: Address;
      toMarketTokenAddress: Address;
      shiftAmount: BN;
    }) => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }

      const [signature, shift] = await invokeCreateShift(
        store,
        {
          store: GMX_SOLANA_STORE_ADDRESS,
          owner: user,
          fromMarketToken: translateAddress(fromMarketTokenAddress),
          toMarketToken: translateAddress(toMarketTokenAddress),
          amount: toBigInt(shiftAmount),
        },
        {
          skipPreflight,
          computeUnits,
          computeUnitPrice,
        }
      );

      console.log(`created a shift ${shift.toBase58()} at tx ${signature}`);
      return signature;
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-shift',
      onSentMessage: t`Creating shift...`,
      message: t`Shift created.`,
    },
    invoker as (arg: {
      skipPreflight: boolean;
      fromMarketTokenAddress: Address;
      toMarketTokenAddress: Address;
      shiftAmount: BN;
    }) => Promise<string>,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
