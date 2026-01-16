import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { selectUpdateSubaccountSettings } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import type { ExpressTxnParams } from "domain/synthetics/express";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { usePrevious } from "lib/usePrevious";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "sdk/configs/express";
import { getNativeToken, getWrappedToken } from "sdk/configs/tokens";

import { ColorfulBanner, ColorfulButtonLink } from "components/ColorfulBanner/ColorfulBanner";
import { useGasPaymentTokensText } from "components/ExpressTradingOutOfGasBanner.ts/ExpressTradingOutOfGasBanner";

import ExpressIcon from "img/ic_express.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";

import { useExpressTradingWarnings } from "./hooks/useShowOneClickTradingInfo";

export function ExpressTradingWarningCard({
  expressParams,
  payTokenAddress,
  isWrapOrUnwrap,
  disabled,
  isGmxAccount,
}: {
  expressParams: ExpressTxnParams | undefined;
  payTokenAddress: string | undefined;
  isWrapOrUnwrap: boolean;
  disabled?: boolean;
  isGmxAccount: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const updateSubaccountSettings = useSelector(selectUpdateSubaccountSettings);
  const history = useHistory();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  const { chainId, srcChainId } = useChainId();

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
        setIsVisible(false);
      }
    });
  }, [updateSubaccountSettings, isGmxAccount]);

  const {
    shouldShowAllowedActionsWarning,
    shouldShowNativeTokenWarning,
    shouldShowWrapOrUnwrapWarning,
    shouldShowExpiredSubaccountWarning,
    shouldShowNonceExpiredWarning,
    shouldShowOutOfGasPaymentBalanceWarning,
    shouldShowSubaccountApprovalInvalidWarning,
  } = useExpressTradingWarnings({ expressParams, payTokenAddress, isWrapOrUnwrap, isGmxAccount });

  const prevShouldShowSubaccountApprovalInvalidWarning = usePrevious(shouldShowSubaccountApprovalInvalidWarning);
  useEffect(() => {
    if (!prevShouldShowSubaccountApprovalInvalidWarning && shouldShowSubaccountApprovalInvalidWarning && !isVisible) {
      setIsVisible(true);
    }
  }, [isVisible, prevShouldShowSubaccountApprovalInvalidWarning, shouldShowSubaccountApprovalInvalidWarning]);

  const { gasPaymentTokensText, gasPaymentTokenSymbols } = useGasPaymentTokensText(chainId);

  let content: ReactNode | undefined = undefined;
  let onCloseClick: undefined | (() => void) = undefined;
  let buttonText: ReactNode | undefined = undefined;
  let icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>> | undefined = undefined;

  let onClick: undefined | (() => void) = undefined;

  if (!isVisible || disabled) {
    return null;
  } else if (shouldShowWrapOrUnwrapWarning) {
    onCloseClick = handleCloseWrapOrUnwrapWarningClick;
    const nativeToken = getNativeToken(chainId);
    icon = ExpressIcon;
    content = (
      <Trans>Express Trading is not available for wrapping or unwrapping native token {nativeToken.symbol}.</Trans>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    onCloseClick = handleCloseNativeTokenWarningClick;
    icon = ExpressIcon;
    content = (
      <Trans>
        Express Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
        {wrappedToken.symbol} instead.
      </Trans>
    );
  } else if (shouldShowAllowedActionsWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = OneClickIcon;
    content = <Trans>One-Click Trading is disabled. Action limit exceeded.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowNonceExpiredWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = OneClickIcon;
    content = <Trans>One-Click Approval nonce expired. Please sign a new approval.</Trans>;
    buttonText = <Trans>Re-sign</Trans>;
  } else if (shouldShowExpiredSubaccountWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = OneClickIcon;
    content = <Trans>One-Click Trading is disabled. Time limit expired.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowOutOfGasPaymentBalanceWarning) {
    if (srcChainId) {
      icon = ExpressIcon;
      content = <Trans>Insufficient gas balance, please deposit more {gasPaymentTokensText}.</Trans>;
      buttonText = <Trans>Deposit {gasPaymentTokensText}</Trans>;

      onClick = () => {
        setGmxAccountModalOpen("deposit");
      };
    } else {
      icon = ExpressIcon;
      content = <Trans>Express and One-Click Trading are unavailable due to insufficient gas balance.</Trans>;
      buttonText = <Trans>Buy {gasPaymentTokensText}</Trans>;
      onClick = () => {
        history.push(`/trade/swap?to=${gasPaymentTokenSymbols[0]}`);
      };
    }
  } else if (shouldShowSubaccountApprovalInvalidWarning) {
    icon = OneClickIcon;
    content = (
      <Trans>
        One-Click Trading approval is invalid. This may happen when switching chains or changing payment tokens. Please
        sign a new approval to continue.
      </Trans>
    );
    buttonText = <Trans>Re-sign</Trans>;
    onClick = handleUpdateSubaccountSettings;
  } else {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={icon} onClose={onCloseClick}>
      {content}
      {onClick && (
        <ColorfulButtonLink color="blue" onClick={onClick}>
          {buttonText}
        </ColorfulButtonLink>
      )}
    </ColorfulBanner>
  );
}
