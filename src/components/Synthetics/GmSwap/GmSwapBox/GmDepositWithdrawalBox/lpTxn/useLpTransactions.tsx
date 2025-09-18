import { useCallback, useState } from "react";

import { ExecutionFee } from "domain/synthetics/fees";
import { GlvInfo, MarketInfo } from "domain/synthetics/markets";
import { TokenData, TokensData } from "domain/synthetics/tokens";

import { Operation } from "../../types";
import type { GmPaySource } from "../types";
import { useDepositTransactions } from "./useDepositTransactions";
import { useWithdrawalTransactions } from "./useWithdrawalTransactions";

export interface UseLpTransactionProps {
  marketInfo?: MarketInfo;
  glvInfo?: GlvInfo;
  marketToken: TokenData | undefined;
  operation: Operation;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;

  marketTokenAmount: bigint | undefined;
  marketTokenUsd: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;

  glvTokenAmount: bigint | undefined;
  glvTokenUsd: bigint | undefined;

  shouldDisableValidation?: boolean;

  tokensData: TokensData | undefined;
  executionFee: ExecutionFee | undefined;
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
