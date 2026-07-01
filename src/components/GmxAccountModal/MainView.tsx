import { Trans, t } from "@lingui/macro";
import { getEmbeddedConnectedWallet, useExportWallet, useWallets } from "@privy-io/react-auth";
import { ReactNode, useEffect, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useHistory } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { isAddressEqual } from "viem";

import { BOTANIX, getChainName, getExplorerUrl } from "config/chains";
import type { ContractsChainId, SourceChainId } from "config/chains";
import { GMX_ACCOUNT_CONNECTED_BANNER_DISMISSED_KEY } from "config/localStorage";
import { getAccountModalMode } from "config/multichain";
import {
  useGmxAccountAvailableAssetsFilter,
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransferGuid,
} from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { isMultichainFundingItemLoading } from "domain/multichain/isMultichainFundingItemLoading";
import type { MultichainFundingHistoryItem } from "domain/multichain/types";
import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";
import { formatRelativeDateWithComma } from "lib/dates";
import { useLocalizedMap } from "lib/i18n";
import { useENS } from "lib/legacy";
import { useLocalStorageByChainId } from "lib/localStorage";
import { formatUsd } from "lib/numbers";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { shortenAddressOrEns, switchNetwork } from "lib/wallets";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { getToken } from "sdk/configs/tokens";
import { Token } from "sdk/utils/tokens/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import Button from "components/Button/Button";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import ArrowDownIcon from "img/ic_arrow_down.svg?react";
import ArrowRightIcon from "img/ic_arrow_right.svg?react";
import BellIcon from "img/ic_bell.svg?react";
import CheckIcon from "img/ic_check.svg?react";
import ChevronLeftIcon from "img/ic_chevron_left.svg?react";
import ClockIcon from "img/ic_clock.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExplorerIcon from "img/ic_explorer.svg?react";
import KeyIcon from "img/ic_key.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";
import ReceiveIcon from "img/ic_receive.svg?react";
import SendIcon from "img/ic_send.svg?react";
import SettingsIcon from "img/ic_settings.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";
import WalletIcon from "img/ic_wallet.svg?react";

import { useAvailableToTradeAssetSettlementChain } from "./hooks";
import { FUNDING_OPERATIONS_LABELS } from "./keys";

function BalanceAmount({ usd, onClick }: { usd: bigint | undefined; onClick: () => void }) {
  return (
    <button className="flex min-h-32 items-center gap-4" onClick={onClick}>
      {usd !== undefined ? (
        <span className="text-h2 normal-nums leading-[30px]">{formatUsd(usd)}</span>
      ) : (
        <Skeleton
          baseColor="#B4BBFF1A"
          highlightColor="#B4BBFF1A"
          width={100}
          height={30}
          className="!block"
          inline={true}
        />
      )}
      <ChevronLeftIcon className="size-16 rotate-180 text-typography-secondary" />
    </button>
  );
}

const WALLET_ICON_BUTTON_BLUE =
  "flex size-28 -m-4 items-center justify-center rounded-8 text-blue-300 gmx-hover:bg-blue-300/20";
const WALLET_ICON_BUTTON_GRAY =
  "flex size-28 -m-4 items-center justify-center rounded-8 text-typography-secondary gmx-hover:bg-fill-surfaceHover gmx-hover:text-typography-primary";

