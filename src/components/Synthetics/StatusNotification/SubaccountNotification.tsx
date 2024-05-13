import { Trans, t } from "@lingui/macro";
import SpinningLoader from "components/Common/SpinningLoader";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import {
  SubaccountNotificationState,
  useSubaccountNotificationState,
  useSubaccountPendingTx,
} from "context/SubaccountContext/SubaccountContext";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { usePrevious } from "lib/usePrevious";
import { ReactNode, memo, useMemo } from "react";
import { useToastAutoClose } from "./useToastAutoClose";
import { StatusNotification } from "./StatusNotification";

const SubaccountNotificationImpl = ({
  toastId,
  subaccountWasAlreadyGenerated,
  subaccountWasAlreadyActivated,
}: {
  toastId: number;
  subaccountWasAlreadyGenerated: boolean;
  subaccountWasAlreadyActivated: boolean;
}) => {
  const hasError = false;

  const [notificationState] = useSubaccountNotificationState();
  const isCompleted = useMemo(() => {
    const completedStates: SubaccountNotificationState[] = [
      "activated",
      "deactivated",
      "deactivationFailed",
      "activationFailed",
      "generationFailed",
    ];
    return completedStates.includes(notificationState);
  }, [notificationState]);
  useToastAutoClose(isCompleted, toastId);

  let content: ReactNode = null;
  let title: ReactNode = null;

  const [activeTx] = useSubaccountPendingTx();
  const { chainId } = useChainId();

  const latestTransactionHash = usePrevious(activeTx);
  const tx = isCompleted ? latestTransactionHash : activeTx;

  const link = useMemo(() => {
    if (!tx) return null;

    const txUrl = getExplorerUrl(chainId) + "tx/" + tx;
    return (
      <ExternalLink href={txUrl}>
        <Trans>View status</Trans>
      </ExternalLink>
    );
  }, [chainId, tx]);

  const isUpdate = subaccountWasAlreadyGenerated && subaccountWasAlreadyActivated;
  const renderActivationTitle = () => {
    if (isUpdate) return t`Updating Subaccount`;
    return subaccountWasAlreadyGenerated ? t`Activating Subaccount` : t`Generating and activating Subaccount`;
  };
  const renderActivationContent = (step: "generating" | "activating" | "activated") => {
    if (isUpdate) {
      if (step === "activating")
        return (
          <div className="flex justify-between">
            <Trans>Pending Wallet transaction sign</Trans>
            <SpinningLoader className="mr-5 self-center" />
          </div>
        );
      return <Trans>Subaccount is updated</Trans>;
    }

    return (
      <div>
        <div className="flex justify-between">
          {step === "generating" ? <Trans>Pending Wallet message sign</Trans> : <Trans>Subaccount created</Trans>}{" "}
          {step === "generating" ? <SpinningLoader className="mr-5 self-center" /> : null}
        </div>
        <div className="flex justify-between">
          {step === "activated" ? <Trans>Subaccount activated</Trans> : <Trans>Pending Wallet transaction sign</Trans>}{" "}
          {step === "activating" ? <SpinningLoader className="mr-5 self-center" /> : null}
        </div>
      </div>
    );
  };

  switch (notificationState) {
    case "generating":
      title = renderActivationTitle();
      content = renderActivationContent("generating");
      break;

    case "generationFailed":
      title = renderActivationTitle();
      content = t`Subaccount generation failed`;
      break;

    case "activating":
      title = renderActivationTitle();
      content = renderActivationContent("activating");
      break;

    case "activated":
      title = renderActivationTitle();
      content = renderActivationContent("activated");
      break;

    case "activationFailed":
      title = renderActivationTitle();
      content = t`Subaccount activation failed`;
      break;

    case "deactivating":
      title = t`Deactivation`;
      content = (
        <div className="flex justify-between">
          <Trans>Deactivating subaccount</Trans>
          <SpinningLoader className="mr-5 self-center" />
        </div>
      );
      break;

    case "deactivated":
      title = t`Deactivation`;
      content = t`Subaccount deactivated`;
      break;

    case "deactivationFailed":
      title = t`Deactivation`;
      content = t`Subaccount deactivation failed`;
      break;

    case "none":
      return null;

    default:
      mustNeverExist(notificationState);
  }

  return (
    <StatusNotification title={title} hasError={hasError}>
      <div>{content}</div>
      {link && (
        <>
          <br />
          {link}
        </>
      )}
    </StatusNotification>
  );
};

export const SubaccountNotification = memo(SubaccountNotificationImpl) as typeof SubaccountNotificationImpl;
