import { Trans } from "@lingui/macro";
import { NavigationButton } from "components/NavigationButton/NavigationButton";
import {
  useIsSubaccountActive,
  useSubaccountModalOpen,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, memo, useCallback, useState } from "react";
import "./SubaccountNavigationButton.scss";
import { BigNumber } from "ethers";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export const SubaccountNavigationButton = memo(
  ({
    closeConfirmationBox,
    executionFee,
  }: {
    closeConfirmationBox: () => void;
    executionFee: BigNumber | undefined;
  }) => {
    const isSubaccountActive = useIsSubaccountActive();
    const [, setModalOpen] = useSubaccountModalOpen();

    const insufficientFunds = useSubaccountInsufficientFunds(executionFee);

    const jumpToSubaccount = useCallback(() => {
      closeConfirmationBox();
      setModalOpen(true);
    }, [closeConfirmationBox, setModalOpen]);

    const [offerButtonHidden, setOfferButtonHidden] = useLocalStorageSerializeKey("oneClickTradingOfferHidden", false);
    const [insufficientFundsButtonHidden, setInsufficientFundsButtonHidden] = useState(false);

    const handleCloseOfferClick = useCallback(() => {
      setOfferButtonHidden(true);
    }, [setOfferButtonHidden]);

    const handleCloseInsufficientFundsClick = useCallback(() => {
      setInsufficientFundsButtonHidden(true);
    }, [setInsufficientFundsButtonHidden]);

    const { remaining } = useSubaccountActionCounts();

    const shouldShowInsufficientFundsButton = isSubaccountActive && insufficientFunds && !insufficientFundsButtonHidden;
    const shouldShowOfferButton = !isSubaccountActive && !offerButtonHidden;
    const shouldShowAllowedActionsWarning = isSubaccountActive && remaining?.eq(0);

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

    if (shouldShowAllowedActionsWarning) {
      content = (
        <Trans>
          The previously authorized maximum number of Actions has been reached for One-Click Trading. Click here to
          re-authorize.
        </Trans>
      );
    } else if (shouldShowInsufficientFundsButton) {
      onCloseClick = handleCloseInsufficientFundsClick;
      content = (
        <Trans>There are insufficient funds in your Subaccount for One-Click Trading. Click here to top-up.</Trans>
      );
    } else if (shouldShowOfferButton) {
      onCloseClick = handleCloseOfferClick;
      content = (
        <TooltipWithPortal handle={<Trans>Enable One-Click Trading</Trans>} renderContent={renderTooltipContent} />
      );
    } else {
      return null;
    }

    return (
      <NavigationButton
        onCloseClick={onCloseClick}
        onNavigateClick={jumpToSubaccount}
        className="SubaccountNavigationButton"
      >
        {content}
      </NavigationButton>
    );
  }
);
