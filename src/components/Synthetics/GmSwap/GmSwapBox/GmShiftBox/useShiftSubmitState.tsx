import { plural, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import uniq from "lodash/uniq";
import { useMemo } from "react";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import type { MarketInfo } from "domain/synthetics/markets/types";
import { getNeedTokenApprove, getTokenData, useTokensAllowanceData } from "domain/synthetics/tokens";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { getCommonError, getGmShiftError } from "domain/synthetics/trade/utils/validation";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import type { GmSwapFees } from "sdk/types/trade";


import { useShiftTransactions } from "./useShiftTransactions";

export function useShiftSubmitState({
  amounts,
  executionFee,
  fees,
  consentError,
  marketTokenUsd,
  payTokenAddresses,
  routerAddress,
  selectedMarketInfo,
  selectedToken,
  shouldDisableValidationForTesting,
  tokensData,
  toMarketInfo,
  toToken,
}: {
  amounts: ShiftAmounts | undefined;
  executionFee: ExecutionFee | undefined;
  fees: GmSwapFees | undefined;
  consentError: boolean;
  marketTokenUsd: bigint | undefined;
  payTokenAddresses: string[];
  routerAddress: string;
  selectedMarketInfo: MarketInfo | undefined;
  selectedToken: TokenData | undefined;
  shouldDisableValidationForTesting: boolean;
  tokensData: TokensData | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
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

  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoading,
    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
  });

  const tokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      if (selectedToken && getNeedTokenApprove(tokensAllowanceData, selectedToken.address, amounts?.fromTokenAmount)) {
        addresses.push(selectedToken.address);
      }

      return uniq(addresses);
    },
    [selectedToken, amounts?.fromTokenAmount, tokensAllowanceData]
  );

  return useMemo(() => {
    if (isSubmitting) {
      return {
        text: t`Submitting...`,
        disabled: true,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
      };
    }

    if (isAllowanceLoading) {
      return {
        text: t`Loading...`,
        disabled: true,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
      };
    }

    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: () => openConnectModal?.(),
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
      };
    }

    if (consentError) {
      return {
        text: t`Acknowledgment Required`,
        disabled: true,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length > 0 && selectedToken) {
      const symbols = tokensToApprove.map((address) => {
        const token = getTokenData(tokensData, address);
        return token?.symbol;
      });

      const symbolsText = symbols.join(", ");

      return {
        text: plural(symbols.length, {
          one: `Pending ${symbolsText} approval`,
          other: `Pending ${symbolsText} approvals`,
        }),
        disabled: true,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
      };
    }

    const commonError = getCommonError({
      chainId,
      isConnected: true,
      hasOutdatedUi,
    })[0];

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
      consentError,
      priceImpactUsd: amounts?.swapPriceImpactDeltaUsd,
    })[0];

    const error = commonError || shiftError;

    if (error) {
      return {
        text: error,
        error,
        disabled: !shouldDisableValidationForTesting,
        tokensToApprove,
        isAllowanceLoaded,
        isAllowanceLoading,
        onSubmit,
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
    isAllowanceLoaded,
    tokensToApprove,
    selectedToken,
    chainId,
    hasOutdatedUi,
    selectedMarketInfo,
    amounts,
    toMarketInfo,
    toToken,
    fees,
    consentError,
    onSubmit,
    openConnectModal,
    tokensData,
    shouldDisableValidationForTesting,
  ]);
}
