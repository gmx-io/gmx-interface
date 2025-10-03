import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { useHistory } from "react-router-dom";
import { useCopyToClipboard } from "react-use";
import { useAccount } from "wagmi";

import { BOTANIX, getExplorerUrl } from "config/chains";
import { isSettlementChain } from "config/multichain";
import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { isMultichainFundingItemLoading } from "domain/multichain/isMultichainFundingItemLoading";
import type { MultichainFundingHistoryItem } from "domain/multichain/types";
import { useDisconnectAndClose } from "domain/multichain/useDisconnectAndClose";
import { useGmxAccountFundingHistory } from "domain/multichain/useGmxAccountFundingHistory";
import { useChainId } from "lib/chains";
import { formatRelativeDateWithComma } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { useENS } from "lib/legacy";
import { formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { shortenAddressOrEns } from "lib/wallets";
import { buildAccountDashboardUrl } from "pages/AccountDashboard/buildAccountDashboardUrl";
import { getToken } from "sdk/configs/tokens";
import { Token } from "sdk/types/tokens";

import { Amount } from "components/Amount/Amount";
import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import SearchInput from "components/SearchInput/SearchInput";
import { VerticalScrollFadeContainer } from "components/TableScrollFade/VerticalScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import BellIcon from "img/ic_bell.svg?react";
import ChevronLeftIcon from "img/ic_chevron_left.svg?react";
import CopyIcon from "img/ic_copy.svg?react";
import ExplorerIcon from "img/ic_explorer.svg?react";
import PnlAnalysisIcon from "img/ic_pnl_analysis.svg?react";
import SettingsIcon from "img/ic_settings.svg?react";
import DisconnectIcon from "img/ic_sign_out_20.svg?react";
import SpinnerIcon from "img/ic_spinner.svg?react";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import {
  useAvailableToTradeAssetMultichain,
  useAvailableToTradeAssetSettlementChain,
  useAvailableToTradeAssetSymbolsMultichain,
  useAvailableToTradeAssetSymbolsSettlementChain,
} from "./hooks";
import { FUNDING_OPERATIONS_LABELS } from "./keys";

function UsdValueWithSkeleton({ usd }: { usd: bigint | undefined }) {
  return (
    <span className="numbers">
      {usd !== undefined ? (
        formatUsd(usd)
      ) : (
        <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={54} className="leading-base" inline={true} />
      )}
    </span>
  );
}

const TokenIcons = ({ tokens }: { tokens: string[] }) => {
  const displayTokens = tokens.slice(0, 3);

  return (
    <div className="flex items-center">
      {displayTokens.map((token, index) => (
        <div
          key={token}
          className={cx(
            "-ml-6 flex size-14 items-center justify-center rounded-full border border-slate-600 first-of-type:-ml-0"
          )}
          // Safety: its small
          // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
          style={{
            zIndex: tokens.length - index,
          }}
        >
          <TokenIcon symbol={token} displaySize={18} importSize={24} />
        </div>
      ))}
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

  const key = `${operation}${isExecutionError ? "-failed" : ""}`;
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

const Toolbar = ({ account }: { account: string }) => {
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const history = useHistory();

  const { isSmallMobile } = useBreakpoints();
  const chainId = srcChainId ?? settlementChainId;

  const { openNotifyModal } = useNotifyModalState();
  const { setIsSettingsVisible } = useSettings();
  const { ensName } = useENS(account);
  const [, copyToClipboard] = useCopyToClipboard();
  const handleDisconnect = useDisconnectAndClose();

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

  const showNotify = settlementChainId !== BOTANIX;
  const buttonClassName = isSmallMobile ? cx("size-32 !p-0") : cx("size-40 !p-0");

  return (
    <div className="flex items-stretch justify-between gap-12 max-smallMobile:flex-wrap">
      <Button variant="secondary" size="small" className="flex items-center gap-8" onClick={handleCopyAddress}>
        <div className="max-[500px]:hidden">
          <Avatar size={24} ensName={ensName} address={account} />
        </div>
        <div className="text-body-medium font-medium text-typography-primary">
          {shortenAddressOrEns(ensName || account, 13)}
        </div>
        <CopyIcon className="size-20 max-[500px]:hidden" />
      </Button>
      <div className="flex items-center gap-8">
        <TooltipWithPortal content={t`PnL Analysis`} position="bottom" tooltipClassName="!min-w-max" variant="none">
          <Button variant="secondary" size="small" className={buttonClassName} onClick={handlePnlAnalysisClick}>
            <PnlAnalysisIcon width={20} height={20} />
          </Button>
        </TooltipWithPortal>
        <TooltipWithPortal
          shouldPreventDefault={false}
          content={t`View in Explorer`}
          position="bottom"
          tooltipClassName="!min-w-max"
          variant="none"
        >
          <Button
            to={accountUrl}
            newTab
            variant="secondary"
            size="small"
            className={buttonClassName}
            showExternalLinkArrow={false}
          >
            <ExplorerIcon />
          </Button>
        </TooltipWithPortal>
        {showNotify && (
          <TooltipWithPortal content={t`Notifications`} position="bottom" tooltipClassName="!min-w-max" variant="none">
            <Button variant="secondary" size="small" className={buttonClassName} onClick={handleNotificationsClick}>
              <BellIcon />
            </Button>
          </TooltipWithPortal>
        )}

        <TooltipWithPortal content={t`Settings`} position="bottom" tooltipClassName="!min-w-max" variant="none">
          <Button variant="secondary" size="small" className={buttonClassName} onClick={handleSettingsClick}>
            <SettingsIcon width={20} height={20} />
          </Button>
        </TooltipWithPortal>
        <TooltipWithPortal content={t`Disconnect`} position="bottom" tooltipClassName="!min-w-max" variant="none">
          <Button variant="secondary" size="small" className={buttonClassName} onClick={handleDisconnect}>
            <DisconnectIcon />
          </Button>
        </TooltipWithPortal>
      </div>
    </div>
  );
};

function GmxAccountBalanceTooltipContent() {
  return (
    <Trans>
      Your GMX Account balance, usable for trading from any supported chain. <ExternalLink href="https://docs.gmx.io/docs/trading/v2#multichain-trading">Read more</ExternalLink>.
    </Trans>
  );
}

function SettlementChainBalance() {
  const { totalUsd, gmxAccountUsd, walletUsd } = useAvailableToTradeAssetSettlementChain();
  const availableToTradeAssetSymbols = useAvailableToTradeAssetSymbolsSettlementChain();

  return (
    <div className="flex flex-col gap-12 rounded-8 bg-fill-surfaceElevated50 p-12">
      <div className="flex flex-col gap-8">
        <div className="text-body-small text-typography-secondary">
          <Trans>Available to Trade</Trans>
        </div>
        <Balance usd={totalUsd} availableToTradeAssetSymbols={availableToTradeAssetSymbols} />
      </div>
      <div className="h-[0.5px] bg-slate-600" />
      <div>
        <SyntheticsInfoRow
          label={<Trans>Wallet</Trans>}
          className="py-4"
          value={<UsdValueWithSkeleton usd={walletUsd} />}
        />
        <SyntheticsInfoRow
          label={
            <TooltipWithPortal content={<GmxAccountBalanceTooltipContent />} variant="iconStroke">
              <Trans>GMX Account Balance</Trans>
            </TooltipWithPortal>
          }
          className="py-4"
          value={<UsdValueWithSkeleton usd={gmxAccountUsd} />}
        />
      </div>
    </div>
  );
}

function MultichainBalance() {
  const { gmxAccountUsd } = useAvailableToTradeAssetMultichain();
  const availableToTradeAssetSymbols = useAvailableToTradeAssetSymbolsMultichain();

  return (
    <div className="flex flex-col gap-8 rounded-8 bg-fill-surfaceElevated50 p-12">
      <TooltipWithPortal
        handleClassName="text-body-small text-typography-secondary"
        content={<GmxAccountBalanceTooltipContent />}
        variant="iconStroke"
      >
        <Trans>Balance</Trans>
      </TooltipWithPortal>

      <Balance usd={gmxAccountUsd} availableToTradeAssetSymbols={availableToTradeAssetSymbols} />
    </div>
  );
}

function Balance({
  usd,
  availableToTradeAssetSymbols,
}: {
  usd: bigint | undefined;
  availableToTradeAssetSymbols: string[];
}) {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleAvailableToTradeClick = () => {
    setIsVisibleOrView("availableToTradeAssets");
  };

  return (
    <div className="flex min-h-32 flex-wrap items-center justify-between gap-8">
      {usd !== undefined ? (
        <div className="text-h2 normal-nums leading-[30px]">{formatUsd(usd)}</div>
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
      {usd !== undefined && usd !== 0n && (
        <button
          className="flex min-h-32 items-center gap-4 rounded-full bg-slate-600 py-6 pl-12 pr-12 text-[13px] font-medium gmx-hover:bg-slate-600/90"
          onClick={handleAvailableToTradeClick}
        >
          <Trans>All assets</Trans>
          <TokenIcons tokens={availableToTradeAssetSymbols} />
          <ChevronLeftIcon className="size-16 rotate-180 text-typography-secondary" />
        </button>
      )}
      {usd === undefined && (
        <Skeleton
          baseColor="#B4BBFF1A"
          highlightColor="#B4BBFF1A"
          width={134}
          height={32}
          className="!block"
          inline={true}
        />
      )}
    </div>
  );
}

const BalanceSection = () => {
  const { chainId } = useAccount();

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
    <div className="flex gap-12">
      <Button
        variant="secondary"
        size="medium"
        className="flex-1 !text-typography-primary"
        onClick={handleDepositClick}
      >
        <Trans>Deposit</Trans>
      </Button>
      <Button
        variant="secondary"
        size="medium"
        className="flex-1 !text-typography-primary"
        onClick={handleWithdrawClick}
      >
        <Trans>Withdraw</Trans>
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
      <div className="flex items-center justify-between px-adaptive">
        <div className="text-body-large font-medium">
          <Trans>Funding Activity</Trans>
        </div>
      </div>
      {Boolean(fundingHistory?.length) && (
        <div className="px-adaptive">
          <SearchInput value={searchQuery} setValue={setSearchQuery} size="m" />
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
              <TokenIcon symbol={transfer.token.symbol} displaySize={40} importSize={40} />
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
            <Trans>No funding activity matching your search</Trans>
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
};

export const MainView = ({ account }: { account: string }) => {
  return (
    <div className="text-body-medium flex grow flex-col gap-[--padding-adaptive] overflow-y-hidden">
      <div className="flex flex-col gap-12 px-adaptive pb-12 pt-8">
        <Toolbar account={account} />
        <BalanceSection />
        <ActionButtons />
      </div>
      <FundingHistorySection />
    </div>
  );
};
