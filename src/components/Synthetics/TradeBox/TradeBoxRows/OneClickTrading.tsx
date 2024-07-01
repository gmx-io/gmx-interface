import { Trans } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
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
import { SidecarLimitOrderEntryValid, SidecarSlTpOrderEntryValid } from "domain/synthetics/sidecarOrders/types";
import { useSidecarOrders } from "domain/synthetics/sidecarOrders/useSidecarOrders";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import CloseIcon from "img/navbutton-close.svg";
import { isTouchDevice } from "lib/browser";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { getByKey } from "lib/objects";

export function TradeBoxOneClickTrading() {
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const tokensData = useTokensData();
  const fromToken = getByKey(tokensData, fromTokenAddress);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { stopLoss, takeProfit, limit } = useSidecarOrders();
  const sidecarEntries = useMemo(
    () => [...(stopLoss?.entries || []), ...(takeProfit?.entries || []), ...(limit?.entries || [])],
    [stopLoss, takeProfit, limit]
  );

  const { cancelSltpEntries, createSltpEntries, updateSltpEntries } = useMemo(() => {
    const [cancelSltpEntries, createSltpEntries, updateSltpEntries] = sidecarEntries.reduce(
      ([cancel, create, update], e) => {
        if (e.txnType === "cancel") cancel.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        if (e.txnType === "create" && !!e.decreaseAmounts) create.push(e as SidecarSlTpOrderEntryValid);
        if (e.txnType === "update" && (!!e.decreaseAmounts || !!e.increaseAmounts))
          update.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        return [cancel, create, update];
      },
      [[], [], []] as [
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
        SidecarSlTpOrderEntryValid[],
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
      ]
    );

    return { cancelSltpEntries, createSltpEntries, updateSltpEntries };
  }, [sidecarEntries]);

  const requiredActions = 1 + cancelSltpEntries.length + createSltpEntries.length + updateSltpEntries.length;

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
  } else if (shouldShowOfferButton) {
    onCloseClick = handleCloseOfferClick;
    content = (
      <AlertInfo type="info" className="TradeBox-one-click-label">
        <TooltipWithPortal
          shouldStopPropagation={isTouchDevice()}
          position="top-start"
          renderContent={renderTooltipContent}
        >
          <Trans>One-Click Trading</Trans>
        </TooltipWithPortal>
      </AlertInfo>
    );
    buttonText = <Trans>Enable</Trans>;
  } else {
    return null;
  }

  if (buttonText) {
    return (
      <ExchangeInfo.Row
        label={content}
        className="SwapBox-info-row"
        value={
          <span className="flex flex-row justify-center gap-4 whitespace-nowrap align-middle">
            <Button variant="link" disabled={!clickable} onClick={jumpToSubaccount}>
              {buttonText}
            </Button>
            {onCloseClick && (
              <img
                src={CloseIcon}
                onClick={onCloseClick}
                alt="close"
                className="TradeBox-close-icon relative top-2 cursor-pointer"
              />
            )}
          </span>
        }
      />
    );
  }

  return content ? <ExchangeInfo.Row label={content} className="SwapBox-info-row" value={null} /> : null;
}
