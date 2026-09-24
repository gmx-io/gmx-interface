import { BN_ZERO } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { WRAPPED_NATIVE_TOKEN_ADDRESS } from '@/config/tokens';
import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { GlvInfo } from '@/selectors/glv/types';
import { Mode, Operation } from '@/selectors/gmbox/types';
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
import { PublicKey } from '@solana/web3.js';
import { invokeCreateGlvDeposit } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateGlvDeposit() {
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
      operation,
      mode,
      glvInfo,
      marketTokenAddressForGlv,
      initialLongTokenAddress,
      initialShortTokenAddress,
      marketTokenAmount,
      initialLongTokenAmount,
      initialShortTokenAmount,
      isMarketTokenDeposit,
    }: {
      skipPreflight: boolean;
      operation: Operation;
      mode: Mode;
      glvInfo: GlvInfo;
      marketTokenAddressForGlv: Address;
      initialLongTokenAddress: PublicKey;
      initialShortTokenAddress: PublicKey;
      marketTokenAmount: BN;
      initialLongTokenAmount: BN;
      initialShortTokenAmount: BN;
      isMarketTokenDeposit: boolean;
    }) => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (operation === Operation.Deposit) {
        const isSingleSidedGlv = glvInfo.isSingle;

        if (isMarketTokenDeposit) {
          const [signature, glvDeposit] = await invokeCreateGlvDeposit(
            store,
            {
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              glvToken: glvInfo.glvTokenAddress,
              marketToken: translateAddress(marketTokenAddressForGlv),
              initialLongToken: glvInfo.longTokenAddress,
              initialShortToken: glvInfo.shortTokenAddress,
              marketTokenAmount: marketTokenAmount,
              initialLongTokenAmount: BN_ZERO,
              initialShortTokenAmount: BN_ZERO,
            },
            {
              skipPreflight,
              computeUnits,
              computeUnitPrice,
            }
          );

          console.log(
            `created a GLV deposit ${glvDeposit.toBase58()} at tx ${signature}`
          );
          return signature;
        } else if (mode === Mode.Single && !isMarketTokenDeposit) {
          if (
            isSameTokenAddress(
              initialLongTokenAddress,
              glvInfo.shortTokenAddress
            )
          ) {
            const [signature, glvDeposit] = await invokeCreateGlvDeposit(
              store,
              {
                store: GMX_SOLANA_STORE_ADDRESS,
                owner: user,
                glvToken: glvInfo.glvTokenAddress,
                marketToken: translateAddress(marketTokenAddressForGlv),
                initialLongToken: glvInfo.longTokenAddress,
                initialShortToken: isNativeToken(initialLongTokenAddress)
                  ? WRAPPED_NATIVE_TOKEN_ADDRESS
                  : translateAddress(initialLongTokenAddress),
                marketTokenAmount: BN_ZERO,
                initialLongTokenAmount: isSingleSidedGlv
                  ? initialLongTokenAmount
                  : BN_ZERO,
                initialShortTokenAmount: initialShortTokenAmount,
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
              `created a GLV deposit ${glvDeposit.toBase58()} at tx ${signature}`
            );
            return signature;
          } else {
            const [signature, deposit] = await invokeCreateGlvDeposit(
              store,
              {
                store: GMX_SOLANA_STORE_ADDRESS,
                owner: user,
                glvToken: glvInfo.glvTokenAddress,
                marketToken: translateAddress(marketTokenAddressForGlv),
                initialLongToken: isNativeToken(initialLongTokenAddress)
                  ? WRAPPED_NATIVE_TOKEN_ADDRESS
                  : translateAddress(initialLongTokenAddress),
                initialShortToken: glvInfo.shortTokenAddress,
                marketTokenAmount: BN_ZERO,
                initialLongTokenAmount: initialLongTokenAmount,
                initialShortTokenAmount: BN_ZERO,
                options: {
                  shouldWrapNativeTokenForLong: isNativeToken(
                    initialLongTokenAddress
                  ),
                  // shouldWrapNativeTokenForShort: isNativeToken(
                  //   glvInfo.shortTokenAddress
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
              `created a deposit ${deposit.toBase58()} at tx ${signature}`
            );
            return signature;
          }
        } else if (
          mode === Mode.Pair &&
          !isMarketTokenDeposit &&
          !(initialLongTokenAmount.isZero() && initialShortTokenAmount.isZero())
        ) {
          const {
            fixedInitialLongTokenAddress,
            fixedInitialShortTokenAddress,
          } = fixUnnecessarySwap({
            glvInfo,
            initialLongTokenAddress,
            initialShortTokenAddress,
          });
          const [signature, deposit] = await invokeCreateGlvDeposit(
            store,
            {
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              glvToken: glvInfo.glvTokenAddress,
              marketToken: translateAddress(marketTokenAddressForGlv),
              initialLongToken: isNativeToken(fixedInitialLongTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedInitialLongTokenAddress,
              initialShortToken: isNativeToken(fixedInitialShortTokenAddress)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : fixedInitialShortTokenAddress,
              marketTokenAmount: BN_ZERO,
              initialLongTokenAmount: initialLongTokenAmount,
              initialShortTokenAmount: initialShortTokenAmount,
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
            `created a deposit ${deposit.toBase58()} at tx ${signature}`
          );
          return signature;
        } else {
          console.log(
            'not enough amounts',
            mode,
            initialLongTokenAmount.toString(),
            initialShortTokenAmount.toString()
          );
          throw Error('Not enough amounts for deposit');
        }
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-glv-deposit',
      onSentMessage: t`Creating GLV deposit...`,
      message: t`GLV deposit created.`,
    },
    invoker as (arg: {
      skipPreflight: boolean;
      operation: Operation;
      mode: Mode;
      glvInfo: GlvInfo;
      marketTokenAddressForGlv: Address;
      initialLongTokenAddress: Address;
      initialShortTokenAddress: Address;
      marketTokenAmount: BN;
      initialLongTokenAmount: BN;
      initialShortTokenAmount: BN;
      isMarketTokenDeposit: boolean;
    }) => Promise<string>,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}

const fixUnnecessarySwap = ({
  glvInfo,
  initialLongTokenAddress,
  initialShortTokenAddress,
}: {
  glvInfo: GlvInfo;
  initialLongTokenAddress: PublicKey;
  initialShortTokenAddress: PublicKey;
}) => {
  if (
    isSameTokenAddress(initialLongTokenAddress, glvInfo.shortTokenAddress) &&
    isSameTokenAddress(initialShortTokenAddress, glvInfo.longTokenAddress)
  ) {
    return {
      fixedInitialLongTokenAddress: initialShortTokenAddress,
      fixedInitialShortTokenAddress: initialLongTokenAddress,
    };
  } else {
    return {
      fixedInitialLongTokenAddress: initialLongTokenAddress,
      fixedInitialShortTokenAddress: initialShortTokenAddress,
    };
  }
};
