import { BN_10, BN_ZERO, lookupTables } from '@/config/constants';
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
import { Address, BN, translateAddress } from '@coral-xyz/anchor';
import { t } from '@lingui/macro';
import { PublicKey } from '@solana/web3.js';
import { invokeCreateDecreaseOrder, toBigInt } from 'gmsol';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';

export function useTriggerCreateDecreaseLimitOrder() {
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
      isLimit,
      isIncrease,
      skipPreflight,
      positionAddress,
      indexTokenDecimals,
      decreaseAmountsTriggerPrice,
      decreaseAmountsAcceptablePrice,
      decreaseAmountsSizeDeltaUsd,
      decreaseAmountsCollateralDeltaAmount,
      receiveTokenAddress,
      decreaseOrderSwapPath,
      isAddCompetition,
      competitionId,
    }: {
      skipPreflight: boolean;
      isPosition: boolean;
      isLimit: boolean;
      isIncrease: boolean;
      positionAddress: Address | undefined;
      indexTokenDecimals: number | undefined;
      decreaseAmountsTriggerPrice: BN | undefined;
      decreaseAmountsAcceptablePrice: BN | undefined;
      decreaseAmountsSizeDeltaUsd: BN | undefined;
      decreaseAmountsCollateralDeltaAmount: BN | undefined;
      receiveTokenAddress: Address | undefined;
      decreaseOrderSwapPath: Address[] | undefined;
      isAddCompetition?: boolean;
      competitionId?: PublicKey;
    }): Promise<string> => {
      const user = store.provider.publicKey;
      console.log('useTriggerCreateDecreaseLimitOrder', isAddCompetition);

      if (!user) {
        helperNotice.error(t`Wallet is not connected`);
        throw new Error('Wallet not connected');
      }
      if (!positionAddress) {
        helperNotice.error(t`Please select a position`);
        throw new Error('Position not selected');
      }
      if (!indexTokenDecimals) {
        helperNotice.error(t`Please enter index token decimals`);
        throw new Error('Index token decimals not specified');
      }
      if (!decreaseAmountsTriggerPrice) {
        helperNotice.error(t`Please enter trigger price`);
        throw new Error('Trigger price not specified');
      }
      if (!decreaseAmountsAcceptablePrice) {
        helperNotice.error(t`Please enter acceptable price`);
        throw new Error('Acceptable price not specified');
      }
      if (!decreaseAmountsSizeDeltaUsd) {
        helperNotice.error(t`Please enter size delta`);
        throw new Error('Size delta not specified');
      }
      if (!receiveTokenAddress) {
        helperNotice.error(t`Please select receive token`);
        throw new Error('Receive token not selected');
      }

      const triggerPriceAdjusted = decreaseAmountsTriggerPrice.div(
        BN_10.pow(new BN(indexTokenDecimals))
      );
      const acceptablePriceAdjusted = decreaseAmountsAcceptablePrice.div(
        BN_10.pow(new BN(indexTokenDecimals))
      );

      if (isPosition && isLimit && !isIncrease) {
        const [signature, order] = await invokeCreateDecreaseOrder(
          store,
          {
            store: GMX_SOLANA_STORE_ADDRESS,
            owner: user,
            position: translateAddress(positionAddress),
            initialCollateralDeltaAmount: toBigInt(
              decreaseAmountsCollateralDeltaAmount || BN_ZERO
            ),
            sizeDeltaUsd: toBigInt(decreaseAmountsSizeDeltaUsd),
            options: {
              swapPath: decreaseOrderSwapPath?.map(translateAddress),
              decreaseSwapType: 'pnlTokenToCollateralToken',
              triggerPrice: toBigInt(triggerPriceAdjusted),
              acceptablePrice: toBigInt(acceptablePriceAdjusted),
              finalOutputToken: translateAddress(receiveTokenAddress).equals(
                NATIVE_TOKEN_ADDRESS
              )
                ? WRAPPED_NATIVE_TOKEN_ADDRESS
                : translateAddress(receiveTokenAddress),
              skipNativeTokenUnwrap: translateAddress(
                receiveTokenAddress
              ).equals(WRAPPED_NATIVE_TOKEN_ADDRESS),
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
          `created a decrease order ${order.toBase58()} at tx ${signature}`
        );
        return signature;
      } else {
        helperNotice.error(t`Failed to create decrease limit order`);
        throw Error('Failed to create decrease limit order');
      }
    },
    [store, competitionProgram, computeUnits, computeUnitPrice]
  );

  const { trigger, isSending } = useTriggerInvocation(
    {
      key: 'exchange-create-decrease-limit-order',
      onSentMessage: t`Creating decrease limit order...`,
      message: t`Decrease limit order created.`,
    },
    invoker,
    {
      onSuccess: mutateStates,
    }
  );

  return { trigger, isSending };
}
