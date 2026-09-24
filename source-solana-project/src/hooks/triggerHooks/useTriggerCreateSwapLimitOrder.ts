import { BN_10 } from '@/config/constants';
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

export function useTriggerCreateSwapLimitOrder() {
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
      isLimit,
      isSwap,
      skipPreflight,
      indexTokenDecimals,
      swapMarketTokenAddress,
      swapInitialCollateralTokenAddress,
      swapOutTokenAddress,
      amountIn,
      minOutputAmount,
      swapAmountsTriggerRatio,
      swapOrderSwapPath,
    }: {
      isLimit: boolean;
      isSwap: boolean;
      skipPreflight: boolean;
      indexTokenDecimals: number | undefined;
      swapMarketTokenAddress: Address | undefined;
      swapInitialCollateralTokenAddress: Address | undefined;
      swapOutTokenAddress: Address | undefined;
      swapOrderSwapPath: Address[] | undefined;
      amountIn: BN | undefined;
      minOutputAmount: BN | undefined;
      swapAmountsTriggerRatio: BN | undefined;
    }): Promise<string> => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw Error('Wallet is not connected');
      }
      if (!indexTokenDecimals) {
        helperNotice.error(t`Index token decimals is not set`);
        throw Error('Index token decimals is not set');
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
      if (!minOutputAmount) {
        helperNotice.error(t`Min output amount is not set`);
        throw Error('Min output amount is not set');
      }
      if (!swapAmountsTriggerRatio) {
        helperNotice.error(t`Swap amount trigger ratio is not set`);
        throw Error('Swap amount trigger ratio is not set');
      }
      if (!swapInitialCollateralTokenAddress) {
        helperNotice.error(t`Swap initial collateral token address is not set`);
        throw Error('Swap initial collateral token address is not set');
      }
      if (!swapOrderSwapPath) {
        helperNotice.error(t`Swap order swap path is not set`);
        throw Error('Swap order swap path is not set');
      }

      const triggerRatioAdjusted = swapAmountsTriggerRatio.div(
        BN_10.pow(new BN(indexTokenDecimals))
      );

      if (isSwap && isLimit) {
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
              limit: true,
              minOutputAmount: toBigInt(minOutputAmount),
              acceptablePrice: toBigInt(triggerRatioAdjusted),
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
        console.log(`created swap limit order at tx ${signature}`);
        return signature;
      } else {
        helperNotice.error(t`Failed to create swap limit order`);
        throw Error('Failed to create swap limit order');
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-swap-limit-order',
      onSentMessage: t`Creating swap limit order...`,
      message: t`Swap limit order created.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
