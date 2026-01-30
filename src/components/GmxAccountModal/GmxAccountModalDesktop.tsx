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

const MAIN_VIEWS = ["main", "availableToTradeAssets", "transferDetails"] as const;
const OVERLAY_VIEWS = ["deposit", "withdraw", "depositStatus", "selectAssetToDeposit"] as const;

type MainView = (typeof MAIN_VIEWS)[number];
type OverlayView = (typeof OVERLAY_VIEWS)[number];

function isMainView(view: GmxAccountModalView): view is MainView {
  return MAIN_VIEWS.includes(view as MainView);
}

function isOverlayView(view: GmxAccountModalView): view is OverlayView {
  return OVERLAY_VIEWS.includes(view as OverlayView);
}

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

const SLIDE_MODAL_LABELS: Record<MainView, ReactNode> = {
  main: <Trans>GMX Account</Trans>,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  transferDetails: <TransferDetailsTitle />,
};

const OVERLAY_MODAL_LABELS: Record<OverlayView, ReactNode> = {
  deposit: <Trans>Deposit to GMX Account</Trans>,
  withdraw: <Trans>Withdraw from GMX Account</Trans>,
  depositStatus: <Trans>Your deposit is in progress</Trans>,
  selectAssetToDeposit: <Trans>Select Asset to Deposit</Trans>,
};

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

function WithdrawalScreen() {
  return (
    <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="gmxAccount">
      <WithdrawalView />
    </SyntheticsStateContextProvider>
  );
}

function OverlayContent({ view }: { view: OverlayView }) {
  switch (view) {
    case "deposit":
      return <DepositView />;
    case "selectAssetToDeposit":
      return <SelectAssetToDepositView />;
    case "depositStatus":
      return <DepositStatusView />;
    case "withdraw":
      return <WithdrawalScreen />;
  }
}

export const GmxAccountModalDesktop = memo(function GmxAccountModalDesktop({ account }: { account: string }) {
  const [modalState, setModalState] = useGmxAccountModalOpen();

  const isOpen = modalState !== false;
  const view: GmxAccountModalView = typeof modalState === "string" ? modalState : "main";

  const slideModalLabel = isMainView(view) ? SLIDE_MODAL_LABELS[view] : SLIDE_MODAL_LABELS.main;
  const showMainViewInBackground = isOverlayView(view);

  const handleOverlayClose = (nextVisible: boolean) => {
    if (nextVisible) return;

    if (view === "depositStatus") {
      userAnalytics.pushEvent<OneClickPromotionEvent>({
        event: "OneClickPromotion",
        data: { action: "UserRejected" },
      });
    }

    setModalState("main");
  };

  return (
    <>
      <SlideModal
        label={slideModalLabel}
        isVisible={isOpen}
        setIsVisible={setModalState}
        desktopContentClassName="!h-[640px] !w-[420px]"
        desktopClassName="!items-start !justify-end !pt-[56px] !pr-8"
        disableOverflowHandling={true}
        className="text-body-medium"
        contentPadding={false}
      >
        {(view === "main" || showMainViewInBackground) && <MainView account={account} />}

        {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
        {view === "transferDetails" && <TransferDetailsView />}
      </SlideModal>

      {isOverlayView(view) && (
        <ModalWithPortal
          label={OVERLAY_MODAL_LABELS[view]}
          isVisible={isOpen}
          setIsVisible={handleOverlayClose}
          contentPadding={false}
          disableOverflowHandling={true}
          contentClassName="!h-[640px] !w-[420px] !overflow-hidden text-body-medium"
          zIndex={1002}
        >
          <div className="flex min-h-0 grow flex-col">
            <OverlayContent view={view} />
          </div>
        </ModalWithPortal>
      )}
    </>
  );
});
