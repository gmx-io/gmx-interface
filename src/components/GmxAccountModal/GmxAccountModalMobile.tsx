import { Trans } from "@lingui/macro";
import { type ReactNode } from "react";

import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen, useGmxAccountWalletReceiveViewBackTo } from "context/GmxAccountContext/hooks";
import { userAnalytics } from "lib/userAnalytics";
import { OneClickPromotionEvent } from "lib/userAnalytics/types";

import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SlideModal } from "components/Modal/SlideModal";

import { AvailableToTradeAssetsView } from "./AvailableToTradeAssetsView";
import { DepositStatusView } from "./DepositStatusView";
import { DepositView } from "./DepositView";
import {
  AvailableToTradeAssetsTitle,
  MainViewTitle,
  TitleRow,
  TitleWithBack,
  TransferDetailsTitle,
  TransferHistoryScreen,
  TransferHistoryTitle,
  WithdrawalScreen,
} from "./GmxAccountModalShared";
import { useIsActiveAccountEmbeddedWallet } from "./hooks";
import { MainView } from "./MainView";
import { SelectAssetToDepositView } from "./SelectAssetToDepositView";
import { WalletReceiveOptionsView } from "./WalletReceiveOptionsView";
import { WalletReceiveView } from "./WalletReceiveView";
import { WalletSendView } from "./WalletSendView";

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

function ReceiveFundsTitle() {
  const [walletReceiveViewBackTo] = useGmxAccountWalletReceiveViewBackTo();

  return (
    <TitleWithBack backTo={walletReceiveViewBackTo ?? "main"}>
      <Trans>Receive funds</Trans>
    </TitleWithBack>
  );
}

function ReceiveToWalletTitle() {
  const [walletReceiveViewBackTo] = useGmxAccountWalletReceiveViewBackTo();
  const isEmbeddedWallet = useIsActiveAccountEmbeddedWallet();

  return (
    <TitleWithBack backTo={isEmbeddedWallet ? "walletReceiveOptions" : walletReceiveViewBackTo ?? "main"}>
      <Trans>Receive to Wallet</Trans>
    </TitleWithBack>
  );
}

function SendFromWalletTitle() {
  return (
    <TitleWithBack backTo="main">
      <Trans>Send from Wallet</Trans>
    </TitleWithBack>
  );
}

const SLIDE_MODAL_LABELS: Record<Exclude<GmxAccountModalView, "depositStatus">, ReactNode> = {
  main: <MainViewTitle />,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  transferDetails: <TransferDetailsTitle />,
  transferHistory: <TransferHistoryTitle />,
  deposit: <DepositTitle />,
  withdraw: <WithdrawTitle />,
  selectAssetToDeposit: <SelectAssetToDepositTitle />,
  walletReceiveOptions: <ReceiveFundsTitle />,
  walletReceive: <ReceiveToWalletTitle />,
  walletSend: <SendFromWalletTitle />,
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

    setModalState("transferHistory");
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
        hideHeaderBorder
      >
        {view === "main" && <MainView account={account} />}
        {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
        {(view === "transferHistory" || view === "transferDetails") && (
          <TransferHistoryScreen showDetails={view === "transferDetails"} />
        )}
        {view === "deposit" && <DepositView />}
        {view === "selectAssetToDeposit" && <SelectAssetToDepositView />}
        {view === "withdraw" && <WithdrawalScreen />}
        {view === "walletReceiveOptions" && <WalletReceiveOptionsView />}
        {view === "walletReceive" && <WalletReceiveView />}
        {view === "walletSend" && <WalletSendView />}
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
