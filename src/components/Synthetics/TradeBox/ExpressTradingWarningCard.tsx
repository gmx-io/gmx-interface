import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useState } from "react";
import { useHistory } from "react-router-dom";

import {
  EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY,
  EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY,
} from "config/localStorage";
import { selectUpdateSubaccountSettings } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { ExpressTxnParams } from "domain/synthetics/express";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { DEFAULT_SUBACCOUNT_EXPIRY_DURATION, DEFAULT_SUBACCOUNT_MAX_ALLOWED_COUNT } from "sdk/configs/express";
import { getNativeToken, getWrappedToken } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { useGasPaymentTokensText } from "components/ExpressTradingOutOfGasBanner.ts/ExpressTradingOutOfGasBanner";

import ExpressIcon from "img/ic_express.svg?react";
import OneClickIcon from "img/ic_one_click.svg?react";

import { useExpressTradingWarnings } from "./hooks/useShowOneClickTradingInfo";

export function ExpressTradingWarningCard({
  expressParams,
  payTokenAddress,
  isWrapOrUnwrap,
}: {
  expressParams: ExpressTxnParams | undefined;
  payTokenAddress: string | undefined;
  isWrapOrUnwrap: boolean;
}) {
  const [isVisible, setIsVisible] = useState(true);
  const updateSubaccountSettings = useSelector(selectUpdateSubaccountSettings);
  const history = useHistory();

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
    }).then(() => {
      setIsVisible(false);
    });
  }, [updateSubaccountSettings]);

  const {
    shouldShowAllowedActionsWarning,
    shouldShowNativeTokenWarning,
    shouldShowWrapOrUnwrapWarning,
    shouldShowExpiredSubaccountWarning,
    shouldShowNonceExpiredWarning,
    shouldShowOutOfGasPaymentBalanceWarning,
  } = useExpressTradingWarnings({ expressParams, payTokenAddress, isWrapOrUnwrap });

  const { gasPaymentTokensText, gasPaymentTokenSymbols } = useGasPaymentTokensText(chainId);

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
    icon = <ExpressIcon className="-mt-6 ml-2" />;
    content = (
      <Trans>Express Trading is not available for wrapping or unwrapping native token {nativeToken.symbol}.</Trans>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    onCloseClick = handleCloseNativeTokenWarningClick;
    icon = <ExpressIcon className="-mt-6 ml-2" />;
    content = (
      <Trans>
        Express Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
        {wrappedToken.symbol} instead.
      </Trans>
    );
  } else if (shouldShowAllowedActionsWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = <OneClickIcon className="-mt-4 ml-4" />;
    content = <Trans>One-Click Trading is disabled. Action limit exceeded.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowNonceExpiredWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = <OneClickIcon className="ml- -mt-4" />;
    content = <Trans>One-Click Approval nonce expired. Please sign a new approval.</Trans>;
    buttonText = <Trans>Re-sign</Trans>;
  } else if (shouldShowExpiredSubaccountWarning) {
    onClick = handleUpdateSubaccountSettings;
    icon = <OneClickIcon className="-mt-4 ml-4" />;
    content = <Trans>One-Click Trading is disabled. Time limit expired.</Trans>;
    buttonText = <Trans>Re-enable</Trans>;
  } else if (shouldShowOutOfGasPaymentBalanceWarning) {
    icon = <ExpressIcon className="-mt-6 ml-2" />;
    content = <Trans>One-click and Express Trading are not available due to insufficient balance.</Trans>;

    buttonText = <Trans>Buy {gasPaymentTokensText}</Trans>;
    onClick = () => {
      history.push(`/trade/swap?to=${gasPaymentTokenSymbols[0]}`);
    };
  } else {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={icon} onClose={onCloseClick}>
      <div className="ml-10 text-12">
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