function WalletBlock({ account }: { account: string }) {
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const chainId = srcChainId ?? settlementChainId;

  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setAvailableAssetsFilter] = useGmxAccountAvailableAssetsFilter();
  const { ensName } = useENS(account);
  const [, copyToClipboard] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<number | undefined>(undefined);
  const handleDisconnect = useDisconnectAndClose();
  const { walletUsd } = useAvailableToTradeAssetSettlementChain();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();

  const embeddedWallet = getEmbeddedConnectedWallet(wallets);
  const canExport = Boolean(embeddedWallet && account && isAddressEqual(embeddedWallet.address, account));

  const { isNonEoaAccountOnAnyChain } = useIsNonEoaAccountOnAnyChain();
  const canSend = !isNonEoaAccountOnAnyChain;

  const accountUrl = !account || !chainId ? "" : `${getExplorerUrl(chainId)}address/${account}`;

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  const handleCopyAddress = () => {
    if (account) {
      copyToClipboard(account);
      clearTimeout(copyTimeoutRef.current);
      setIsCopied(true);
      copyTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1000);
    }
  };

  return (
    <div className="flex flex-col gap-8 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12">
      <div className="flex items-center justify-between gap-8">
        <button
          className="flex items-center gap-8 text-typography-secondary gmx-hover:text-typography-primary"
          onClick={handleCopyAddress}
        >
          <WalletIcon className="size-20" />
          <span className="text-12 font-medium">{shortenAddressOrEns(ensName || account, 13)}</span>
          {isCopied ? <CheckIcon className="size-16 text-green-500" /> : <CopyIcon className="size-16" />}
        </button>
        <div className="flex items-center gap-8">
          <TooltipWithPortal content={t`Receive`} position="bottom" tooltipClassName="!min-w-max" variant="none">
            <button className={WALLET_ICON_BUTTON_BLUE} onClick={() => setIsVisibleOrView("walletReceive")}>
              <ReceiveIcon className="size-16" />
            </button>
          </TooltipWithPortal>
          {canSend && (
            <TooltipWithPortal content={t`Send`} position="bottom" tooltipClassName="!min-w-max" variant="none">
              <button className={WALLET_ICON_BUTTON_BLUE} onClick={() => setIsVisibleOrView("walletSend")}>
                <SendIcon className="size-16" />
              </button>
            </TooltipWithPortal>
          )}
          <div className="h-16 border-l-1/2 border-slate-600" />
          {canExport && (
            <TooltipWithPortal
              content={t`Export wallet`}
              position="bottom"
              tooltipClassName="!min-w-max"
              variant="none"
            >
              <button
                className={WALLET_ICON_BUTTON_GRAY}
                onClick={() => {
                  if (embeddedWallet) {
                    exportWallet({ address: embeddedWallet.address });
                  }
                }}
              >
                <KeyIcon className="size-16" />
              </button>
            </TooltipWithPortal>
          )}
          <TooltipWithPortal
            shouldPreventDefault={false}
            content={t`View in explorer`}
            position="bottom"
            tooltipClassName="!min-w-max"
            variant="none"
          >
            <a href={accountUrl} target="_blank" rel="noopener noreferrer" className={WALLET_ICON_BUTTON_GRAY}>
              <ExplorerIcon className="size-16" />
            </a>
          </TooltipWithPortal>
          <TooltipWithPortal content={t`Disconnect`} position="bottom" tooltipClassName="!min-w-max" variant="none">
            <button className={WALLET_ICON_BUTTON_GRAY} onClick={handleDisconnect}>
              <DisconnectIcon className="size-16" />
            </button>
          </TooltipWithPortal>
        </div>
      </div>
      <BalanceAmount
        usd={walletUsd}
        onClick={() => {
          setAvailableAssetsFilter("wallet");
          setIsVisibleOrView("availableToTradeAssets");
        }}
      />
    </div>
  );
}

function ConnectedToSourceChainBanner({
  srcChainId,
  settlementChainId,
}: {
  srcChainId: SourceChainId;
  settlementChainId: ContractsChainId;
}) {
  const { active } = useWallet();
  const [isDismissed, setIsDismissed] = useLocalStorageByChainId<boolean>(
    srcChainId,
    GMX_ACCOUNT_CONNECTED_BANNER_DISMISSED_KEY,
    false
  );

  const sourceChainName = getChainName(srcChainId);
  const settlementChainName = getChainName(settlementChainId);

  const handleSwitch = () => {
    switchNetwork(settlementChainId, active, { fallbackToAppSelectionOnError: true });
  };

  if (isDismissed) {
    return null;
  }

  return (
    <AlertInfoCard type="info" onClose={() => setIsDismissed(true)}>
      <Trans>
        Connected to {sourceChainName}. Wallet funds on this network can be deposited to GMX Account for{" "}
        {settlementChainName} trading. To trade directly with {settlementChainName} wallet balance,{" "}
        <span role="button" tabIndex={0} className="cursor-pointer text-blue-300 underline" onClick={handleSwitch}>
          switch to {settlementChainName}
        </span>
        .
      </Trans>
    </AlertInfoCard>
  );
}

