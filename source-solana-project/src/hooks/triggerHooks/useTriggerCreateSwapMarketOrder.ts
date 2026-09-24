import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
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
import { isNativeToken } from '@/utils/token/isNativeToken';
import { isWrappedNativeToken } from '@/utils/token/isWrappedNativeToken';
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { invokeCreateSwapOrder, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateSwapMarketOrder() {
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
      isMarket,
      isSwap,
      skipPreflight,
      swapMarketTokenAddress,
      swapInitialCollateralTokenAddress,
      swapOutTokenAddress,
      swapOrderSwapPath,
      amountIn,
    }: {
      skipPreflight: boolean;
      isMarket: boolean;
      isSwap: boolean;
      swapMarketTokenAddress: Address | undefined;
      swapInitialCollateralTokenAddress: Address | undefined;
      swapOutTokenAddress: Address | undefined;
      swapOrderSwapPath: Address[] | undefined;
      amountIn: BN | undefined;
    }): Promise<string> => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (!swapInitialCollateralTokenAddress) {
        helperNotice.error(t`Swap initial collateral token address is not set`);
        throw Error('Swap initial collateral token address is not set');
      }
      if (!swapMarketTokenAddress) {
        helperNotice.error(t`Swap market token address is not set`);
        throw Error('Swap market token address is not set');
      }
      if (!swapOutTokenAddress) {
        helperNotice.error(t`Swap out token address is not set`);
        throw Error('Swap out token address is not set');
      }
      if (!amountIn) {
        helperNotice.error(t`Amount in is not set`);
        throw Error('Amount in is not set');
      }
      if (!swapOrderSwapPath) {
        helperNotice.error(t`Swap order swap path is not set`);
        throw Error('Swap order swap path is not set');
      }

      if (isSwap && isMarket) {
        const [signature] = await invokeCreateSwapOrder(
          store,
          {
            store: GMX_SOLANA_STORE_ADDRESS,
            owner: user,
            marketToken: translateAddress(swapMarketTokenAddress),
            swapOutToken: translateAddress(swapOutTokenAddress).equals(
              NATIVE_TOKEN_ADDRESS
            )
              ? WRAPPED_NATIVE_TOKEN_ADDRESS
              : translateAddress(swapOutTokenAddress),
            initialSwapInToken: translateAddress(
              swapInitialCollateralTokenAddress
            ).equals(NATIVE_TOKEN_ADDRESS)
              ? WRAPPED_NATIVE_TOKEN_ADDRESS
              : translateAddress(swapInitialCollateralTokenAddress),
            initialSwapInTokenAmount: toBigInt(amountIn),
            swapPath: swapOrderSwapPath.map(translateAddress),
            options: {
              skipNativeTokenUnwrap: isWrappedNativeToken(swapOutTokenAddress),
              shouldWrapNativeToken: isNativeToken(
                swapInitialCollateralTokenAddress
              ),
            },
          },
          {
            skipPreflight,
            computeUnits,
            computeUnitPrice,
          }
        );
        console.log(`created swap market order at tx ${signature}`);
        return signature;
      } else {
        helperNotice.error(t`Failed to create swap market order`);
        throw Error('Failed to create swap market order');
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-swap-market-order',
      onSentMessage: t`Creating swap market order...`,
      message: t`Swap market order created.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
