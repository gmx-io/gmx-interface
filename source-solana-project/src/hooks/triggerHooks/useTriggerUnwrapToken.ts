import { useSWRConfig } from 'swr';
import { t } from '@lingui/macro';
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { useStoreProgram } from '@/contexts/anchor';
import { useComputeUnits } from '../utilsHooks/useComputeUnits';
import { filterBalances } from '@/utils/lib/filter';
import { useCallback } from 'react';
import { useTriggerInvocation } from './useTriggerInvocation';
import { invokeUnwrap } from 'gmsol';
import { helperToast } from '@/utils/lib/helperToast';

export function useTriggerUnwrapToken() {
  const store = useStoreProgram();
  const { mutate } = useSWRConfig();
  const { computeUnits, computeUnitPrice } = useComputeUnits();
  const mutateStates = useCallback(() => {
    void mutate(filterBalances);
  }, [mutate]);

  const invoker = useCallback(
    async ({
      amount,
      unwrappedTokenAddress,
      skipPreflight,
    }: {
      amount: BN;
      unwrappedTokenAddress: Address;
      skipPreflight: boolean;
    }): Promise<string> => {
      const owner = store.provider.publicKey;

      if (!owner) {
        helperToast.error(t`Wallet is not connected`);
        throw new Error('Wallet is not connected');
      }

      const [signature] = await invokeUnwrap(
        store,
        {
          amount,
          owner,
          unwrappedMint: translateAddress(unwrappedTokenAddress),
        },
        {
          skipPreflight,
          computeUnits,
          computeUnitPrice,
        }
      );

      return signature;
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'unwrap-token',
      onSentMessage: t`Unwrapping...`,
      message: t`Unwrapped.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
