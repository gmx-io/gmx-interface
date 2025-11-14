import { useCallback, useState } from "react";

import { selectPoolsDetailsOperation } from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { ExecutionFee } from "domain/synthetics/fees";
import type { SourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import type { SourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { SourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { SourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";

import { useDepositTransactions } from "./useDepositTransactions";
import { useWithdrawalTransactions } from "./useWithdrawalTransactions";
import { Operation } from "../../types";

export interface UseLpTransactionProps {
  shouldDisableValidation?: boolean;
  technicalFees:
    | ExecutionFee
    | SourceChainGlvDepositFees
    | SourceChainDepositFees
    | SourceChainWithdrawalFees
    | SourceChainGlvWithdrawalFees
    | undefined;
}

export const useLpTransactions = (
  props: UseLpTransactionProps
): {
  onSubmit: () => void;
  isSubmitting: boolean;
} => {
  const operation = useSelector(selectPoolsDetailsOperation);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { onCreateDeposit } = useDepositTransactions({
    shouldDisableValidation: props.shouldDisableValidation,
    technicalFees: props.technicalFees,
  });

  const { onCreateWithdrawal } = useWithdrawalTransactions({
    shouldDisableValidation: props.shouldDisableValidation,
    technicalFees: props.technicalFees,
  });

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
