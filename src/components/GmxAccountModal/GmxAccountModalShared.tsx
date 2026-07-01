import { Trans } from "@lingui/macro";
import { type KeyboardEvent, type ReactNode } from "react";

import { getChainName } from "config/chains";
import { getAccountModalMode } from "config/multichain";
import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { SyntheticsStateContextProvider } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useGmxAccountFundingHistoryItem } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowLeftIcon from "img/ic_arrow_left.svg?react";

import { TransferHistoryView } from "./MainView";
import { TransferDetailsView } from "./TransferDetailsView";
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

const DOCS_MULTICHAIN_URL = "https://docs.gmx.io/docs/trading/overview/#multichain-trading";

function WalletOnlyInfo({ chainName }: { chainName: string }) {
  return (
    <div className="flex flex-col gap-16">
      <Trans>
        You can open isolated positions on GMX using funds directly from your connected wallet. GMX Account is not
        available on {chainName}. To use GMX Account, switch to Arbitrum.
      </Trans>
      <ExternalLink href={DOCS_MULTICHAIN_URL} variant="icon-arrow" className="font-medium text-blue-300">
        <Trans>Read more</Trans>
      </ExternalLink>
    </div>
  );
}

function GmxAccountInfo({
  sourceChainName,
  settlementChainName,
}: {
  sourceChainName: string;
  settlementChainName: string;
}) {
  return (
    <Trans>
      You can open isolated positions on GMX using your GMX Account. Wallet funds on {sourceChainName} are not used
      directly for GMX trades. GMX Account uses a separate trading balance linked to your wallet. To trade, deposit
      funds from your wallet to your GMX Account. All positions belong to the same connected wallet and are shown
      together, whether they were opened from {settlementChainName} wallet funds or GMX Account funds.
    </Trans>
  );
}

function WalletAndGmxAccountInfo() {
  return (
    <div className="flex flex-col gap-16">
      <Trans>
        You can open isolated positions on GMX using funds from either your wallet or your GMX Account. Wallet uses
        funds directly from your connected wallet. GMX Account uses a separate trading balance linked to that wallet. To
        use it, fund it with a deposit to your GMX Account. All positions belong to the same connected wallet and are
        shown together, whether they were opened with wallet funds or GMX Account funds.
      </Trans>
      <ExternalLink href={DOCS_MULTICHAIN_URL} variant="icon-arrow" className="font-medium text-blue-300">
        <Trans>Read more</Trans>
      </ExternalLink>
    </div>
  );
}

export function MainViewTitle() {
  const { chainId, srcChainId } = useChainId();
  const mode = getAccountModalMode(chainId, srcChainId);

  const settlementChainName = getChainName(chainId);
  const sourceChainName = srcChainId !== undefined ? getChainName(srcChainId) : settlementChainName;

  let title: ReactNode;
  let info: ReactNode;

  if (mode === "walletOnly") {
    title = <Trans>Wallet</Trans>;
    info = <WalletOnlyInfo chainName={settlementChainName} />;
  } else if (mode === "gmxAccount") {
    title = <Trans>GMX Account</Trans>;
    info = <GmxAccountInfo sourceChainName={sourceChainName} settlementChainName={settlementChainName} />;
  } else {
    title = <Trans>Wallet & GMX Account</Trans>;
    info = <WalletAndGmxAccountInfo />;
  }

  return (
    <TooltipWithPortal
      content={<div className="text-typography-secondary">{info}</div>}
      variant="iconStroke"
      iconClassName="text-typography-secondary"
      tooltipClassName="!max-w-[320px]"
    >
      {title}
    </TooltipWithPortal>
  );
}

export function AvailableToTradeAssetsTitle() {
  const { srcChainId } = useChainId();

  return (
    <TitleWithBack backTo="main">
      {srcChainId !== undefined ? <Trans>GMX Account balance</Trans> : <Trans>Available to trade assets</Trans>}
    </TitleWithBack>
  );
}

export function TransferDetailsTitle() {
  const [selectedTransferGuid] = useGmxAccountSelectedTransferGuid();
  const selectedTransfer = useGmxAccountFundingHistoryItem(selectedTransferGuid);

  return (
    <TitleWithBack backTo="transferHistory">
      {selectedTransfer?.operation === "withdrawal" ? (
        <Trans>Withdrawal from GMX Account</Trans>
      ) : (
        <Trans>Deposit to GMX Account</Trans>
      )}
    </TitleWithBack>
  );
}

export function TransferHistoryTitle() {
  return (
    <TitleWithBack backTo="main">
      <Trans>Transfer history</Trans>
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

export function TransferHistoryScreen({ showDetails }: { showDetails: boolean }) {
  return (
    <div className="relative flex min-h-0 grow flex-col">
      <div className="isolate flex min-h-0 grow flex-col">
        <TransferHistoryView />
      </div>
      {showDetails && (
        <div className="absolute inset-0 flex flex-col bg-slate-900">
          <TransferDetailsView />
        </div>
      )}
    </div>
  );
}
