import { Trans } from "@lingui/macro";
import { type KeyboardEvent, type ReactNode } from "react";

import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxAccountFundingHistoryItem } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";

import ArrowLeftIcon from "img/ic_arrow_left.svg?react";

import { WithdrawalView } from "./WithdrawalView";

export function TitleRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-8">{children}</div>;
}

function BackButton({ onClick }: { onClick: () => void }) {
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <ArrowLeftIcon
      className="size-20 text-slate-100 outline-none"
      tabIndex={0}
      role="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
    />
  );
}

export function TitleWithBack({ backTo, children }: { backTo: GmxAccountModalView; children: ReactNode }) {
  const [, setModalState] = useGmxAccountModalOpen();

  return (
    <TitleRow>
      <BackButton onClick={() => setModalState(backTo)} />
      {children}
    </TitleRow>
  );
}

export function AvailableToTradeAssetsTitle() {
  const { srcChainId } = useChainId();

  return (
    <TitleWithBack backTo="main">
      {srcChainId !== undefined ? <Trans>GMX Account Balance</Trans> : <Trans>Available to Trade Assets</Trans>}
    </TitleWithBack>
  );
}

export function TransferDetailsTitle() {
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const selectedTransfer = useGmxAccountFundingHistoryItem(selectedTransferGuid);

  return (
    <TitleWithBack backTo="main">
      {selectedTransfer?.operation === "withdrawal" ? (
        <Trans>Withdrawal from GMX Account</Trans>
      ) : (
        <Trans>Deposit to GMX Account</Trans>
      )}
    </TitleWithBack>
  );
}

export function WithdrawalScreen() {
  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="gmxAccount">
      <WithdrawalView />
    </SyntheticsStateContextProvider>
  );
}
