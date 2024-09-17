import { Trans } from "@lingui/macro";
import { ReactNode, useCallback } from "react";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { IS_TOUCH } from "config/env";
import {
  ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
  ONE_CLICK_TRADING_OFFER_HIDDEN,
  ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN,
} from "config/localStorage";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
  useSubaccountModalOpen,
} from "context/SubaccountContext/SubaccountContext";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectTradeboxExecutionFee,
  selectTradeboxFromTokenAddress,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import closeIcon from "img/navbutton-close.svg";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";
import { useRequiredActions } from "../hooks/useRequiredActions";

export function TradeBoxOneClickTrading() {
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const tokensData = useTokensData();
  const fromToken = getByKey(tokensData, fromTokenAddress);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { requiredActions } = useRequiredActions();

  const isSubaccountActive = useIsSubaccountActive();
  const [, setModalOpen] = useSubaccountModalOpen();
  const { chainId } = useChainId();

  const insufficientFunds = useSubaccountInsufficientFunds(executionFee?.feeTokenAmount);

  const jumpToSubaccount = useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const [offerButtonHidden, setOfferButtonHidden] = useLocalStorageSerializeKey(ONE_CLICK_TRADING_OFFER_HIDDEN, false);
  const [nativeTokenWarningHidden, setNativeTokenWarningHidden] = useLocalStorageSerializeKey(
    ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
    false
  );

  const [wrapOrUnwrapWarningHidden, setWrapOrUnwrapWarningHidden] = useLocalStorageSerializeKey(
    ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN,
    false
  );

  const handleCloseOfferClick = useCallback(() => {
    setOfferButtonHidden(true);
  }, [setOfferButtonHidden]);

  const handleCloseNativeTokenWarningClick = useCallback(() => {
    setNativeTokenWarningHidden(true);
  }, [setNativeTokenWarningHidden]);

  const handleCloseWrapOrUnwrapWarningClick = useCallback(() => {
    setWrapOrUnwrapWarningHidden(true);
  }, [setWrapOrUnwrapWarningHidden]);

  const { remaining } = useSubaccountActionCounts();

  const isNativeToken = fromToken?.isNative;

  const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds && !isNativeToken;
  const shouldShowOfferButton = !isSubaccountActive && !offerButtonHidden && !isNativeToken;
  const shouldShowAllowedActionsWarning =
    isSubaccountActive && (remaining === 0n || remaining < requiredActions) && !isNativeToken;
  const shouldShowWrapOrUnwrapWarning =
    !tradeFlags?.isTrigger && isSubaccountActive && !wrapOrUnwrapWarningHidden && isWrapOrUnwrap;
  const shouldShowNativeTokenWarning =
    !tradeFlags?.isTrigger && isSubaccountActive && !nativeTokenWarningHidden && isNativeToken;

  let content: ReactNode = null;
  let onCloseClick: null | (() => void) = null;
  let buttonText: ReactNode | null = null;

  const renderTooltipContent = useCallback(() => {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Trans>
          Reduce wallet signing popups with One-Click Trading. This option is also available through the Wallet menu in
          the top right. <ExternalLink href={SUBACCOUNT_DOCS_URL}>Read more</ExternalLink>.
        </Trans>
      </div>
    );
  }, []);

  let clickable = true;

  if (shouldShowWrapOrUnwrapWarning) {
    const nativeToken = getNativeToken(chainId);
    clickable = false;
    onCloseClick = handleCloseWrapOrUnwrapWarningClick;
    content = (
      <OneClickAlertInfo>
        <Trans>One-Click Trading is not available for wrapping or unwrapping native token {nativeToken.symbol}.</Trans>
      </OneClickAlertInfo>
    );
  } else if (shouldShowNativeTokenWarning) {
    const wrappedToken = getWrappedToken(chainId);
    const nativeToken = getNativeToken(chainId);
    clickable = false;
    onCloseClick = handleCloseNativeTokenWarningClick;
    content = (
      <OneClickAlertInfo>
        <Trans>
          One-Click Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
          {wrappedToken.symbol} instead.
        </Trans>
      </OneClickAlertInfo>
    );
  } else if (shouldShowAllowedActionsWarning) {
    content = (
      <OneClickAlertInfo>
        <Trans>The previously authorized maximum number of actions has been reached for One-Click Trading.</Trans>
      </OneClickAlertInfo>
    );
    buttonText = <Trans>Re-authorize</Trans>;
  } else if (shouldShowInsufficientFundsButton) {
    content = (
      <OneClickAlertInfo>
        <Trans>There are insufficient funds in your subaccount for One-Click Trading</Trans>
      </OneClickAlertInfo>
    );
    buttonText = <Trans>Top-Up</Trans>;
  } else if (shouldShowOfferButton) {
    onCloseClick = handleCloseOfferClick;
    content = (
      <OneClickAlertInfo>
        <TooltipWithPortal shouldStopPropagation={IS_TOUCH} position="top-start" renderContent={renderTooltipContent}>
          <Trans>One-Click Trading</Trans>
        </TooltipWithPortal>
      </OneClickAlertInfo>
    );
    buttonText = <Trans>Enable</Trans>;
  } else {
    return null;
  }

  if (buttonText) {
    return (
      <ExchangeInfo.Row
        label={content}
        className="!items-center"
        value={
          <span className="flex flex-row justify-center gap-4 whitespace-nowrap align-middle">
            <Button variant="link" type="button" disabled={!clickable} onClick={jumpToSubaccount}>
              {buttonText}
            </Button>
            {onCloseClick && (
              <img
                src={closeIcon}
                onClick={onCloseClick}
                alt="close"
                className="TradeBox-close-icon relative top-2 h-18 w-18 cursor-pointer"
              />
            )}
          </span>
        }
      />
    );
  }

  return content ? <ExchangeInfo.Row className="!items-center" label={content} value={null} /> : null;
}

function OneClickAlertInfo({ children }: { children: ReactNode }) {
  return (
    <AlertInfo type="info" className="!mb-0 text-[1.2rem]">
      {children}
    </AlertInfo>
  );
}
