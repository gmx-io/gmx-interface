import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { Operation } from '@/selectors/gmbox/types';
import { MarketInfo } from '@/selectors/market/types';
import {
  filterBalances,
  filterMarkets,
  filterMarketStatus,
  filterMarketTokenPrices,
  filterMetadatas,
} from '@/utils/lib/filter';
import { helperNotice } from '@/utils/lib/helperNotice';
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isSameTokenAddress } from '@/utils/token/isSameTokenAddress';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { BN } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PublicKey } from '@solana/web3.js';
import { invokeCreateWithdrawal } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateGmWithdrawal() {
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
      marketInfo,
      operation,
      marketTokenAmount,
      finalLongTokenAddress,
      finalShortTokenAddress,
    }: {
      skipPreflight: boolean;
      marketInfo: MarketInfo;
      operation: Operation;
      marketTokenAmount: BN;
      finalLongTokenAddress: PublicKey;
      finalShortTokenAddress: PublicKey;
    }) => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (!marketTokenAmount) {
        helperNotice.error(t`Market token amount is not set`);
        throw Error('Market token amount is not set');
      }

      if (operation === Operation.Withdrawal && !marketTokenAmount.isZero()) {
        if (marketInfo.isSingle) {
          const [signature, withdrawal] = await invokeCreateWithdrawal(
            store,
            {
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              marketToken: marketInfo.marketTokenAddress,
              amount: marketTokenAmount,
              finalLongToken: isNativeToken(finalLongTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : finalLongTokenAddress,
              finalShortToken: marketInfo.shortTokenAddress,
              options: {
                skipNativeTokenUnwrap: isWrappedNativeToken(
                  finalLongTokenAddress
                ),
              },
            },
            {
              skipPreflight,
              computeUnits,
              computeUnitPrice,
            }
          );
          console.log(
            `created a GM withdrawal ${withdrawal.toBase58()} at tx ${signature}`
          );
          return signature;
        } else {
          const { fixedfinalLongTokenAddress, fixedfinalShortTokenAddress } =
            fixUnnecessarySwap({
              marketInfo,
              finalLongTokenAddress,
              finalShortTokenAddress,
            });
          const [signature, withdrawal] = await invokeCreateWithdrawal(
            store,
            {
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              marketToken: marketInfo.marketTokenAddress,
              amount: marketTokenAmount,
              finalLongToken: isNativeToken(fixedfinalLongTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedfinalLongTokenAddress,
              finalShortToken: isNativeToken(fixedfinalShortTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedfinalShortTokenAddress,
              options: {
                skipNativeTokenUnwrap:
                  isWrappedNativeToken(fixedfinalLongTokenAddress) &&
                  isWrappedNativeToken(fixedfinalShortTokenAddress),
              },
            },
            {
              skipPreflight,
              computeUnits,
              computeUnitPrice,
            }
          );
          console.log(
            `created a GM withdrawal ${withdrawal.toBase58()} at tx ${signature}`
          );
          return signature;
        }
      } else {
        throw Error('Withdrawl failed');
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-withdrawal',
      onSentMessage: t`Creating withdrawal...`,
      message: t`Withdrawal created.`,
    },
    invoker as (arg: {
      skipPreflight: boolean;
      marketInfo: MarketInfo;
      operation: Operation;
      marketTokenAmount: BN;
      finalLongTokenAddress: PublicKey;
      finalShortTokenAddress: PublicKey;
    }) => Promise<string>,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}

const fixUnnecessarySwap = ({
  marketInfo,
  finalLongTokenAddress,
  finalShortTokenAddress,
}: {
  marketInfo: MarketInfo;
  finalLongTokenAddress: PublicKey;
  finalShortTokenAddress: PublicKey;
}) => {
  if (
    isSameTokenAddress(finalLongTokenAddress, marketInfo.shortTokenAddress) &&
    isSameTokenAddress(finalShortTokenAddress, marketInfo.longTokenAddress)
  ) {
    return {
      fixedfinalLongTokenAddress: finalShortTokenAddress,
      fixedfinalShortTokenAddress: finalLongTokenAddress,
    };
  } else {
    return {
      fixedfinalLongTokenAddress: finalLongTokenAddress,
      fixedfinalShortTokenAddress: finalShortTokenAddress,
    };
  }
};
