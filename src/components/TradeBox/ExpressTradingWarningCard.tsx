import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import {
  selectGmxAccountGasPaymentToken,
  selectSettlementChainGasPaymentToken,
} from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectTokensData,
  selectUpdateSubaccountSettings,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectSetShouldFallbackToInternalSwap,
  selectTradeboxCollateralToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIsFromTokenGmxAccount,
  selectTradeboxSelectSwapToToken,
  selectTradeboxState,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import {
  findGasPaymentTokenWithPositiveBalance,
  findNextGasPaymentToken,
} from "domain/synthetics/express/useSwitchGasPaymentTokenIfRequired";
import { getExternalAggregatorSwapUrl } from "domain/synthetics/externalSwaps/utils";
import { useChainId } from "lib/chains";
import { useGasPaymentTokensText } from "lib/gas/useGasPaymentTokensText";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import {
  DEFAULT_SUBACCOUNT_EXPIRY_DURATION,
  DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT,
  getGasPaymentTokens,
} from "sdk/configs/express";
import { getNativeToken, getWrappedToken } from "sdk/configs/tokens";
import { TradeMode } from "sdk/utils/trade/types";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";

import ExpressIcon from "img/ic_express.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";

import { useExpressTradingWarnings } from "./hooks/useShowOneClickTradingInfo";

