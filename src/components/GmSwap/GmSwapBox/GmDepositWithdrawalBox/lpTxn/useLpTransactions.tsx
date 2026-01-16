import { useCallback, useState } from "react";

import { selectPoolsDetailsOperation } from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { Operation } from "domain/synthetics/markets/types";

import { useDepositTransactions } from "./useDepositTransactions";
import { useWithdrawalTransactions } from "./useWithdrawalTransactions";

export interface UseLpTransactionProps {
  shouldDisableValidation?: boolean;
  technicalFees: TechnicalGmFees | undefined;
}

export const useLpTransactions = (
  props: UseLpTransactionProps
): {
  onSubmit: () => void;
  isSubmitting: boolean;
  error: Error | undefined;
  isLoading: boolean;
} => {
  const operation = useSelector(selectPoolsDetailsOperation);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    onCreateDeposit,
    error: depositError,
    isLoading: isDepositLoading,
  } = useDepositTransactions({
    shouldDisableValidation: props.shouldDisableValidation,
    technicalFees: props.technicalFees,
  });

  const {
    onCreateWithdrawal,
    error: withdrawalError,
    isLoading: isWithdrawalLoading,
  } = useWithdrawalTransactions({
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
    error: operation === Operation.Deposit ? depositError : withdrawalError,
    isLoading: operation === Operation.Deposit ? isDepositLoading : isWithdrawalLoading,
  };
};
