import { Trans } from "@lingui/macro";
import { memo, type KeyboardEvent, type ReactNode } from "react";

import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxAccountFundingHistoryItem } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";
import { userAnalytics } from "lib/userAnalytics";
import { OneClickPromotionEvent } from "lib/userAnalytics/types";

import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SlideModal } from "components/Modal/SlideModal";

import ArrowLeftIcon from "img/ic_arrow_left.svg?react";

import { AvailableToTradeAssetsView } from "./AvailableToTradeAssetsView";
import { DepositStatusView } from "./DepositStatusView";
import { DepositView } from "./DepositView";
import { MainView } from "./MainView";
import { SelectAssetToDepositView } from "./SelectAssetToDepositView";
import { TransferDetailsView } from "./TransferDetailsView";
import { WithdrawalView } from "./WithdrawalView";

function TitleRow({ children }: { children: ReactNode }) {
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

function TitleWithBack({ backTo, children }: { backTo: GmxAccountModalView; children: ReactNode }) {
  const [, setModalState] = useGmxAccountModalOpen();

  return (
    <TitleRow>
      <BackButton onClick={() => setModalState(backTo)} />
      {children}
    </TitleRow>
  );
}

function AvailableToTradeAssetsTitle() {
  const { srcChainId } = useChainId();

  return (
    <TitleWithBack backTo="main">
      {srcChainId !== undefined ? <Trans>GMX Account Balance</Trans> : <Trans>Available to Trade Assets</Trans>}
    </TitleWithBack>
  );
}

function TransferDetailsTitle() {
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

function DepositTitle() {
  return (
    <TitleWithBack backTo="main">
      <Trans>Deposit to GMX Account</Trans>
    </TitleWithBack>
  );
}

function WithdrawTitle() {
  return (
    <TitleWithBack backTo="main">
      <Trans>Withdraw from GMX Account</Trans>
    </TitleWithBack>
  );
}

function DepositStatusTitle() {
  return (
    <TitleRow>
      <Trans>Your deposit is in progress</Trans>
    </TitleRow>
  );
}

function SelectAssetToDepositTitle() {
  return (
    <TitleWithBack backTo="deposit">
      <Trans>Select Asset to Deposit</Trans>
    </TitleWithBack>
  );
}

const SLIDE_MODAL_LABELS: Record<Exclude<GmxAccountModalView, "depositStatus">, ReactNode> = {
  main: <Trans>GMX Account</Trans>,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  transferDetails: <TransferDetailsTitle />,
  deposit: <DepositTitle />,
  withdraw: <WithdrawTitle />,
  selectAssetToDeposit: <SelectAssetToDepositTitle />,
};

function WithdrawalScreen() {
  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="gmxAccount">
      <WithdrawalView />
    </SyntheticsStateContextProvider>
  );
}

export const GmxAccountModalMobile = memo(function GmxAccountModalMobile({ account }: { account: string }) {
  const [modalState, setModalState] = useGmxAccountModalOpen();

  const isOpen = modalState !== false;
  const view: GmxAccountModalView = typeof modalState === "string" ? modalState : "main";

  const isDepositStatus = view === "depositStatus";
  const slideModalView = isDepositStatus ? "main" : view;

  const handleDepositStatusClose = (nextVisible: boolean) => {
    if (nextVisible) return;

    userAnalytics.pushEvent<OneClickPromotionEvent>({
      event: "OneClickPromotion",
      data: { action: "UserRejected" },
    });

    setModalState("main");
  };

  return (
    <>
      <SlideModal
        label={SLIDE_MODAL_LABELS[slideModalView]}
        isVisible={isOpen && !isDepositStatus}
        setIsVisible={setModalState}
        disableOverflowHandling={true}
        className="text-body-medium"
        contentPadding={false}
      >
        {view === "main" && <MainView account={account} />}
        {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
        {view === "transferDetails" && <TransferDetailsView />}
        {view === "deposit" && <DepositView />}
        {view === "selectAssetToDeposit" && <SelectAssetToDepositView />}
        {view === "withdraw" && <WithdrawalScreen />}
      </SlideModal>

      {isDepositStatus && (
        <ModalWithPortal
          label={<DepositStatusTitle />}
          isVisible={isOpen}
          setIsVisible={handleDepositStatusClose}
          withMobileBottomPosition={true}
          contentPadding={false}
          contentClassName="w-[420px]"
        >
          <DepositStatusView />
        </ModalWithPortal>
      )}
    </>
  );
});
