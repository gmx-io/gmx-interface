import { useCallback, useState } from "react";

import type { ExecutionFee } from "domain/synthetics/fees";
import type { MarketInfo } from "domain/synthetics/markets";
import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import type { GmPaySource } from "domain/synthetics/markets/types";
import type { TokensData } from "domain/synthetics/tokens";

import { useDepositTransactions } from "./useDepositTransactions";
import { useWithdrawalTransactions } from "./useWithdrawalTransactions";
import { Operation } from "../../types";

export interface UseLpTransactionProps {
  operation: Operation;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  longTokenSwapPath: string[] | undefined;
  shortTokenAmount: bigint | undefined;
  shortTokenSwapPath: string[] | undefined;

  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  technicalFees:
    | ExecutionFee
    | SourceChainGlvDepositFees
    | SourceChainDepositFees
    | SourceChainWithdrawalFees
    | SourceChainGlvWithdrawalFees
    | undefined;
  selectedMarketForGlv?: string;
  selectedMarketInfoForGlv?: MarketInfo;
  isMarketTokenDeposit?: boolean;
  isFirstBuy: boolean;
  paySource: GmPaySource;
}

export const useLpTransactions = (
  props: UseLpTransactionProps
): {
  onSubmit: () => void;
  isSubmitting: boolean;
} => {
  const { operation } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { onCreateDeposit } = useDepositTransactions(props);

  const { onCreateWithdrawal } = useWithdrawalTransactions(props);

  const onSubmit = useCallback(() => {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (operation === Operation.Deposit) {
      txnPromise = onCreateDeposit();
    } else if (operation === Operation.Withdrawal) {
      txnPromise = onCreateWithdrawal();
    } else {
      throw new Error("Invalid operation");
    }

    txnPromise
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [operation, onCreateDeposit, onCreateWithdrawal]);

  return {
    onSubmit,
    isSubmitting,
  };
};
