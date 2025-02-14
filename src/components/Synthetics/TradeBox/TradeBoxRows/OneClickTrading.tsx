import { Trans } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback } from "react";
import { useAccount } from "wagmi";

import { IS_TOUCH } from "config/env";
import { ONE_CLICK_TRADING_OFFER_HIDDEN } from "config/localStorage";
import { useIsSubaccountActive, useSubaccountModalOpen } from "context/SubaccountContext/SubaccountContext";
import { selectTradeboxFromToken } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import { useLocalStorageSerializeKey } from "lib/localStorage";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import CrossIconComponent from "img/cross.svg?react";

export function TradeBoxOneClickTrading() {
  const fromToken = useSelector(selectTradeboxFromToken);
  const { isConnected } = useAccount();

  const isSubaccountActive = useIsSubaccountActive();
  const [, setModalOpen] = useSubaccountModalOpen();

  const jumpToSubaccount = useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const [offerButtonHidden, setOfferButtonHidden] = useLocalStorageSerializeKey(ONE_CLICK_TRADING_OFFER_HIDDEN, false);

  const handleCloseOfferClick = useCallback(() => {
    setOfferButtonHidden(true);
  }, [setOfferButtonHidden]);

  if (!isConnected) {
    return null;
  }

  const isNativeToken = fromToken?.isNative;

  const shouldShowOfferButton = !isSubaccountActive && !offerButtonHidden && !isNativeToken;

  let content: ReactNode = null;
  let onCloseClick: null | (() => void) = null;
  let buttonText: ReactNode | null = null;

  let clickable = true;

  if (shouldShowOfferButton) {
    onCloseClick = handleCloseOfferClick;
    content = (
      <TooltipWithPortal
        shouldStopPropagation={IS_TOUCH}
        position="left-start"
        content={
          <div onClick={(e) => e.stopPropagation()}>
            <Trans>
              Reduce wallet signing popups with One-Click Trading. This option is also available through the Wallet menu
              in the top right. <ExternalLink href={SUBACCOUNT_DOCS_URL}>Read more</ExternalLink>.
            </Trans>
          </div>
        }
        handleClassName="text-body-medium"
      >
        <Trans>One-Click Trading</Trans>
      </TooltipWithPortal>
    );
    buttonText = <Trans>Enable</Trans>;
  } else {
    return null;
  }

  return (
    <AlertInfoCard className="!text-body-medium">
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