function GmxAccountBlock({ showDisconnectButton }: { showDisconnectButton: boolean }) {
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setAvailableAssetsFilter] = useGmxAccountAvailableAssetsFilter();
  const { gmxAccountUsd } = useAvailableToTradeAssetSettlementChain();
  const handleDisconnect = useDisconnectAndClose();

  const hasBalance = gmxAccountUsd !== undefined && gmxAccountUsd > 0n;

  return (
    <div className="flex flex-col gap-12 rounded-12 border-1/2 border-stroke-primary bg-slate-950/50 p-12">
      <div className="flex items-start justify-between gap-8">
        <div className="flex flex-col gap-8">
          <span className="text-body-small text-typography-secondary">
            <Trans>GMX Account Balance</Trans>
          </span>
          <BalanceAmount
            usd={gmxAccountUsd}
            onClick={() => {
              setAvailableAssetsFilter("gmxAccount");
              setIsVisibleOrView("availableToTradeAssets");
            }}
          />
        </div>
        {showDisconnectButton && (
          <TooltipWithPortal content={t`Disconnect`} position="bottom" tooltipClassName="!min-w-max" variant="none">
            <button className={WALLET_ICON_BUTTON_GRAY} onClick={handleDisconnect}>
              <DisconnectIcon className="size-16" />
            </button>
          </TooltipWithPortal>
        )}
      </div>

      {srcChainId !== undefined && (
        <ConnectedToSourceChainBanner srcChainId={srcChainId} settlementChainId={settlementChainId} />
      )}

      {hasBalance ? (
        <div className="flex gap-12">
          <Button
            variant="secondary"
            size="medium"
            className="flex-grow basis-1/2 !text-typography-primary"
            onClick={() => setIsVisibleOrView("deposit")}
          >
            <ArrowDownIcon className="size-20 text-blue-300" />
            <Trans>Deposit</Trans>
          </Button>
          <Button
            variant="secondary"
            size="medium"
            className="flex-grow basis-1/2 !text-typography-primary"
            onClick={() => setIsVisibleOrView("withdraw")}
          >
            <ArrowDownIcon className="size-20 rotate-180 text-blue-300" />
            <Trans>Withdraw</Trans>
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="medium"
          className="w-full !text-typography-primary"
          onClick={() => setIsVisibleOrView("deposit")}
        >
          <ArrowDownIcon className="size-20 text-blue-300" />
          <Trans>Deposit to GMX Account</Trans>
        </Button>
      )}

      <button
        className="flex items-center gap-8 py-4 text-typography-secondary gmx-hover:text-typography-primary"
        onClick={() => setIsVisibleOrView("transferHistory")}
      >
        <ClockIcon className="size-16" />
        <span className="text-13">
          <Trans>Transfer history</Trans>
        </span>
      </button>
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: ReactNode; label: ReactNode; onClick: () => void }) {
  return (
    <button
      className="-mx-12 flex items-center justify-between rounded-8 p-12 -outline-offset-4 gmx-hover:bg-fill-surfaceElevated50"
      onClick={onClick}
    >
      <div className="text-body-medium flex items-center gap-8 text-typography-secondary">
        {icon}
        {label}
      </div>
      <ArrowRightIcon className="size-16 text-typography-secondary" />
    </button>
  );
}

