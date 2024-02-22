import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { NavigationButton } from "components/NavigationButton/NavigationButton";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
  useSubaccountModalOpen,
} from "context/SubaccountContext/SubaccountContext";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, memo, useCallback } from "react";
import "./SubaccountNavigationButton.scss";
import { ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN, ONE_CLICK_TRADING_OFFER_HIDDEN } from "config/localStorage";
import { TradeFlags } from "domain/synthetics/trade";

export const SubaccountNavigationButton = memo(
  ({
    closeConfirmationBox,
    executionFee,
    isNativeToken,
    tradeFlags,
  }: {
    closeConfirmationBox: () => void;
    executionFee: BigNumber | undefined;
    isNativeToken?: boolean;
    tradeFlags: TradeFlags | undefined;
  }) => {
    const isSubaccountActive = useIsSubaccountActive();
    const [, setModalOpen] = useSubaccountModalOpen();
    const { chainId } = useChainId();

    const insufficientFunds = useSubaccountInsufficientFunds(executionFee);

    const jumpToSubaccount = useCallback(() => {
      closeConfirmationBox();
      setModalOpen(true);
    }, [closeConfirmationBox, setModalOpen]);

    const [offerButtonHidden, setOfferButtonHidden] = useLocalStorageSerializeKey(
      ONE_CLICK_TRADING_OFFER_HIDDEN,
      false
    );
    const [nativeTokenWarningHidden, setNativeTokenWarningHidden] = useLocalStorageSerializeKey(
      ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN,
      false
    );

    const handleCloseOfferClick = useCallback(() => {
      setOfferButtonHidden(true);
    }, [setOfferButtonHidden]);

    const handleCloseNativeTokenWarningClick = useCallback(() => {
      setNativeTokenWarningHidden(true);
    }, [setNativeTokenWarningHidden]);

    const { remaining } = useSubaccountActionCounts();

    const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds && !isNativeToken;
    const shouldShowOfferButton = !isSubaccountActive && !offerButtonHidden && !isNativeToken;
    const shouldShowAllowedActionsWarning = isSubaccountActive && remaining?.eq(0) && !isNativeToken;
    const shouldShowNativeTokenWarning =
      !tradeFlags?.isTrigger && isSubaccountActive && !nativeTokenWarningHidden && isNativeToken;

    let content: ReactNode = null;
    let onCloseClick: null | (() => void) = null;

    const renderTooltipContent = useCallback(() => {
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <Trans>
            Reduce wallet signing popups with One-Click Trading. This option is also available through the Wallet menu
            in the top right. <ExternalLink href={SUBACCOUNT_DOCS_URL}>More Info</ExternalLink>.
          </Trans>
        </div>
      );
    }, []);

    let clickable = true;

    if (shouldShowNativeTokenWarning) {
      const wrappedToken = getWrappedToken(chainId);
      const nativeToken = getNativeToken(chainId);
      clickable = false;
      onCloseClick = handleCloseNativeTokenWarningClick;
      content = (
        <Trans>
          One-Click Trading is not available using network's native token {nativeToken.symbol}. Consider using{" "}
          {wrappedToken.symbol} as Pay token instead.
        </Trans>
      );
    } else if (shouldShowAllowedActionsWarning) {
      content = (
        <Trans>
          The previously authorized maximum number of Actions has been reached for One-Click Trading. Click here to
          re-authorize.
        </Trans>
      );
    } else if (shouldShowInsufficientFundsButton) {
      content = (
        <Trans>There are insufficient funds in your Subaccount for One-Click Trading. Click here to top-up.</Trans>
      );
    } else if (shouldShowOfferButton) {
      onCloseClick = handleCloseOfferClick;
      content = (
        <TooltipWithPortal
          shouldStopPropagation={isTouchDevice()}
          position="left-bottom"
          handle={<Trans>Enable One-Click Trading</Trans>}
          renderContent={renderTooltipContent}
        />
      );
    } else {
      return null;
    }

    return (
      <NavigationButton
        onCloseClick={onCloseClick}
        onNavigateClick={clickable ? jumpToSubaccount : undefined}
        className="SubaccountNavigationButton"
      >
        {content}
      </NavigationButton>
    );
  }
);

function isTouchDevice() {
  return "ontouchstart" in window;
}
