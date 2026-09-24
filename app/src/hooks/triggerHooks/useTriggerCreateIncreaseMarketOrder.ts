import { BN_10, lookupTables } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
import { useCompetitionProgram, useStoreProgram } from '@/contexts/anchor';
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
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PublicKey } from '@solana/web3.js';
import { invokeCreateIncreaseOrder, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateIncreaseMarketOrder() {
  const store = useStoreProgram();
  const competitionProgram = useCompetitionProgram();
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
      isLong,
      isIncrease,
      skipPreflight,
      marketTokenAddress,
      collateralTokenAddress,
      initialCollateralTokenAddress,
      increaseAmountsInitialCollateralAmount,
      increaseAmountsSizeDeltaUsd,
      increaseOrderSwapPath,
      indexTokenDecimals,
      increaseAmountsAcceptablePrice,
      isAddCompetition,
      competitionId,
    }: {
      isMarket: boolean;
      isLong: boolean;
      isIncrease: boolean;
      skipPreflight: boolean;
      marketTokenAddress: Address | undefined;
      collateralTokenAddress: Address | undefined;
      initialCollateralTokenAddress: Address | undefined;
      increaseAmountsInitialCollateralAmount: BN | undefined;
      increaseAmountsSizeDeltaUsd: BN | undefined;
      increaseOrderSwapPath: Address[] | undefined;
      indexTokenDecimals: number | undefined;
      increaseAmountsAcceptablePrice: BN | undefined;
      isAddCompetition?: boolean;
      competitionId?: PublicKey;
    }): Promise<string> => {
      console.log('useTriggerCreateIncreaseMarketOrder', isAddCompetition);
      if (!store || !store.provider) {
        throw new Error('Store program not initialized');
      }
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw new Error('Wallet not connected');
      }
      if (!marketTokenAddress) {
        helperNotice.error(t`Please select a market`);
        throw new Error('Market not selected');
      }
      if (!collateralTokenAddress) {
        helperNotice.error(t`Please select collateral token`);
        throw new Error('Collateral token not selected');
      }
      if (!initialCollateralTokenAddress) {
        helperNotice.error(t`Please select initial collateral token`);
        throw new Error('Initial collateral token not selected');
      }
      if (!increaseAmountsInitialCollateralAmount) {
        helperNotice.error(t`Please enter initial collateral amount`);
        throw new Error('Initial collateral amount not specified');
      }
      if (!increaseAmountsSizeDeltaUsd) {
        helperNotice.error(t`Please enter size delta`);
        throw new Error('Size delta not specified');
      }
      if (!indexTokenDecimals) {
        helperNotice.error(t`Please select index token`);
        throw new Error('Index token not selected');
      }

      const acceptablePriceAdjusted = increaseAmountsAcceptablePrice?.div(
        BN_10.pow(new BN(indexTokenDecimals))
      );

      if (isMarket && isIncrease) {
        console.log(
          'invokeCreateIncreaseOrder isMarket && isIncrease',
          isAddCompetition
        );
        const [signature, order] = await invokeCreateIncreaseOrder(
          store,
          {
            store: GMX_SOLANA_STORE_ADDRESS,
            owner: user,
            marketToken: translateAddress(marketTokenAddress),
            collateralToken: translateAddress(collateralTokenAddress),
            isLong,
            initialCollateralDeltaAmount: toBigInt(
              increaseAmountsInitialCollateralAmount
            ),
            sizeDeltaUsd: toBigInt(increaseAmountsSizeDeltaUsd),
            options: {
              swapPath: increaseOrderSwapPath?.map(translateAddress),
              initialCollateralToken: translateAddress(
                initialCollateralTokenAddress
              ).equals(NATIVE_TOKEN_ADDRESS)
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : translateAddress(initialCollateralTokenAddress),
              acceptablePrice: acceptablePriceAdjusted
                ? toBigInt(acceptablePriceAdjusted)
                : undefined,
              shouldWrapNativeToken: isNativeToken(
                initialCollateralTokenAddress
              ),
            },
            competitionId: isAddCompetition ? competitionId : null,
            competitionProgram: isAddCompetition ? competitionProgram : null,
          },
          {
            skipPreflight,
            computeUnits,
            computeUnitPrice,
            lookupTables: lookupTables,
          }
        );
        console.log(
          `created increase order ${order.toBase58()} at tx ${signature}`
        );
        return signature;
      } else {
        helperNotice.error(t`Failed to create increase market order`);
        throw new Error('Failed to create increase market order');
      }
    },
    [store, competitionProgram, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'create-increase-market-order',
      onSentMessage: t`Creating market increase order...`,
      message: t`Market increase order created.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
