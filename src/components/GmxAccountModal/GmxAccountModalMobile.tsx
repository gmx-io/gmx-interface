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
import {
  AvailableToTradeAssetsTitle,
  TitleRow,
  TitleWithBack,
  TransferDetailsTitle,
  WithdrawalScreen,
} from "./GmxAccountModalShared";
import { MainView } from "./MainView";
import { SelectAssetToDepositView } from "./SelectAssetToDepositView";
import { TransferDetailsView } from "./TransferDetailsView";

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
      <Trans>Deposit in progress...</Trans>
    </TitleRow>
  );
}

function SelectAssetToDepositTitle() {
  return (
    <TitleWithBack backTo="deposit">
      <Trans>Select asset to deposit</Trans>
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

export function GmxAccountModalMobile({ account }: { account: string }) {
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
}
