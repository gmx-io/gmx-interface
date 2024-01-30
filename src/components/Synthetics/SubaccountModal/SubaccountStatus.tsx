import { Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getNativeToken, getWrappedToken } from "config/tokens";
import {
  useIsSubaccountActive,
  useMainAccountInsufficientFunds,
  useSubaccountActionCounts,
  useSubaccountAddress,
  useSubaccountDefaultExecutionFee,
  useSubaccountInsufficientFunds,
} from "context/SubaccountContext/SubaccountContext";
import { SUBACCOUNT_DOCS_URL } from "domain/synthetics/subaccount/constants";
import { useChainId } from "lib/chains";
import { ReactNode, memo } from "react";
import { ModalInfo } from "components/ModalInfo/ModalInfo";
import "./SubaccountStatus.scss";

function SubaccountStatusImpl({ hasBorder }: { hasBorder: boolean }) {
  const isSubaccountActive = useIsSubaccountActive();
  const { remaining: remainingActionsCount } = useSubaccountActionCounts();

  const shouldShowAllowedActionsError = isSubaccountActive && remainingActionsCount?.eq(0);
  const baseFeePerAction = useSubaccountDefaultExecutionFee();
  const subAccountInsufficientFunds = useSubaccountInsufficientFunds(baseFeePerAction);
  const mainACcountInsufficientFunds = useMainAccountInsufficientFunds(baseFeePerAction);
  const subaccountAddress = useSubaccountAddress();
  const { chainId } = useChainId();
  const shouldShowSubaccountInsufficientFundsError = isSubaccountActive && subAccountInsufficientFunds;
  const shouldShowMainAccountInsufficientFundsError = isSubaccountActive && mainACcountInsufficientFunds;

  const content: ReactNode[] = [];

  if (
    shouldShowAllowedActionsError ||
    shouldShowSubaccountInsufficientFundsError ||
    shouldShowMainAccountInsufficientFundsError
  ) {
    if (shouldShowAllowedActionsError) {
      content.push(
        <ModalInfo warning key="1">
          <Trans>
            The maximum number of authorized Actions has been reached. Re-authorize a higher value using the "Max
            allowed actions" field.
          </Trans>
        </ModalInfo>
      );
    }

    if (shouldShowSubaccountInsufficientFundsError) {
      content.push(
        <ModalInfo warning key="2">
          <Trans>
            There are insufficient funds in your Subaccount for One-Click Trading. Use the "Top-up" field to increase
            the Subaccount Balance.
          </Trans>
        </ModalInfo>
      );
    }

    if (shouldShowMainAccountInsufficientFundsError) {
      const wrappedToken = getWrappedToken(chainId);
      const nativeToken = getNativeToken(chainId);
      content.push(
        <ModalInfo warning key="3">
          <Trans>
            Not enough {wrappedToken.symbol} on your Main Account. Use the "Convert {nativeToken.symbol} to{" "}
            {wrappedToken.symbol}" field to increase the Main Account {wrappedToken.symbol} balance.
          </Trans>
        </ModalInfo>
      );
    }
  } else if (!isSubaccountActive) {
    return (
      <ModalInfo standalone={!subaccountAddress}>
        <Trans>
          Generate and activate a Subaccount for{" "}
          <ExternalLink href={SUBACCOUNT_DOCS_URL}>One-Click Trading</ExternalLink> to reduce signing popups.
        </Trans>
      </ModalInfo>
    );
  } else {
    return null;
  }

  return <div className={`SubaccountStatus ${hasBorder ? "SubaccountStatus-border" : ""}`}>{content}</div>;
}

export const SubaccountStatus = memo(SubaccountStatusImpl) as typeof SubaccountStatusImpl;
