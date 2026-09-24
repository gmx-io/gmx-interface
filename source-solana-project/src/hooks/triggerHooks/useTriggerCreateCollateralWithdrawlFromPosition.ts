import { BN_10 } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import {
  NATIVE_TOKEN_ADDRESS,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
} from '@/config/tokens';
import { useCompetitionProgram, useStoreProgram } from '@/contexts/anchor';
import { useTriggerInvocation } from '@/hooks/triggerHooks/useTriggerInvocation';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { competitionId, lookupTables } from '@/utils/constants';
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
import { invokeCreateDecreaseOrder, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateCollateralWithdrawlFromPosition() {
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
      isPosition,
      isMarket,
      isIncrease,
      skipPreflight,
      positionAddress,
      decreaseAmountsSizeDeltaUsd,
      decreaseAmountsInitialCollateralAmount,
      decreaseAmountsAcceptablePrice,
      indexTokenDecimals,
      receiveTokenAddress,
      decreaseOrderSwapPath,
    }: {
      isPosition: boolean;
      isMarket: boolean;
      isIncrease: boolean;
      skipPreflight: boolean;
      positionAddress: Address | undefined;
      decreaseAmountsSizeDeltaUsd: BN | undefined;
      decreaseAmountsInitialCollateralAmount: BN | undefined;
      decreaseAmountsAcceptablePrice: BN | undefined;
      indexTokenDecimals: number | undefined;
      receiveTokenAddress: Address | undefined;
      decreaseOrderSwapPath: Address[] | undefined;
    }): Promise<string> => {
      const user = store.provider.publicKey;

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw new Error('Wallet not connected');
      }
      if (!positionAddress) {
        helperNotice.error(t`Please select a position`);
        throw new Error('Position not selected');
      }
      if (!decreaseAmountsSizeDeltaUsd) {
        helperNotice.error(t`Please enter size delta`);
        throw new Error('Size delta not specified');
      }
      if (!decreaseAmountsInitialCollateralAmount) {
        helperNotice.error(t`Please enter initial collateral amount`);
        throw new Error('Initial collateral amount not specified');
      }
      if (!indexTokenDecimals) {
        helperNotice.error(t`Please select index token`);
        throw new Error('Index token not selected');
      }
      if (!receiveTokenAddress) {
        helperNotice.error(t`Please select receive token`);
        throw new Error('Receive token not selected');
      }

      const acceptablePriceAdjusted = decreaseAmountsAcceptablePrice?.div(
        BN_10.pow(new BN(indexTokenDecimals))
      );

      if (isPosition && isMarket && !isIncrease) {
        const [signature, order] = await invokeCreateDecreaseOrder(
          store,
          {
            store: GMX_SOLANA_STORE_ADDRESS,
            owner: user,
            position: translateAddress(positionAddress),
            initialCollateralDeltaAmount: toBigInt(
              decreaseAmountsInitialCollateralAmount
            ),
            sizeDeltaUsd: toBigInt(decreaseAmountsSizeDeltaUsd),
            options: {
              swapPath: decreaseOrderSwapPath?.map(translateAddress),
              acceptablePrice: acceptablePriceAdjusted
                ? toBigInt(acceptablePriceAdjusted)
                : undefined,
              finalOutputToken: translateAddress(receiveTokenAddress).equals(
                NATIVE_TOKEN_ADDRESS
              )
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : translateAddress(receiveTokenAddress),
              skipNativeTokenUnwrap: translateAddress(
                receiveTokenAddress
              ).equals(WRAPPED_NATIVE_TOKEN_ADDRESS),
            },
            // competitionId: competitionId,
            // competitionProgram: competitionProgram,
          },
          {
            skipPreflight,
            computeUnits,
            computeUnitPrice,
            // lookupTables: lookupTables
          }
        );
        console.log(
          `created a decrease order ${order.toBase58()} at tx ${signature}`
        );
        return signature;
      } else {
        helperNotice.error(t`Failed to withdraw collateral from position`);
        throw Error('Failed to withdraw collateral from position');
      }
    },
    [store, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'exchange-create-collateral-withdrawl-from-position',
      onSentMessage: t`Withdrawing collateral from position...`,
      message: t`Collateral successfully withdrawn from position.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
