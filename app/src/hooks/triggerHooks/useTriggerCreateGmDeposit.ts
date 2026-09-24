import { BN_ZERO } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { Mode, Operation } from '@/selectors/gmbox/types';
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
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeCreateDeposit } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateGmDeposit() {
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
      mode,
      operation,
      initialLongTokenAddress,
      initialShortTokenAddress,
      longTokenAmount,
      shortTokenAmount,
    }: {
      skipPreflight: boolean;
      marketInfo: MarketInfo;
      mode: Mode;
      operation: Operation;
      initialLongTokenAddress: Address;
      initialShortTokenAddress: Address;
      longTokenAmount: BN;
      shortTokenAmount: BN;
    }) => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }

      if (operation === Operation.Deposit) {
        const isSingleSidedMarket = marketInfo.isSingle;

        if (mode === Mode.Single) {
          if (
            isSameTokenAddress(
              initialLongTokenAddress,
              marketInfo.shortTokenAddress
            )
          ) {
            const [signature, deposit] = await invokeCreateDeposit(
              store,
              {
                store: GMX_SOLANA_STORE_ADDRESS,
                owner: user,
                marketToken: marketInfo.marketTokenAddress,
                initialLongToken: marketInfo.longTokenAddress,
                initialShortToken: isNativeToken(initialLongTokenAddress)
                  ? WRAPPED_NATIVE_TOKEN_ADDRESS
                  : translateAddress(initialLongTokenAddress),
                initialLongTokenAmount: isSingleSidedMarket
                  ? longTokenAmount
                  : BN_ZERO,
                initialShortTokenAmount: shortTokenAmount,
                options: {
                  shouldWrapNativeTokenForLong: isNativeToken(
                    initialLongTokenAddress
                  ),
                  shouldWrapNativeTokenForShort: isNativeToken(
                    initialLongTokenAddress
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
              `created a GM deposit ${deposit.toBase58()} at tx ${signature}`
            );
            return signature;
          } else {
            const [signature, deposit] = await invokeCreateDeposit(
              store,
              {
                store: GMX_SOLANA_STORE_ADDRESS,
                owner: user,
                marketToken: marketInfo.marketTokenAddress,
                initialLongToken: isNativeToken(initialLongTokenAddress)
                  ? WRAPPED_NATIVE_TOKEN_ADDRESS
                  : translateAddress(initialLongTokenAddress),
                initialShortToken: marketInfo.shortTokenAddress,
                initialLongTokenAmount: longTokenAmount,
                initialShortTokenAmount: BN_ZERO,
                options: {
                  shouldWrapNativeTokenForLong: isNativeToken(
                    initialLongTokenAddress
                  ),
                  // shouldWrapNativeTokenForShort: isNativeToken(
                  //   marketInfo.shortTokenAddress
                  // ),
                },
              },
              {
                skipPreflight,
                computeUnits,
                computeUnitPrice,
              }
            );
            console.log(
              `created a GM deposit ${deposit.toBase58()} at tx ${signature}`
            );
            return signature;
          }
        } else if (
          mode === Mode.Pair &&
          !(longTokenAmount.isZero() && shortTokenAmount.isZero())
        ) {
          const {
            fixedInitialLongTokenAddress,
            fixedInitialShortTokenAddress,
          } = fixUnnecessarySwap({
            marketInfo,
            initialLongTokenAddress,
            initialShortTokenAddress,
          });
          const [signature, deposit] = await invokeCreateDeposit(
            store,
            {
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              marketToken: marketInfo.marketTokenAddress,
              initialLongToken: isNativeToken(fixedInitialLongTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedInitialLongTokenAddress,
              initialShortToken: isNativeToken(fixedInitialShortTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedInitialShortTokenAddress,
              initialLongTokenAmount: longTokenAmount,
              initialShortTokenAmount: shortTokenAmount,
              options: {
                shouldWrapNativeTokenForLong: isNativeToken(
                  fixedInitialLongTokenAddress
                ),
                shouldWrapNativeTokenForShort: isNativeToken(
                  fixedInitialShortTokenAddress
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
            `created a GM deposit ${deposit.toBase58()} at tx ${signature}`
          );
          return signature;
        } else {
          console.log(
            'not enough amounts',
            mode,
            longTokenAmount.toString(),
            shortTokenAmount.toString()
          );
          throw Error('Not enough amounts for deposit');
        }
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-deposit',
      onSentMessage: t`Creating deposit...`,
      message: t`Deposit created.`,
    },
    invoker as (arg: {
      skipPreflight: boolean;
      marketInfo: MarketInfo;
      mode: Mode;
      operation: Operation;
      initialLongTokenAddress: Address;
      initialShortTokenAddress: Address;
      longTokenAmount: BN;
      shortTokenAmount: BN;
    }) => Promise<string>,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}

const fixUnnecessarySwap = ({
  marketInfo,
  initialLongTokenAddress,
  initialShortTokenAddress,
}: {
  marketInfo: MarketInfo;
  initialLongTokenAddress: Address;
  initialShortTokenAddress: Address;
}) => {
  if (
    isSameTokenAddress(initialLongTokenAddress, marketInfo.shortTokenAddress) &&
    isSameTokenAddress(initialShortTokenAddress, marketInfo.longTokenAddress)
  ) {
    return {
      fixedInitialLongTokenAddress: translateAddress(initialShortTokenAddress),
      fixedInitialShortTokenAddress: translateAddress(initialLongTokenAddress),
    };
  } else {
    return {
      fixedInitialLongTokenAddress: translateAddress(initialLongTokenAddress),
      fixedInitialShortTokenAddress: translateAddress(initialShortTokenAddress),
    };
  }
};
