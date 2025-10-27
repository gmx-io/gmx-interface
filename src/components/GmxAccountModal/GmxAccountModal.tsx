import { Trans } from "@lingui/macro";
import { memo, useEffect } from "react";
import { useAccount } from "wagmi";

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

const AvailableToTradeAssetsTitle = () => {
  const { srcChainId } = useChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  return (
    <div className="flex items-center gap-8">
      <ArrowLeftIcon
        className="size-20 text-slate-100 outline-none"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      {srcChainId !== undefined ? <Trans>GMX Account Balance</Trans> : <Trans>Available to Trade Assets</Trans>}
    </div>
  );
};

const TransferDetailsTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const selectedTransfer = useGmxAccountFundingHistoryItem(selectedTransferGuid);

  return (
    <div className="flex items-center gap-8">
      <ArrowLeftIcon
        className="size-20 text-slate-100 outline-none"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      {selectedTransfer?.operation === "withdrawal" ? (
        <Trans>Withdrawal from GMX Account</Trans>
      ) : (
        <Trans>Deposit to GMX Account</Trans>
      )}
    </div>
  );
};

const DepositTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <ArrowLeftIcon
        className="size-20 text-slate-100 outline-none"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Deposit to GMX Account</Trans>
    </div>
  );
};

const DepositStatusTitle = () => {
  return (
    <div className="flex items-center gap-8">
      <Trans>Your deposit is in progress</Trans>
    </div>
  );
};

const SelectAssetToDepositTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <ArrowLeftIcon
        className="size-20 text-slate-100 outline-none"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("deposit")}
      />
      <Trans>Select Asset to Deposit</Trans>
    </div>
  );
};

const WithdrawTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <ArrowLeftIcon
        className="size-20 text-slate-100 outline-none"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Withdraw from GMX Account</Trans>
    </div>
  );
};

const VIEW_TITLE: Record<GmxAccountModalView, React.ReactNode> = {
  main: <Trans>GMX Account</Trans>,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  transferDetails: <TransferDetailsTitle />,
  deposit: <DepositTitle />,
  depositStatus: <DepositStatusTitle />,
  selectAssetToDeposit: <SelectAssetToDepositTitle />,
  withdraw: <WithdrawTitle />,
};

export const GmxAccountModal = memo(() => {
  const { address: account } = useAccount();
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const isVisible = isVisibleOrView !== false && account !== undefined;
  const view = typeof isVisibleOrView === "string" ? isVisibleOrView : "main";

  useEffect(() => {
    if (!account && Boolean(isVisibleOrView)) {
      setIsVisibleOrView(false);
    }
  }, [account, isVisibleOrView, setIsVisibleOrView]);

  if (view === "depositStatus") {
    const handleDepositStatusModalVisibility = (nextVisible: boolean) => {
      if (!nextVisible) {
        if (selectedTransferGuid) {
          userAnalytics.pushEvent<OneClickPromotionEvent>({
            event: "OneClickPromotion",
            data: { action: "UserRejected" },
          });
        }

        setIsVisibleOrView("main");
      }
    };

    return (
      <ModalWithPortal
        label={VIEW_TITLE[view]}
        isVisible={isVisible}
        setIsVisible={handleDepositStatusModalVisibility}
        withMobileBottomPosition={true}
        contentPadding={false}
        contentClassName="w-[420px]"
      >
        <DepositStatusView />
      </ModalWithPortal>
    );
  }

  return (
    <SlideModal
      label={VIEW_TITLE[view]}
      isVisible={isVisible}
      setIsVisible={setIsVisibleOrView}
      desktopContentClassName="!h-[640px] !w-[461px]"
      disableOverflowHandling={true}
      className="text-body-medium"
      contentPadding={false}
    >
      {view === "main" && account && <MainView account={account} />}
      {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
      {view === "transferDetails" && <TransferDetailsView />}
      {view === "deposit" && <DepositView />}
      {view === "selectAssetToDeposit" && <SelectAssetToDepositView />}
      {view === "withdraw" && (
        <SyntheticsStateContextProvider skipLocalReferralCode={false} pageType="gmxAccount">
          <WithdrawalView />
        </SyntheticsStateContextProvider>
      )}
    </SlideModal>
  );
});
