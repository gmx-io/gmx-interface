import { Trans } from "@lingui/macro";
import { type ReactNode } from "react";

import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { userAnalytics } from "lib/userAnalytics";
import { OneClickPromotionEvent } from "lib/userAnalytics/types";

import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SlideModal } from "components/Modal/SlideModal";

import { AvailableToTradeAssetsView } from "./AvailableToTradeAssetsView";
import { DepositStatusView } from "./DepositStatusView";
import { DepositView } from "./DepositView";
import { AvailableToTradeAssetsTitle, TransferDetailsTitle, WithdrawalScreen } from "./GmxAccountModalShared";
import { MainView } from "./MainView";
import { SelectAssetToDepositView } from "./SelectAssetToDepositView";
import { TransferDetailsView } from "./TransferDetailsView";

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

export function GmxAccountModalDesktop({ account }: { account: string }) {
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
          contentClassName={
            view === "depositStatus"
              ? "!w-[420px] text-body-medium"
              : "!h-[640px] !w-[420px] !overflow-hidden text-body-medium"
          }
          zIndex={1002}
        >
          <div className="flex min-h-0 grow flex-col">
            <OverlayContent view={view} />
          </div>
        </ModalWithPortal>
      )}
    </>
  );
}
