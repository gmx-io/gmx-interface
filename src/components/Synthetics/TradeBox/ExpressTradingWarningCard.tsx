import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useState } from "react";

import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectUpdateSubaccountSettings } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "sdk/configs/express";
import { getNativeToken, getWrappedToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import OneClickIcon from "img/ic_one_click.svg?react";
import IconBolt from "img/icon-bolt.svg?react";

import { useExpressTradingWarnings } from "./hooks/useShowOneClickTradingInfo";

export function ExpressTradingWarningCard() {
  const [isVisible, setIsVisible] = useState(true);
  const updateSubaccountSettings = useSelector(selectUpdateSubaccountSettings);

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

  const {
    shouldShowAllowedActionsWarning,
    shouldShowNativeTokenWarning,
    shouldShowWrapOrUnwrapWarning,
    shouldShowExpiredSubaccountWarning,
    shouldShowNonceExpiredWarning,
  } = useExpressTradingWarnings();

  let content: ReactNode | undefined = undefined;
  let onCloseClick: undefined | (() => void) = undefined;
  let buttonText: ReactNode | undefined = undefined;
  let icon: ReactNode | undefined = undefined;

  let onClick: undefined | (() => void) = undefined;

  if (!isVisible) {
    return null;
  } else if (shouldShowWrapOrUnwrapWarning) {
    onCloseClick = handleCloseWrapOrUnwrapWarningClick;
    const nativeToken = getNativeToken(chainId);
    icon = <IconBolt />;
    content = (
      <Trans>Express Trading is not available for wrapping or unwrapping native token {nativeToken.symbol}.</Trans>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    onCloseClick = handleCloseNativeTokenWarningClick;
    icon = <IconBolt />;
    content = (
      <Trans>
        Express Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
        {wrappedToken.symbol} instead.
      </Trans>
    );
  } else if (shouldShowAllowedActionsWarning) {
    onClick = () => {
      updateSubaccountSettings({
        nextRemainigActions: BigInt(DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT),
      }).then(() => {
        setIsVisible(false);
      });
    };
    icon = <OneClickIcon className="-mt-4 ml-4" />;
    content = <Trans>One-Click Trading is disabled. Action limit exceeded.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowExpiredSubaccountWarning) {
    onClick = () => {
      updateSubaccountSettings({
        nextRemainingSeconds: BigInt(DEFAULT_SUBACCOUNT_EXPIRY_DURATION),
      }).then(() => {
        setIsVisible(false);
      });
    };
    icon = <OneClickIcon className="-mt-4 ml-4" />;
    content = <Trans>One-Click Trading is disabled. Time limit expired.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowNonceExpiredWarning) {
    onClick = () => {
      updateSubaccountSettings({
        nextRemainingSeconds: BigInt(DEFAULT_SUBACCOUNT_EXPIRY_DURATION),
      }).then(() => {
        setIsVisible(false);
      });
    };
    icon = <OneClickIcon className="ml- -mt-4" />;
    content = <Trans>One-Click Approval nonce expired. Please sign a new approval.</Trans>;
    buttonText = <Trans>Re-sign</Trans>;
  } else {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={icon} onClose={onCloseClick}>
      <div className="text-12">
        {content}
        {onClick && (
          <>
            <br />
            <Button variant="link" className="mt-2 !text-12" onClick={onClick}>
              {buttonText}
            </Button>
          </>
        )}
      </div>
    </ColorfulBanner>
  );
}
