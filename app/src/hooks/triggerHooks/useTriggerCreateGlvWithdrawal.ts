import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
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
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeCreateGlvWithdrawal } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateGlvWithdrawal() {
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
      marketToken,
      glvToken,
      amount,
      finalLongToken,
      finalShortToken,
    }: {
      skipPreflight: boolean;
      marketToken: Address;
      glvToken: Address;
      amount: BN;
      finalLongToken: Address;
      finalShortToken: Address;
    }) => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (!amount) {
        helperNotice.error(t`Amount is not set`);
        throw Error('Amount is not set');
      }

      const [signature, withdrawal] = await invokeCreateGlvWithdrawal(
        store,
        {
          store: GMX_SOLANA_STORE_ADDRESS,
          owner: user,
          glvToken: translateAddress(glvToken),
          marketToken: translateAddress(marketToken),
          amount,
          finalLongToken: isNativeToken(finalLongToken)
            ? WRAPPED_NATIVE_TOKEN_ADDRESS
            : translateAddress(finalLongToken),
          finalShortToken: isNativeToken(finalShortToken)
            ? WRAPPED_NATIVE_TOKEN_ADDRESS
            : translateAddress(finalShortToken),
          options: {
            skipNativeTokenUnwrap:
              isWrappedNativeToken(finalLongToken) &&
              isWrappedNativeToken(finalShortToken),
          },
        },
        {
          skipPreflight,
          computeUnits,
          computeUnitPrice,
        }
      );

      console.log(
        `created a GLV withdrawal ${withdrawal.toBase58()} at tx ${signature}`
      );
      return signature;
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-glv-withdrawal',
      onSentMessage: t`Creating GLV withdrawal...`,
      message: t`GLV withdrawal created.`,
    },
    invoker as (arg: {
      skipPreflight: boolean;
      marketToken: Address;
      glvToken: Address;
      amount: BN;
      finalLongToken: Address;
      finalShortToken: Address;
    }) => Promise<string>,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