export function ExpressTradingWarningCard({
  expressParams,
  payTokenAddress,
  isWrapOrUnwrap,
  disabled,
  isGmxAccount,
  onAfterAction,
  showExternalSwapWarnings = false,
}: {
  expressParams: ExpressTxnParams | undefined;
  payTokenAddress: string | undefined;
  isWrapOrUnwrap: boolean;
  disabled?: boolean;
  isGmxAccount: boolean;
  onAfterAction?: () => void;
  showExternalSwapWarnings?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const updateSubaccountSettings = useSelector(selectUpdateSubaccountSettings);
  const { setGasPaymentTokenAddress, setGmxAccountGasPaymentTokenAddress, setExpressOrdersEnabled } = useSettings();
  const subaccountContext = useSubaccountContext();
  const history = useHistory();

  const tokensData = useSelector(selectTokensData);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const swapToToken = useSelector(selectTradeboxSelectSwapToToken);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const isFromTokenGmxAccount = useSelector(selectTradeboxIsFromTokenGmxAccount);
  const gmxAccountGasPaymentToken = useSelector(selectGmxAccountGasPaymentToken);
  const settlementChainGasPaymentToken = useSelector(selectSettlementChainGasPaymentToken);
  const { setTradeMode } = useSelector(selectTradeboxState);

  const { chainId } = useChainId();

  const [, setNativeTokenWarningHidden] = useLocalStorageSerializeKey(
    EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
    false
  );

  const [, setWrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
    false
  );

  const handleCloseNativeTokenWarningClick = useCallback(() => {
    setNativeTokenWarningHidden(true);
    setIsVisible(false);
  }, [setNativeTokenWarningHidden]);

  const handleCloseWrapOrUnwrapWarningClick = useCallback(() => {
    setWrapOrUnwrapWarningHidden(true);
    setIsVisible(false);
  }, [setWrapOrUnwrapWarningHidden]);

  const handleUpdateSubaccountSettings = useCallback(() => {
    updateSubaccountSettings({
      nextRemainigActions: BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT),
      nextRemainingSeconds: BigInt(DEFAULT_SUBACCOUNT_EXPIRY_DURATION),
      nextIsGmxAccount: isGmxAccount,
    }).then((success) => {
      if (success) {
        onAfterAction?.();
        setIsVisible(false);
      }
    });
  }, [updateSubaccountSettings, isGmxAccount, onAfterAction]);

  const handleDisableSubaccount = useCallback(async () => {
    const ok = await subaccountContext.tryDisableSubaccount();
    if (ok) onAfterAction?.();
  }, [subaccountContext, onAfterAction]);

  const handleSwitchGasToken = useCallback(
    (tokenAddress: string) => {
      // No "gasPaymentTokenChanged" dispatch — its listener clears the pay input this switch is meant to unblock.
      if (isGmxAccount) {
        setGmxAccountGasPaymentTokenAddress(tokenAddress);
      } else {
        setGasPaymentTokenAddress(tokenAddress);
      }
      onAfterAction?.();
    },
    [isGmxAccount, setGmxAccountGasPaymentTokenAddress, setGasPaymentTokenAddress, onAfterAction]
  );

  const handleSwitchToClassic = useCallback(() => {
    setExpressOrdersEnabled(false);
    onAfterAction?.();
  }, [setExpressOrdersEnabled, onAfterAction]);

  const handleSwitchToMarketOrder = useCallback(() => {
    setTradeMode(TradeMode.Market);
    onAfterAction?.();
  }, [setTradeMode, onAfterAction]);

  const setShouldFallbackToInternalSwap = useSelector(selectSetShouldFallbackToInternalSwap);
  const handleRetryExternalSwap = useCallback(() => {
    setShouldFallbackToInternalSwap(false);
    onAfterAction?.();
  }, [setShouldFallbackToInternalSwap, onAfterAction]);

  const {
    shouldShowAllowedActionsWarning,
    shouldShowNativeTokenWarning,
    shouldShowWrapOrUnwrapWarning,
    shouldShowExpiredSubaccountWarning,
    shouldShowNonceExpiredWarning,
    shouldShowOutOfGasPaymentBalanceWarning,
    shouldShowSubaccountApprovalInvalidWarning,
    shouldShowSubaccountApprovalForAnotherNetworkWarning,
    shouldShowExternalSwapSubaccountBlockedWarning,
    shouldShowExternalSwapGasConflictRequiredWarning,
    shouldShowExternalSwapGasConflictOptionalWarning,
    shouldShowExternalSwapPausedByFailureWarning,
    shouldShowExternalSwapNoRouteWarning,
    shouldShowExternalSwapTwapNotSupportedWarning,
    dismissExpiredSubaccountWarning,
    dismissAllowedActionsWarning,
  } = useExpressTradingWarnings({
    expressParams,
    payTokenAddress,
    isWrapOrUnwrap,
    isGmxAccount,
    showExternalSwapWarnings,
  });

  const conflictToken = tradeFlags?.isSwap ? swapToToken : collateralToken;
  const currentGasPaymentToken = isFromTokenGmxAccount ? gmxAccountGasPaymentToken : settlementChainGasPaymentToken;
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);

  const payAmounts = useMemo(
    () => (payTokenAddress && fromTokenAmount > 0n ? { [payTokenAddress]: fromTokenAmount } : {}),
    [payTokenAddress, fromTokenAmount]
  );

  const gasTokenCandidate = useMemo(() => {
    const excludeTokenAddresses = conflictToken ? [conflictToken.address] : [];

    if (shouldShowExternalSwapGasConflictRequiredWarning) {
      const candidateAddress =
        currentGasPaymentToken && expressParams
          ? findNextGasPaymentToken({
              chainId,
              tokensData,
              gasPaymentToken: currentGasPaymentToken,
              gasPaymentTokenAmount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
              payAmounts,
              isGmxAccount,
              excludeTokenAddresses,
            })
          : findGasPaymentTokenWithPositiveBalance({
              chainId,
              tokensData,
              isGmxAccount,
              excludeTokenAddresses: currentGasPaymentToken
                ? [...excludeTokenAddresses, currentGasPaymentToken.address]
                : excludeTokenAddresses,
            });

      return candidateAddress ? getByKey(tokensData, candidateAddress) : undefined;
    }

    if (shouldShowExternalSwapGasConflictOptionalWarning) {
      const wrappedTokenAddress = getWrappedToken(chainId).address;
      const wrappedToken = getByKey(tokensData, wrappedTokenAddress);

      if (currentGasPaymentToken && expressParams) {
        const findSufficientGasToken = (excluded: string[]) =>
          findNextGasPaymentToken({
            chainId,
            tokensData,
            gasPaymentToken: currentGasPaymentToken,
            gasPaymentTokenAmount: expressParams.gasPaymentParams.gasPaymentTokenAmount,
            payAmounts,
            isGmxAccount,
            excludeTokenAddresses: excluded,
          });

        const candidateAddress =
          findSufficientGasToken(getGasPaymentTokens(chainId).filter((address) => address !== wrappedTokenAddress)) ??
          findSufficientGasToken(excludeTokenAddresses);

        return candidateAddress ? getByKey(tokensData, candidateAddress) : undefined;
      }

      const wrappedTokenBalance = isGmxAccount ? wrappedToken?.gmxAccountBalance : wrappedToken?.walletBalance;
      if ((wrappedTokenBalance ?? 0n) > 0n) return wrappedToken;

      const candidateAddress = findGasPaymentTokenWithPositiveBalance({
        chainId,
        tokensData,
        isGmxAccount,
        excludeTokenAddresses: currentGasPaymentToken
          ? [...excludeTokenAddresses, currentGasPaymentToken.address]
          : excludeTokenAddresses,
      });

      return candidateAddress ? getByKey(tokensData, candidateAddress) : undefined;
    }

    return undefined;
  }, [
    shouldShowExternalSwapGasConflictRequiredWarning,
    shouldShowExternalSwapGasConflictOptionalWarning,
    conflictToken,
    currentGasPaymentToken,
    expressParams,
    payAmounts,
    chainId,
    tokensData,
    isGmxAccount,
  ]);

  const prevShouldShowSubaccountApprovalInvalidWarning = usePrevious(shouldShowSubaccountApprovalInvalidWarning);
  const prevShouldShowSubaccountApprovalForAnotherNetworkWarning = usePrevious(
    shouldShowSubaccountApprovalForAnotherNetworkWarning
  );
  const prevShouldShowExternalSwapSubaccountBlockedWarning = usePrevious(
    shouldShowExternalSwapSubaccountBlockedWarning
  );
  const prevShouldShowExternalSwapGasConflictRequiredWarning = usePrevious(
    shouldShowExternalSwapGasConflictRequiredWarning
  );
  const prevShouldShowExternalSwapGasConflictOptionalWarning = usePrevious(
    shouldShowExternalSwapGasConflictOptionalWarning
  );
  const prevShouldShowExternalSwapPausedByFailureWarning = usePrevious(shouldShowExternalSwapPausedByFailureWarning);
  const prevShouldShowExternalSwapNoRouteWarning = usePrevious(shouldShowExternalSwapNoRouteWarning);
  const prevShouldShowExternalSwapTwapNotSupportedWarning = usePrevious(shouldShowExternalSwapTwapNotSupportedWarning);
  useEffect(() => {
    if (isVisible) return;
    const transitionedToTrue =
      (!prevShouldShowSubaccountApprovalInvalidWarning && shouldShowSubaccountApprovalInvalidWarning) ||
      (!prevShouldShowSubaccountApprovalForAnotherNetworkWarning &&
        shouldShowSubaccountApprovalForAnotherNetworkWarning) ||
      (!prevShouldShowExternalSwapSubaccountBlockedWarning && shouldShowExternalSwapSubaccountBlockedWarning) ||
      (!prevShouldShowExternalSwapGasConflictRequiredWarning && shouldShowExternalSwapGasConflictRequiredWarning) ||
      (!prevShouldShowExternalSwapGasConflictOptionalWarning && shouldShowExternalSwapGasConflictOptionalWarning) ||
      (!prevShouldShowExternalSwapPausedByFailureWarning && shouldShowExternalSwapPausedByFailureWarning) ||
      (!prevShouldShowExternalSwapNoRouteWarning && shouldShowExternalSwapNoRouteWarning) ||
      (!prevShouldShowExternalSwapTwapNotSupportedWarning && shouldShowExternalSwapTwapNotSupportedWarning);
    if (transitionedToTrue) {
      setIsVisible(true);
    }
  }, [
    isVisible,
    prevShouldShowSubaccountApprovalInvalidWarning,
    shouldShowSubaccountApprovalInvalidWarning,
    prevShouldShowSubaccountApprovalForAnotherNetworkWarning,
    shouldShowSubaccountApprovalForAnotherNetworkWarning,
    prevShouldShowExternalSwapSubaccountBlockedWarning,
    shouldShowExternalSwapSubaccountBlockedWarning,
    prevShouldShowExternalSwapGasConflictRequiredWarning,
    shouldShowExternalSwapGasConflictRequiredWarning,
    prevShouldShowExternalSwapGasConflictOptionalWarning,
    shouldShowExternalSwapGasConflictOptionalWarning,
    prevShouldShowExternalSwapPausedByFailureWarning,
    shouldShowExternalSwapPausedByFailureWarning,
    prevShouldShowExternalSwapNoRouteWarning,
    shouldShowExternalSwapNoRouteWarning,
    prevShouldShowExternalSwapTwapNotSupportedWarning,
    shouldShowExternalSwapTwapNotSupportedWarning,
  ]);

  const { gasPaymentTokensText, gasPaymentTokenSymbols } = useGasPaymentTokensText(chainId);

  let content: ReactNode | undefined = undefined;
  let onCloseClick: undefined | (() => void) = undefined;
  let buttonText: ReactNode | undefined = undefined;
  let icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> | undefined = undefined;
  let color: "blue" | "yellow" | "red" = "blue";

  let onClick: undefined | (() => void) = undefined;

  if (!isVisible || disabled) {
    return null;
  } else if (shouldShowWrapOrUnwrapWarning) {
    onCloseClick = handleCloseWrapOrUnwrapWarningClick;
    const nativeToken = getNativeToken(chainId);
    icon = ExpressIcon;
    content = (
      <Trans>Express Trading is unavailable for wrapping or unwrapping native token {nativeToken.symbol}</Trans>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    onCloseClick = handleCloseNativeTokenWarningClick;
    icon = ExpressIcon;
    content = (
      <Trans>
        Express Trading is unavailable with the network's native token {nativeToken.symbol}. Consider using{" "}
        {wrappedToken.symbol} instead.
      </Trans>
    );
  } else if (shouldShowAllowedActionsWarning) {
    onClick = handleUpdateSubaccountSettings;
    onCloseClick = dismissAllowedActionsWarning;
    icon = OneClickIcon;
    color = "yellow";
    content = <Trans>One-Click Trading action limit reached. You're now using Express Trading.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowNonceExpiredWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = OneClickIcon;
    color = "yellow";
    content = <Trans>One-Click Trading approval nonce expired. Re-sign to continue using One-Click Trading.</Trans>;
    buttonText = <Trans>Re-sign</Trans>;
  } else if (shouldShowExpiredSubaccountWarning) {
    onClick = handleUpdateSubaccountSettings;
    onCloseClick = dismissExpiredSubaccountWarning;
    icon = OneClickIcon;
    color = "yellow";
    content = <Trans>One-Click Trading time limit expired. You're now using Express Trading.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowExternalSwapSubaccountBlockedWarning) {
    icon = OneClickIcon;
    color = "red";
    content = (
      <Trans>
        This swap requires external routing, which isn't available with One-Click Trading. Disable One-Click to use
        Express Trading.
      </Trans>
    );
    buttonText = <Trans>Disable One-Click Trading</Trans>;
    onClick = handleDisableSubaccount;
  } else if (shouldShowExternalSwapGasConflictRequiredWarning) {
    icon = ExpressIcon;
    color = "red";
    if (gasTokenCandidate) {
      const candidateAddress = gasTokenCandidate.address;
      content = <Trans>This swap requires external routing. Pay gas in {gasTokenCandidate.symbol} to enable it.</Trans>;
      buttonText = <Trans>Use {gasTokenCandidate.symbol} for gas</Trans>;
      onClick = () => handleSwitchGasToken(candidateAddress);
    } else {
      content = (
        <Trans>
          This swap requires external routing, which isn't available while the gas payment token matches the token
          you're receiving, and no other gas token has sufficient balance.
        </Trans>
      );
      buttonText = <Trans>Switch to Classic Trading</Trans>;
      onClick = handleSwitchToClassic;
    }
  } else if (shouldShowExternalSwapNoRouteWarning) {
    icon = ExpressIcon;
    color = "red";
    content = (
      <Trans>
        GMX pools can't fill this swap, and no external route is currently available. Try reducing the amount.
      </Trans>
    );
    const aggregatorSwapUrl = getExternalAggregatorSwapUrl({
      chainId,
      isFromTokenGmxAccount,
      fromTokenAddress: payTokenAddress,
      toTokenAddress: swapToToken?.address,
    });
    if (aggregatorSwapUrl) {
      buttonText = <Trans>Swap on an external aggregator</Trans>;
      onClick = () => {
        window.open(aggregatorSwapUrl, "_blank", "noopener");
      };
    }
  } else if (shouldShowExternalSwapTwapNotSupportedWarning) {
    icon = ExpressIcon;
    color = "yellow";
    content = (
      <Trans>
        TWAP swaps use GMX pool liquidity only, which can't fill this order size. Use a market order to enable external
        routes.
      </Trans>
    );
    buttonText = <Trans>Switch to market order</Trans>;
    onClick = handleSwitchToMarketOrder;
  } else if (shouldShowOutOfGasPaymentBalanceWarning) {
    icon = ExpressIcon;
    color = "yellow";
    content = <Trans>Express Trading and One-Click Trading are unavailable due to insufficient gas balance</Trans>;
    buttonText = <Trans>Buy {gasPaymentTokensText}</Trans>;
    onClick = () => {
      history.push(`/trade/swap?to=${gasPaymentTokenSymbols[0]}`);
      onAfterAction?.();
    };
  } else if (shouldShowSubaccountApprovalForAnotherNetworkWarning) {
    icon = OneClickIcon;
    color = "yellow";
    content = (
      <Trans>
        One-Click Trading needs a one-time signature for the current network. Approvals signed for other networks are
        unaffected. Re-sign to enable One-Click Trading here.
      </Trans>
    );
    buttonText = <Trans>Re-sign</Trans>;
    onClick = handleUpdateSubaccountSettings;
  } else if (shouldShowSubaccountApprovalInvalidWarning) {
    icon = OneClickIcon;
    color = "yellow";
    content = (
      <Trans>
        One-Click Trading approval is invalid. This may happen when switching chains or changing payment tokens. Re-sign
        to continue using One-Click Trading.
      </Trans>
    );
    buttonText = <Trans>Re-sign</Trans>;
    onClick = handleUpdateSubaccountSettings;
  } else if (shouldShowExternalSwapGasConflictOptionalWarning) {
    if (!gasTokenCandidate) {
      return null;
    }
    const candidateAddress = gasTokenCandidate.address;
    icon = ExpressIcon;
    onCloseClick = () => setIsVisible(false);
    content = <Trans>Paying gas in {gasTokenCandidate.symbol} may give a better rate on this swap</Trans>;
    buttonText = <Trans>Use {gasTokenCandidate.symbol} for gas</Trans>;
    onClick = () => handleSwitchGasToken(candidateAddress);
  } else if (shouldShowExternalSwapPausedByFailureWarning) {
    icon = ExpressIcon;
    onCloseClick = () => setIsVisible(false);
    content = (
      <Trans>External routing is temporarily paused after a failed attempt. Retry to check for a better rate.</Trans>
    );
    buttonText = <Trans>Retry external route</Trans>;
    onClick = handleRetryExternalSwap;
  } else {
    return null;
  }

  return (
    <ColorfulBanner color={color} icon={icon} onClose={onCloseClick}>
      {content}
      {onClick && (
        <ColorfulButtonLink color="blue" onClick={onClick}>
          {buttonText}
        </ColorfulButtonLink>
      )}
    </ColorfulBanner>
  );
}
