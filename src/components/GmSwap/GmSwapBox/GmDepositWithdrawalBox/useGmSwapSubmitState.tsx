import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";

import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsOperation,
} from "context/PoolsDetailsContext/selectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { GlvAndGmMarketsInfoData, MarketsInfoData } from "domain/synthetics/markets";
import { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import { Operation } from "domain/synthetics/markets/types";
import useWallet from "lib/wallets/useWallet";
import { GmSwapFees } from "sdk/utils/trade/types";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { useLpTransactions } from "./lpTxn/useLpTransactions";
import { useTokensToApprove } from "./useTokensToApprove";

interface Props {
  longTokenLiquidityUsd?: bigint | undefined;
  shortTokenLiquidityUsd?: bigint | undefined;
  shouldDisableValidation?: boolean;
  technicalFees: TechnicalGmFees | undefined;
  technicalFeesError: Error | undefined;
  logicalFees: GmSwapFees | undefined;
  marketsInfoData?: MarketsInfoData;
  glvAndMarketsInfoData: GlvAndGmMarketsInfoData;
}

const processingTextMap = {
  [Operation.Deposit]: (symbol: string) => t`Buying ${symbol}...`,
  [Operation.Withdrawal]: (symbol: string) => t`Selling ${symbol}...`,
  [Operation.Shift]: (symbol: string) => t`Shifting ${symbol}...`,
};

type SubmitButtonState = {
  text: React.ReactNode;
  disabled?: boolean;
  onSubmit?: () => void;
  tokensToApprove?: string[];
  isAllowanceLoaded?: boolean;
  isAllowanceLoading?: boolean;
  errorDescription?: string;
  bannerErrorContent?: React.ReactNode;
};

export const useGmSwapSubmitState = ({ shouldDisableValidation, technicalFees }: Props): SubmitButtonState => {
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);
  const operation = useSelector(selectPoolsDetailsOperation);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);

  const { isSubmitting, onSubmit } = useLpTransactions({
    shouldDisableValidation,
    technicalFees,
  });

  const { openConnectModal } = useConnectModal();
  const { account } = useWallet();

  const onConnectAccount = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  const { approve, isAllowanceLoaded, isAllowanceLoading, tokensToApproveSymbols, isApproving } = useTokensToApprove();

  return useMemo((): SubmitButtonState => {
    if (!account) {
      return {
        text: t`Connect wallet`,
        onSubmit: onConnectAccount,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: (
          <>
            <Trans>Loading...</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isApproving && tokensToApproveSymbols.length) {
      return {
        text: (
          <>
            {t`Approve ${tokensToApproveSymbols[0]}`} <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApproveSymbols.length > 0) {
      const onApprove = approve;

      return {
        text: t`Approve ${tokensToApproveSymbols[0]}`,
        onSubmit: onApprove,
      };
    }

    const operationTokenSymbol = glvInfo ? "GLV" : "GM";

    if (isSubmitting) {
      return {
        text: processingTextMap[operation](operationTokenSymbol),
        disabled: true,
      };
    }

    return {
      text: isDeposit ? t`Buy ${operationTokenSymbol}` : t`Sell ${operationTokenSymbol}`,
      onSubmit,
    };
  }, [
    account,
    isAllowanceLoading,
    isApproving,
    tokensToApproveSymbols,
    isAllowanceLoaded,
    glvInfo,
    isSubmitting,
    isDeposit,
    onSubmit,
    onConnectAccount,
    approve,
    operation,
  ]);
};
