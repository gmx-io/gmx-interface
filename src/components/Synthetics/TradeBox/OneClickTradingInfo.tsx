import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback } from "react";

import {
  ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
  ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN,
} from "config/localStorage";
import { useSubaccountModalOpen } from "context/SubaccountContext/SubaccountContext";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getNativeToken, getWrappedToken } from "sdk/configs/tokens";


import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";

import CrossIconComponent from "img/cross.svg?react";

import { useShowOneClickTradingInfo } from "./hooks/useShowOneClickTradingInfo";

export function OneClickTradingInfo() {
  const [, setModalOpen] = useSubaccountModalOpen();
  const { chainId } = useChainId();

  const jumpToSubaccount = useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const [, setNativeTokenWarningHidden] = useLocalStorageSerializeKey(
    ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
    false
  );

  const [, setWrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN,
    false
  );

  const handleCloseNativeTokenWarningClick = useCallback(() => {
    setNativeTokenWarningHidden(true);
  }, [setNativeTokenWarningHidden]);

  const handleCloseWrapOrUnwrapWarningClick = useCallback(() => {
    setWrapOrUnwrapWarningHidden(true);
  }, [setWrapOrUnwrapWarningHidden]);

  const {
    shouldShowAllowedActionsWarning,
    shouldShowInsufficientFundsButton,
    shouldShowNativeTokenWarning,
    shouldShowWrapOrUnwrapWarning,
  } = useShowOneClickTradingInfo();

  let content: ReactNode = null;
  let onCloseClick: null | (() => void) = null;
  let buttonText: ReactNode | null = null;

  let clickable = true;

  if (shouldShowWrapOrUnwrapWarning) {
    const nativeToken = getNativeToken(chainId);
    clickable = false;
    onCloseClick = handleCloseWrapOrUnwrapWarningClick;
    content = (
      <Trans>One-Click Trading is not available for wrapping or unwrapping native token {nativeToken.symbol}.</Trans>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    clickable = false;
    onCloseClick = handleCloseNativeTokenWarningClick;
    content = (
      <Trans>
        One-Click Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
        {wrappedToken.symbol} instead.
      </Trans>
    );
  } else if (shouldShowAllowedActionsWarning) {
    content = (
      <Trans>The previously authorized maximum number of actions has been reached for One-Click Trading.</Trans>
    );
    buttonText = <Trans>Re-authorize</Trans>;
  } else if (shouldShowInsufficientFundsButton) {
    content = <Trans>There are insufficient funds in your subaccount for One-Click Trading</Trans>;
    buttonText = <Trans>Top-Up</Trans>;
  } else {
    return null;
  }

  return (
    <AlertInfoCard>
      <div className="flex justify-between">
        <div>{content}</div>
        <div className="flex flex-row items-center gap-4 whitespace-nowrap">
          <Button variant="link" type="button" disabled={!clickable} onClick={jumpToSubaccount}>
            {buttonText}
          </Button>
          {onCloseClick && (
            <button
              className={cx(
                "-my-4 rounded-4 p-4 text-slate-100",
                "hover:bg-[#50577e99] hover:text-slate-100 focus:bg-[#50577e99] focus:text-slate-100",
                "active:bg-[#50577eb3] active:text-slate-100"
              )}
              onClick={onCloseClick}
            >
              <CrossIconComponent className="w-16" />
            </button>
          )}
        </div>
      </div>
    </AlertInfoCard>
  );
}
