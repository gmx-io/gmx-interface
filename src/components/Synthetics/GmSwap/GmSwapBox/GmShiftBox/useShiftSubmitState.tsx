import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import uniq from "lodash/uniq";
import { useMemo, useState, useEffect } from "react";
import { ImSpinner2 } from "react-icons/im";

import { getContract } from "config/contracts";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExecutionFee } from "domain/synthetics/fees";
import type { GlvOrMarketInfo, MarketInfo } from "domain/synthetics/markets/types";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import type { TokenData, TokensData } from "domain/synthetics/tokens/types";
import type { ShiftAmounts } from "domain/synthetics/trade/utils/shift";
import { getCommonError, getGmShiftError } from "domain/synthetics/trade/utils/validation";
import { approveTokens } from "domain/tokens";
import { useHasOutdatedUi } from "lib/useHasOutdatedUi";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";
import type { GmSwapFees } from "sdk/types/trade";

import { useShiftTransactions } from "./useShiftTransactions";
import { getGmSwapBoxApproveTokenSymbol } from "../getGmSwapBoxApproveToken";

export function useShiftSubmitState({
  amounts,
  executionFee,
  fees,
  marketTokenUsd,
  payTokenAddresses,
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
  payTokenAddresses: string[];
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
  const { signer } = useWallet();

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

      if (
        selectedToken &&
        getNeedTokenApprove(tokensAllowanceData, selectedToken.address, amounts?.fromTokenAmount, [])
      ) {
        addresses.push(selectedToken.address);
      }

      return uniq(addresses);
    },
    [selectedToken, amounts?.fromTokenAmount, tokensAllowanceData]
  );

  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!tokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove]);

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
            {t`Allow ${tokenSymbol} to be spent`} <ImSpinner2 className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    }

    if (isAllowanceLoaded && tokensToApprove.length > 0) {
      const onApprove = () => {
        const tokenAddress = tokensToApprove[0];

        if (!chainId || isApproving || !tokenAddress) return;

        userAnalytics.pushEvent<TokenApproveClickEvent>({
          event: "TokenApproveAction",
          data: {
            action: "ApproveClick",
          },
        });

        approveTokens({
          setIsApproving,
          signer,
          tokenAddress,
          spender: getContract(chainId, "SyntheticsRouter"),
          pendingTxns: [],
          setPendingTxns: () => null,
          infoTokens: {},
          chainId,
          approveAmount: undefined,
          onApproveFail: () => {
            userAnalytics.pushEvent<TokenApproveResultEvent>({
              event: "TokenApproveAction",
              data: {
                action: "ApproveFail",
              },
            });
          },
          permitParams: undefined,
        });
      };

      const address = tokensToApprove[0];
      const tokenSymbol = getGmSwapBoxApproveTokenSymbol(address, tokensData, glvOrMarketInfoData);

      return {
        text: t`Allow ${tokenSymbol} to be spent`,
        onSubmit: onApprove,
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
    signer,
  ]);
}
