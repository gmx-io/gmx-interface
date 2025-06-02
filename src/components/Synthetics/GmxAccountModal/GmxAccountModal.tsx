import { Trans } from "@lingui/macro";
import { memo, useEffect } from "react";
import { IoArrowBack } from "react-icons/io5";

import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import useWallet from "lib/wallets/useWallet";

import { SlideModal } from "components/Modal/SlideModal";

import { AvailableToTradeAssetsView } from "./AvailableToTradeAssetsView";
import { DepositView } from "./DepositView";
import { MainView } from "./MainView";
import { SelectAssetToDepositView } from "./SelectAssetToDepositView";
import { TransferDetailsView } from "./TransferDetailsView";
import { WithdrawView } from "./WithdrawView";

const AvailableToTradeAssetsTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Available to Trade Assets</Trans>
    </div>
  );
};

const TransferDetailsTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Transfer Details</Trans>
    </div>
  );
};

const DepositTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Deposit</Trans>
    </div>
  );
};

const SelectAssetToDepositTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
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
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Withdraw</Trans>
    </div>
  );
};

const VIEW_TITLE: Record<GmxAccountModalView, React.ReactNode> = {
  main: <Trans>GMX Account</Trans>,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  transferDetails: <TransferDetailsTitle />,
  deposit: <DepositTitle />,
  selectAssetToDeposit: <SelectAssetToDepositTitle />,
  withdraw: <WithdrawTitle />,
};

export const GmxAccountModal = memo(() => {
  const { account } = useWallet();
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();

  const isVisible = isVisibleOrView !== false && account !== undefined;
  const view = typeof isVisibleOrView === "string" ? isVisibleOrView : "main";

  useEffect(() => {
    if (!account && Boolean(isVisibleOrView)) {
      setIsVisibleOrView(false);
    }
  }, [account, isVisibleOrView, setIsVisibleOrView]);

  return (
    <SlideModal
      label={VIEW_TITLE[view]}
      isVisible={isVisible}
      setIsVisible={setIsVisibleOrView}
      desktopContentClassName="!h-[640px] !w-[400px] !bg-[transparent]"
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
          <WithdrawView />
        </SyntheticsStateContextProvider>
      )}
    </SlideModal>
  );
});
