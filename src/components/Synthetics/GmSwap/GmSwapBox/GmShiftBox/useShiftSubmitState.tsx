import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo, type Dispatch, type SetStateAction } from "react";

import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useHasOutdatedUi } from "domain/legacy";
import type { MarketInfo } from "domain/synthetics/markets/types";
import type { TokenData } from "domain/synthetics/tokens/types";
import type { GmSwapFees } from "domain/synthetics/trade/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { getCommonError, getGmShiftError } from "domain/synthetics/trade/utils/validation";

export function useShiftSubmitState({
  selectedMarketInfo,
  selectedToken,
  amounts,
  toMarketInfo,
  toToken,
  fees,
  isHighPriceImpact,
  isHighPriceImpactAccepted,
  setIsConfirmationBoxVisible,
  shouldDisableValidationForTesting,
}: {
  selectedMarketInfo: MarketInfo | undefined;
  selectedToken: TokenData | undefined;
  amounts: ShiftAmounts | undefined;
  toMarketInfo: MarketInfo | undefined;
  toToken: TokenData | undefined;
  fees: GmSwapFees | undefined;
  isHighPriceImpact: boolean;
  isHighPriceImpactAccepted: boolean;
  setIsConfirmationBoxVisible: Dispatch<SetStateAction<boolean>>;
  shouldDisableValidationForTesting: boolean;
}) {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const { data: hasOutdatedUi } = useHasOutdatedUi();

  const { openConnectModal } = useConnectModal();

  return useMemo(() => {
    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: () => openConnectModal?.(),
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
      isHighPriceImpact: isHighPriceImpact,
      isHighPriceImpactAccepted,
      priceImpactUsd: amounts?.swapPriceImpactDeltaUsd,
    })[0];

    const error = commonError || shiftError;

    const onSubmit = () => {
      setIsConfirmationBoxVisible(true);
    };

    if (error) {
      return {
        text: error,
        error,
        isDisabled: !shouldDisableValidationForTesting,
        onSubmit,
      };
    }

    return {
      text: t`Shift GM`,
      onSubmit,
    };
  }, [
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
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    openConnectModal,
    setIsConfirmationBoxVisible,
    shouldDisableValidationForTesting,
  ]);
}
