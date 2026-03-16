import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import type { GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { getCommonError, getGmShiftError } from "domain/synthetics/trade/utils/validation";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import type { GmSwapFees } from "sdk/utils/trade/types";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { useShiftTransactions } from "./useShiftTransactions";
import { getGmSwapBoxApproveTokenSymbol } from "../getGmSwapBoxApproveToken";

export function useShiftSubmitState({
  amounts,
  executionFee,
  fees,
  marketTokenUsd,
  routerAddress,
  selectedMarketInfo,
  selectedToken,
  shouldDisableValidationForTesting,
  tokensData,
  toMarketInfo,
  toToken,
  glvOrMarketInfoData,
}: {
  amounts: ShiftAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  fees: GmSwapFees | undefined;
  marketTokenUsd: bigint | undefined;
  routerAddress: string;
  selectedMarketInfo: MarketInfo | undefined;
  selectedToken: TokenData | undefined;
  shouldDisableValidationForTesting: boolean;
  tokensData: TokensData | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
  glvOrMarketInfoData: { [key: string]: GlvOrMarketInfo } | undefined;
}) {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const hasOutdatedUi = useHasOutdatedUi();

  const { openConnectModal } = useConnectModal();

  const { isSubmitting, onSubmit } = useShiftTransactions({
    fromMarketToken: selectedToken,
    fromMarketTokenAmount: amounts?.fromTokenAmount,
    fromMarketTokenUsd: amounts?.fromTokenUsd,
    marketToken: toToken,
    marketTokenAmount: amounts?.toTokenAmount,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData,
    executionFee,
    marketTokenUsd,
  });

  const tokens = useMemo(
    () => (selectedToken ? [{ tokenAddress: selectedToken.address, amount: amounts?.fromTokenAmount }] : []),
    [selectedToken, amounts?.fromTokenAmount]
  );

  const { tokensToApprove, isApproving, isAllowanceLoading, isAllowanceLoaded, handleApprove } = useTokenApproval({
    chainId,
    spenderAddress: routerAddress,
    tokens,
  });

  return useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Submitting...`,
        disabled: true,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (!account) {
      return {
        text: t`Connect wallet`,
        onSubmit: () => openConnectModal?.(),
      };
    }

    // TODO: potential bug - ValidationResult is not a tuple, [0] indexing is incorrect
    // @ts-expect-error ValidationResult is not indexable by number
    const commonError = getCommonError({
      chainId,
      isConnected: true,
      hasOutdatedUi,
    })[0];

    // TODO: potential bug - ValidationResult is not a tuple, [0] indexing is incorrect
    // @ts-expect-error ValidationResult is not indexable by number
    const shiftError = getGmShiftError({
      fromMarketInfo: selectedMarketInfo,
      fromToken: selectedToken,
      fromTokenAmount: amounts?.fromTokenAmount,
      fromTokenUsd: amounts?.fromTokenUsd,
      fromLongTokenAmount: amounts?.fromLongTokenAmount,
      fromShortTokenAmount: amounts?.fromShortTokenAmount,
      toMarketInfo: toMarketInfo,
      toToken: toToken,
      toTokenAmount: amounts?.toTokenAmount,
      fees,
      priceImpactUsd: amounts?.swapPriceImpactDeltaUsd,
    })[0];

    const error = commonError || shiftError;

    if (error) {
      return {
        text: error,
        error,
        disabled: !shouldDisableValidationForTesting,
        onSubmit,
      };
    }

    if (isApproving && tokensToApprove.length) {
      const address = tokensToApprove[0];
      const tokenSymbol = getGmSwapBoxApproveTokenSymbol(address, tokensData, glvOrMarketInfoData);

      return {
        text: (
          <>
            {t`Approve ${tokenSymbol}`} <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length > 0) {
      const address = tokensToApprove[0];
      const tokenSymbol = getGmSwapBoxApproveTokenSymbol(address, tokensData, glvOrMarketInfoData);

      return {
        text: t`Approve ${tokenSymbol}`,
        onSubmit: () => {
          userAnalytics.pushEvent<TokenApproveClickEvent>({
            event: "TokenApproveAction",
            data: { action: "ApproveClick" },
          });
          handleApprove({
            onApproveFail: () =>
              userAnalytics.pushEvent<TokenApproveResultEvent>({
                event: "TokenApproveAction",
                data: { action: "ApproveFail" },
              }),
          });
        },
      };
    }

    return {
      text: t`Shift GM`,
      onSubmit,
      tokensToApprove,
    };
  }, [
    isSubmitting,
    isAllowanceLoading,
    account,
    chainId,
    hasOutdatedUi,
    selectedMarketInfo,
    selectedToken,
    amounts?.fromTokenAmount,
    amounts?.fromTokenUsd,
    amounts?.fromLongTokenAmount,
    amounts?.fromShortTokenAmount,
    amounts?.toTokenAmount,
    amounts?.swapPriceImpactDeltaUsd,
    toMarketInfo,
    toToken,
    fees,
    isApproving,
    tokensToApprove,
    isAllowanceLoaded,
    onSubmit,
    openConnectModal,
    shouldDisableValidationForTesting,
    tokensData,
    glvOrMarketInfoData,
    handleApprove,
  ]);
}
