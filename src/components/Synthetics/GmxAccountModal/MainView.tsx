import { MessageDescriptor } from "@lingui/core";
import { Trans, msg, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import { IoArrowDown } from "react-icons/io5";
import { TbLoader2 } from "react-icons/tb";
import { useCopyToClipboard } from "react-use";
import { useDisconnect } from "wagmi";

import { getExplorerUrl } from "config/chains";
import { CURRENT_PROVIDER_LOCALSTORAGE_KEY, SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import { isSettlementChain } from "context/GmxAccountContext/config";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { MultichainFundingHistoryItem } from "context/GmxAccountContext/types";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { useENS } from "lib/legacy";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { getToken } from "sdk/configs/tokens";
import { Token } from "sdk/types/tokens";

import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import BellIcon from "img/bell.svg?react";
import copy from "img/ic_copy_20.svg";
import InfoIconComponent from "img/ic_info.svg?react";
import externalLink from "img/ic_new_link_20.svg";
import SettingsIcon24 from "img/ic_settings_24.svg?react";
import disconnectIcon from "img/ic_sign_out_20.svg";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import {
  useAvailableToTradeAssetMultichain,
  useAvailableToTradeAssetSettlementChain,
  useAvailableToTradeAssetSymbolsMultichain,
  useAvailableToTradeAssetSymbolsSettlementChain,
} from "./hooks";
import { useGmxAccountFundingHistory } from "./useGmxAccountFundingHistory";

const TokenIcons = ({ tokens }: { tokens: string[] }) => {
  const displayTokens = tokens.slice(0, 3);
  const remainingCount = Math.max(0, tokens.length - 3);

  return (
    <div className="flex items-center">
      {displayTokens.map((token, index) => (
        <div
          key={token}
          className={cx(
            "flex size-20 items-center justify-center rounded-full border border-cold-blue-500",
            index > 0 && "-ml-8"
          )}
        >
          <TokenIcon symbol={token} displaySize={18} importSize={24} />
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="-ml-8 flex size-20 items-center justify-center rounded-full border border-cold-blue-500 bg-white text-12 text-black">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

const FUNDING_OP_LABELS: Partial<
  Record<`${"deposit" | "withdrawal"}-${"sent" | "received" | "executed"}${"" | "-failed"}`, MessageDescriptor>
> = {
  "deposit-sent": msg`Deposit Sent`,
  "deposit-received": msg`Deposit Received`,
  "deposit-executed": msg`Deposit Executed`,
  "withdrawal-sent": msg`Withdrawal Sent`,
  "withdrawal-received": msg`Withdrawal Received`,
  "deposit-executed-failed": msg`Failed to deposit`,
};

export function FundingHistoryItemLabel({
  step,
  operation,
  isExecutionError,
}: Pick<MultichainFundingHistoryItem, "step" | "operation" | "isExecutionError">) {
  const labels = useLocalizedMap(FUNDING_OP_LABELS);

  const isLoading = (step === "sent" || (operation === "deposit" && step === "received")) && !isExecutionError;

  const key = `${operation}-${step}${isExecutionError ? "-failed" : ""}`;
  let text = labels[key] || `${operation} ${step}${isExecutionError ? " failed" : ""}`;

  if (isLoading) {
    return (
      <div className="text-body-small flex items-center gap-4 text-slate-100">
        <TbLoader2 className="size-16 animate-spin" />
        {text}
      </div>
    );
  } else if (isExecutionError) {
    return <div className="text-body-small text-red-500">{text}</div>;
  }

  return <div className="text-body-small text-slate-100">{text}</div>;
}

const Toolbar = ({ account }: { account: string }) => {
  const { disconnect } = useDisconnect();
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { chainId: settlementChainId, srcChainId } = useChainId();

  const chainId = srcChainId ?? settlementChainId;

  const { openNotifyModal } = useNotifyModalState();
  const { setIsSettingsVisible } = useSettings();
  const { ensName } = useENS(account);
  const [, copyToClipboard] = useCopyToClipboard();

  const handleCopyAddress = () => {
    if (account) {
      copyToClipboard(account);
      helperToast.success(t`Address copied to your clipboard`);
    }
  };

  const accountUrl = useMemo(() => {
    if (!account || !chainId) return "";
    return `${getExplorerUrl(chainId)}address/${account}`;
  }, [account, chainId]);

  const handleDisconnect = () => {
    userAnalytics.pushEvent<DisconnectWalletEvent>({
      event: "ConnectWalletAction",
      data: {
        action: "Disconnect",
      },
    });
    disconnect();
    localStorage.removeItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY);
    localStorage.removeItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY);
    setIsVisible(false);
  };

  const handleNotificationsClick = () => {
    setIsVisible(false);
    openNotifyModal();
  };

  const handleSettingsClick = () => {
    setIsVisible(false);
    setIsSettingsVisible(true);
  };

  return (
    <div className="flex items-stretch justify-between gap-8">
      <button
        className="text-body-medium inline-flex items-center justify-center rounded-4 border border-stroke-primary px-11 py-7 text-white hover:bg-[#808aff14] active:bg-slate-700"
        onClick={handleCopyAddress}
      >
        <div className="flex items-center gap-8">
          <Avatar size={20} ensName={ensName} address={account} />

          <span className="mx-8">{shortenAddressOrEns(ensName || account, 13)}</span>

          <img src={copy} alt="Copy" />
        </div>
      </button>
      <div className="flex items-center gap-8">
        <TooltipWithPortal
          shouldPreventDefault={false}
          content={t`View in Explorer`}
          position="bottom"
          tooltipClassName="!min-w-max"
        >
          <ExternalLink
            href={accountUrl}
            className="flex size-36 items-center justify-center rounded-4 border border-stroke-primary hover:bg-slate-700"
          >
            <img src={externalLink} alt="External Link" />
          </ExternalLink>
        </TooltipWithPortal>
        <TooltipWithPortal content={t`Notifications`} position="bottom" tooltipClassName="!min-w-max">
          <button
            className="flex size-36 items-center justify-center rounded-4 border border-stroke-primary hover:bg-slate-700"
            onClick={handleNotificationsClick}
          >
            <BellIcon className="text-slate-100" />
          </button>
        </TooltipWithPortal>
        <TooltipWithPortal content={t`Settings`} position="bottom" tooltipClassName="!min-w-max">
          <button
            className="flex size-36 items-center justify-center rounded-4 border border-stroke-primary hover:bg-slate-700"
            onClick={handleSettingsClick}
          >
            <SettingsIcon24 width={20} height={20} className="text-slate-100" />
          </button>
        </TooltipWithPortal>
        <TooltipWithPortal content={t`Disconnect`} position="bottom" tooltipClassName="!min-w-max">
          <button
            className="flex size-36 items-center justify-center rounded-4 border border-stroke-primary hover:bg-slate-700"
            onClick={handleDisconnect}
          >
            <img src={disconnectIcon} alt="Disconnect" />
          </button>
        </TooltipWithPortal>
      </div>
    </div>
  );
};

function SettlementChainBalance() {
  const { totalUsd, gmxAccountUsd, walletUsd } = useAvailableToTradeAssetSettlementChain();
  const availableToTradeAssetSymbols = useAvailableToTradeAssetSymbolsSettlementChain();

  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleAvailableToTradeClick = () => {
    setIsVisibleOrView("availableToTradeAssets");
  };

  return (
    <div className="flex flex-col gap-8 rounded-4 bg-cold-blue-900 p-12">
      <div className="text-body-small text-slate-100">Available to Trade</div>
      <div className="flex items-center justify-between gap-8">
        <div className="text-24">{formatUsd(totalUsd)}</div>
        <button
          className="flex items-center gap-4 rounded-4 bg-cold-blue-700 py-4 pl-8 pr-4 gmx-hover:bg-cold-blue-500"
          onClick={handleAvailableToTradeClick}
        >
          <div>All assets</div>
          <TokenIcons tokens={availableToTradeAssetSymbols} />
          <IoArrowDown className="block size-16 -rotate-90 text-slate-100" />
        </button>
      </div>
      <div className="my-4 h-1 bg-stroke-primary" />
      <SyntheticsInfoRow label="Wallet" value={formatUsd(walletUsd)} />
      <SyntheticsInfoRow label="GMX Balance" value={formatUsd(gmxAccountUsd)} />
    </div>
  );
}

function MultichainBalance() {
  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();
  const availableToTradeAssetSymbols = useAvailableToTradeAssetSymbolsMultichain();

  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleAvailableToTradeClick = () => {
    setIsVisibleOrView("availableToTradeAssets");
  };

  return (
    <div className="flex flex-col gap-8 rounded-4 bg-cold-blue-900 p-12">
      <div className="text-body-small text-slate-100">
        <Trans>GMX Balance</Trans>
      </div>
      <div className="flex items-center justify-between gap-8">
        <div className="text-24">{formatUsd(gmxAccountUsd)}</div>
        <button
          className="flex items-center gap-4 rounded-4 bg-cold-blue-700 py-4 pl-8 pr-4 gmx-hover:bg-cold-blue-500"
          onClick={handleAvailableToTradeClick}
        >
          <Trans>All assets</Trans>
          <TokenIcons tokens={availableToTradeAssetSymbols} />
          <IoArrowDown className="block size-16 -rotate-90 text-slate-100" />
        </button>
      </div>
    </div>
  );
}

const BalanceSection = () => {
  const { chainId } = useWallet();

  return isSettlementChain(chainId!) ? <SettlementChainBalance /> : <MultichainBalance />;
};

const ActionButtons = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleDepositClick = () => {
    setIsVisibleOrView("deposit");
  };

  const handleWithdrawClick = () => {
    setIsVisibleOrView("withdraw");
  };

  return (
    <div className="flex gap-8">
      <Button variant="secondary" className="flex-1" onClick={handleDepositClick}>
        Deposit
      </Button>
      <Button variant="secondary" className="flex-1" onClick={handleWithdrawClick}>
        Withdraw
      </Button>
    </div>
  );
};

type DisplayFundingHistoryItem = Omit<MultichainFundingHistoryItem, "token"> & {
  token: Token;
};

const FundingHistorySection = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  const fundingHistory = useGmxAccountFundingHistory();

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
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex items-center justify-between px-16">
        <div className="text-body-large">GMX Funding Activity</div>
      </div>
      <div className="px-16">
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>
      <div className="grow overflow-y-auto">
        {filteredFundingHistory?.map((transfer) => (
          <div
            role="button"
            tabIndex={0}
            key={transfer.id}
            className="flex w-full cursor-pointer items-center justify-between px-16 py-8 text-left -outline-offset-4 gmx-hover:bg-slate-700"
            onClick={() => handleTransferClick(transfer)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon symbol={transfer.token.symbol} displaySize={40} importSize={40} />
              <div>
                <div>{transfer.token.symbol}</div>
                <FundingHistoryItemLabel
                  step={transfer.step}
                  operation={transfer.operation}
                  isExecutionError={transfer.isExecutionError}
                />
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(transfer.sentAmount, transfer.token.decimals, transfer.token.symbol)}</div>
              {/* <div className="text-body-small text-slate-100">{formatTradeActionTimestamp(transfer.timestamp)}</div> */}
            </div>
          </div>
        ))}

        {fundingHistory && fundingHistory.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            <Trans>No funding activity</Trans>
          </div>
        )}
        {filteredFundingHistory?.length === 0 && fundingHistory && fundingHistory.length > 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            <Trans>No funding activity matching your search</Trans>
          </div>
        )}
      </div>
    </div>
  );
};

export const MainView = ({ account }: { account: string }) => {
  return (
    <div className="text-body-medium flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex flex-col gap-8 px-16 pb-20 pt-16">
        <Toolbar account={account} />
        <BalanceSection />
        <ActionButtons />
      </div>
      <FundingHistorySection />
    </div>
  );
};