function MenuList({ account }: { account: string }) {
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const chainId = srcChainId ?? settlementChainId;
  const history = useHistory();
  const { openNotifyModal } = useNotifyModalState();
  const { setIsSettingsVisible } = useSettings();

  const showNotify = settlementChainId !== BOTANIX;

  const handleNotificationsClick = () => {
    openNotifyModal();
    setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  const handlePnlAnalysisClick = () => {
    if (!account || !chainId) return;
    history.push(buildAccountDashboardUrl(account, chainId, 2));
    setIsVisible(false);
  };

  const handleSettingsClick = () => {
    setIsSettingsVisible(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  return (
    <div className="flex flex-col">
      <MenuRow
        icon={<PnlAnalysisIcon className="size-16" />}
        label={<Trans>PnL Analysis</Trans>}
        onClick={handlePnlAnalysisClick}
      />
      {showNotify && (
        <MenuRow
          icon={<BellIcon className="size-16" />}
          label={<Trans>Notifications</Trans>}
          onClick={handleNotificationsClick}
        />
      )}
      <MenuRow
        icon={<SettingsIcon className="size-16" />}
        label={<Trans>Settings</Trans>}
        onClick={handleSettingsClick}
      />
    </div>
  );
}

export const MainView = ({ account }: { account: string }) => {
  const { chainId, srcChainId } = useChainId();
  const mode = getAccountModalMode(chainId, srcChainId);

  return (
    <div className="text-body-medium flex grow flex-col gap-[--padding-adaptive] overflow-y-hidden">
      <div className="flex flex-col gap-12 px-adaptive pb-12 pt-4">
        {mode !== "gmxAccount" && <WalletBlock account={account} />}
        {mode !== "walletOnly" && <GmxAccountBlock showDisconnectButton={mode === "gmxAccount"} />}
        <MenuList account={account} />
      </div>
    </div>
  );
};

function FundingHistoryItemLabel({
  step,
  operation,
  isExecutionError,
}: Pick<MultichainFundingHistoryItem, "step" | "operation" | "isExecutionError">) {
  const labels = useLocalizedMap(FUNDING_OPERATIONS_LABELS);

  const isLoading = isMultichainFundingItemLoading({ operation, step, isExecutionError });

  const key: keyof typeof labels = `${operation}${isExecutionError ? "-failed" : ""}`;
  let text = labels[key] ?? `${operation} ${isExecutionError ? " failed" : ""}`;

  if (isLoading) {
    return (
      <div className="text-body-small flex items-center gap-4 text-slate-100">
        <SpinnerIcon className="size-16 animate-spin" />
        {text}
      </div>
    );
  } else if (isExecutionError) {
    return <div className="text-body-small text-red-500">{text}</div>;
  }

  return <div className="text-body-small text-slate-100">{text}</div>;
}

type DisplayFundingHistoryItem = Omit<MultichainFundingHistoryItem, "token"> & {
  token: Token;
};

export function TransferHistoryView() {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const { fundingHistory, isLoading } = useGmxAccountFundingHistory();

  const filteredFundingHistory: DisplayFundingHistoryItem[] | undefined = fundingHistory
    ?.map((transfer): DisplayFundingHistoryItem | undefined => {
      const token = getToken(transfer.settlementChainId, transfer.token);

      if (!token) {
        return undefined;
      }

      return { ...transfer, token };
    })
    .filter((transfer): transfer is DisplayFundingHistoryItem => {
      if (!transfer) {
        return false;
      }

      const matchesSearch = transfer.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  const handleTransferClick = (transfer: DisplayFundingHistoryItem) => {
    setSelectedTransferGuid(transfer.id);
    setIsVisibleOrView("transferDetails");
  };

  return (
    <div className="flex grow flex-col gap-12 overflow-y-hidden">
      {Boolean(fundingHistory?.length) && (
        <div className="px-adaptive">
          <SearchInput value={searchQuery} setValue={setSearchQuery} />
        </div>
      )}
      <VerticalScrollFadeContainer className="flex grow flex-col">
        {filteredFundingHistory?.map((transfer) => (
          <div
            role="button"
            tabIndex={0}
            key={transfer.id}
            className="flex w-full cursor-pointer items-center justify-between px-adaptive py-8 text-left -outline-offset-4 gmx-hover:bg-fill-surfaceElevated50"
            onClick={() => handleTransferClick(transfer)}
          >
            <div className="flex items-center gap-16">
              <TokenIcon
                symbol={transfer.token.symbol}
                displaySize={40}
                chainIdBadge={transfer.sourceChainId === 0 ? transfer.settlementChainId : transfer.sourceChainId}
              />
              <div>
                <div className="text-body-large">{transfer.token.symbol}</div>
                <FundingHistoryItemLabel
                  step={transfer.step}
                  operation={transfer.operation}
                  isExecutionError={transfer.isExecutionError}
                />
              </div>
            </div>
            <div className="text-right">
              <Amount
                className="text-body-large"
                amount={(transfer.operation === "deposit" ? 1n : -1n) * transfer.sentAmount}
                decimals={transfer.token.decimals}
                isStable={transfer.token.isStable}
                signed
              />
              <div className="text-body-small text-slate-100">
                {formatRelativeDateWithComma(transfer.sentTimestamp)}
              </div>
            </div>
          </div>
        ))}

        {!isLoading && fundingHistory && fundingHistory.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 p-adaptive text-slate-100">
            <Trans>No funding activity</Trans>
          </div>
        )}
        {!isLoading && filteredFundingHistory?.length === 0 && fundingHistory && fundingHistory.length > 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 p-adaptive text-slate-100">
            <Trans>No funding activity matching search</Trans>
          </div>
        )}
        {isLoading && (
          <div className="flex grow items-center justify-center p-adaptive text-slate-100">
            <SpinnerIcon className="size-24 animate-spin" />
          </div>
        )}
      </VerticalScrollFadeContainer>
    </div>
  );
}
