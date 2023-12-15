import { Trans } from "@lingui/macro";
import { NavigationButton } from "components/NavigationButton/NavigationButton";
import {
  useIsSubaccountActive,
  useOneClickTradingModalOpen,
  useSubaccountActionCounts,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import starIcon from "img/star.svg";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { ReactNode, memo, useCallback, useState } from "react";
import "./SubaccountNavigationButton.scss";
import { BigNumber } from "ethers";

export const SubaccountNavigationButton = memo(
  ({
    closeConfirmationBox,
    executionFee,
  }: {
    closeConfirmationBox: () => void;
    executionFee: BigNumber | undefined;
  }) => {
    const isSubaccountActive = useIsSubaccountActive();
    const [, setModalOpen] = useOneClickTradingModalOpen();

    const insufficientFunds = useSubaccountInsufficientFunds(executionFee);

    const jumpToOneClickTrading = useCallback(() => {
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

    if (shouldShowAllowedActionsWarning) {
      content = (
        <Trans>
          The previously authorized maximum number of Actions have been reached for One-Click Trwading. Click here to
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
        <Trans>
          Enable One-Click Trading to reduce{" "}
          <span className="ConfirmationBox-star-container">
            wallet
            <img className="ConfirmationBox-star" alt="Star" src={starIcon} />
          </span>{" "}
          signing popups. This option is also accessible through the Wallet menu in the top right.
        </Trans>
      );
    } else {
      return null;
    }

    return (
      <NavigationButton
        onCloseClick={onCloseClick}
        onNavigateClick={jumpToOneClickTrading}
        className="SubaccountNavigationButton"
      >
        {content}
      </NavigationButton>
    );
  }
);
