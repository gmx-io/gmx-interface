import { Listbox } from "@headlessui/react";
import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { Avatar } from "components/Avatar/Avatar";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { SlideModal } from "components/Modal/SlideModal";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { ARBITRUM, AVALANCHE, BASE_MAINNET, SONIC_MAINNET, getChainName, getExplorerUrl } from "config/chains";
import { USD_DECIMALS } from "config/factors";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { CURRENT_PROVIDER_LOCALSTORAGE_KEY, SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import { GmxAccountModalView } from "context/GmxAccountContext/GmxAccountContext";
import {
  MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS,
  MULTI_CHAIN_TOKEN_MAPPING,
  MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS,
  isSettlementChain,
} from "context/GmxAccountContext/config";
import { DEV_FUNDING_HISTORY } from "context/GmxAccountContext/dev";
import {
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransactionHash,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { FundingHistoryItem, TokenChainData } from "context/GmxAccountContext/types";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokenBalances } from "domain/synthetics/tokens/useTokenBalances";
import { TokenData, TokenPrices } from "domain/tokens";
import BellIcon from "img/bell.svg?react";
import copy from "img/ic_copy_20.svg";
import InfoIconComponent from "img/ic_info.svg?react";
import externalLink from "img/ic_new_link_20.svg";
import SettingsIcon24 from "img/ic_settings_24.svg?react";
import disconnectIcon from "img/ic_sign_out_20.svg";
import { helperToast } from "lib/helperToast";
import { useENS } from "lib/legacy";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import noop from "lodash/noop";
import { memo, useEffect, useMemo, useState } from "react";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";
import { IoArrowBack, IoArrowDown } from "react-icons/io5";
import { TbLoader2, TbProgressAlert } from "react-icons/tb";
import { useCopyToClipboard } from "react-use";
import { getToken } from "sdk/configs/tokens";
import { convertToTokenAmount, convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { useDisconnect } from "wagmi";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

const CHAIN_ID_TO_TX_URL_BUILDER: Record<number, (txId: string) => string> = {
  [ARBITRUM]: (txId: string) => `https://arbiscan.io/tx/${txId}`,
  [AVALANCHE]: (txId: string) => `https://snowtrace.io/tx/${txId}`,
  [BASE_MAINNET]: (txId: string) => `https://basescan.org/tx/${txId}`,
  [SONIC_MAINNET]: (txId: string) => `https://sonicscan.org/tx/${txId}`,
};

const CHAIN_ID_TO_EXPLORER_NAME: Record<number, string> = {
  [ARBITRUM]: "Arbiscan",
  [AVALANCHE]: "Snowtrace",
  [BASE_MAINNET]: "Basescan",
  [SONIC_MAINNET]: "Sonicscan",
};

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

const TransactionDetailsTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Transaction Details</Trans>
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
  transactionDetails: <TransactionDetailsTitle />,
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
      desktopContentClassName="!h-[640px] !w-[400px]"
      disableOverflowHandling={true}
      className="text-body-medium"
      contentPadding={false}
    >
      {view === "main" && account && <MainView account={account} />}
      {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
      {view === "transactionDetails" && <TransactionDetailsView />}
      {view === "deposit" && <DepositView />}
      {view === "selectAssetToDeposit" && <SelectAssetToDepositView />}
      {view === "withdraw" && <WithdrawView />}
    </SlideModal>
  );
});

const Toolbar = ({ account }: { account: string }) => {
  const { disconnect } = useDisconnect();
  const [, setIsVisible] = useGmxAccountModalOpen();
  const { chainId } = useWallet();
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
    if (!account) return "";
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
    openNotifyModal();
  };

  const handleSettingsClick = () => {
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

function useAvailableToTradeAssetSymbols(): string[] {
  const gmxAccountBalances = useGmxAccountBalances();
  const { chainId, account } = useWallet();

  const currentChainTokenBalances = useTokenBalances(
    chainId!,
    account,
    undefined,
    undefined,
    isSettlementChain(chainId!)
  );

  const tokenSymbols = new Set<string>();

  for (const token of gmxAccountBalances) {
    if (token.balance !== undefined && token.balance > 0n) {
      tokenSymbols.add(token.symbol);
    }
  }

  for (const [tokenAddress, balance] of Object.entries(currentChainTokenBalances.balancesData || {})) {
    if (balance !== undefined && balance > 0n) {
      tokenSymbols.add(tokenAddress);
    }
  }

  return Array.from(tokenSymbols);
}

const BalanceSection = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleAvailableToTradeClick = () => {
    setIsVisibleOrView("availableToTradeAssets");
  };

  const availableToTradeAssetSymbols = useAvailableToTradeAssetSymbols();

  return (
    <div className="flex flex-col gap-8 rounded-4 bg-cold-blue-900 p-12">
      <div className="text-body-small text-slate-100">Available to Trade</div>
      <div className="flex items-center justify-between gap-8">
        <div className="text-24">{formatUsd(1769n * 10n ** 30n)}</div>
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
      <SyntheticsInfoRow label="Wallet" value={formatUsd(1769n * 10n ** 30n)} />
      <SyntheticsInfoRow label="GMX Balance" value={formatUsd(1769n * 10n ** 30n)} />
    </div>
  );
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

type TokenListItemProps = {
  tokenChainData: TokenChainData;
  onClick?: () => void;
  className?: string;
};

const TokenListItem = ({ tokenChainData, onClick, className }: TokenListItemProps) => {
  return (
    <div
      key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
      className={cx("flex cursor-pointer items-center justify-between px-16 py-8 gmx-hover:bg-slate-700", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-8">
        <TokenIcon
          symbol={tokenChainData.symbol}
          displaySize={40}
          importSize={40}
          chainIdBadge={tokenChainData.sourceChainId}
        />
        <div>
          <div>{tokenChainData.symbol}</div>
          <div className="text-body-small text-slate-100">{getChainName(tokenChainData.sourceChainId)}</div>
        </div>
      </div>
      <div className="text-right">
        <div>
          {formatBalanceAmount(
            tokenChainData.sourceChainBalance ?? 0n,
            tokenChainData.sourceChainDecimals,
            tokenChainData.symbol
          )}
        </div>
        <div className="text-body-small text-slate-100">
          {formatUsd(
            convertToUsd(
              tokenChainData.sourceChainBalance,
              tokenChainData.sourceChainDecimals,
              getMidPrice(tokenChainData.sourceChainPrices)
            )
          )}
        </div>
      </div>
    </div>
  );
};

type FilterType = "All" | "Gmx Balance" | "Wallet";

const AvailableToTradeAssetsView = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const gmxAccountBalances = useGmxAccountBalances();
  const multiChainBalances = useMultichainBalances();

  const filteredBalances = [...gmxAccountBalances, ...multiChainBalances]
    .map((tokenData) => {
      const balance = "sourceChainId" in tokenData ? tokenData.sourceChainBalance : tokenData.balance;
      const decimals = "sourceChainId" in tokenData ? tokenData.sourceChainDecimals : tokenData.decimals;
      const price = "sourceChainId" in tokenData ? tokenData.sourceChainPrices : tokenData.prices;
      const balanceUsd = convertToUsd(balance, decimals, getMidPrice(price));

      const displayToken = {
        chainId: "sourceChainId" in tokenData ? tokenData.sourceChainId : 0,
        symbol: tokenData.symbol,
        isGmxBalance: !("sourceChainId" in tokenData),
        balance,
        balanceUsd,
        decimals,
      };

      return displayToken;
    })
    .filter((token) => {
      const matchesSearch = token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Gmx Balance" && token.isGmxBalance) ||
        (activeFilter === "Wallet" && !token.isGmxBalance);

      return matchesSearch && matchesFilter;
    });

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex gap-4 px-16 pt-16">
        {(["All", "Gmx Balance", "Wallet"] as FilterType[]).map((filter) => (
          <Button
            key={filter}
            type="button"
            variant="ghost"
            slim
            className={cx({
              "!bg-cold-blue-500": activeFilter === filter,
            })}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>

      <div className="px-16">
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {filteredBalances.map((displayToken) => (
          <div
            key={displayToken.symbol + "_" + displayToken.chainId}
            className="flex items-center justify-between px-16 py-8 gmx-hover:bg-slate-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={displayToken.symbol}
                displaySize={40}
                importSize={40}
                chainIdBadge={displayToken.chainId}
              />
              <div>
                <div>{displayToken.symbol}</div>
                <div className="text-body-small text-slate-100">{getChainName(displayToken.chainId)}</div>
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(displayToken.balance ?? 0n, displayToken.decimals, displayToken.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatUsd(displayToken.balanceUsd)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function useGmxAccountFundingHistory() {
  const fundingHistory = useMemo(() => [...DEV_FUNDING_HISTORY].sort((a, b) => b.timestamp - a.timestamp), []);

  return fundingHistory;
}

export function FundingHistoryItemLabel({ status, operation }: Pick<FundingHistoryItem, "status" | "operation">) {
  if (status === "pending") {
    return (
      <div className="text-body-small flex items-center gap-4 text-slate-100">
        <TbLoader2 className="size-16 animate-spin" />
        Pending
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-body-small flex items-center gap-4 text-red-500">
        <TbProgressAlert className="size-16" />
        {operation === "deposit" ? "Deposit error" : "Withdraw error"}
      </div>
    );
  }

  return <div className="text-body-small text-slate-100">{operation === "deposit" ? "Deposit" : "Withdraw"}</div>;
}

const TransactionDetailsView = () => {
  const [selectedTransactionHash] = useGmxAccountSelectedTransactionHash();

  const selectedTransaction = DEV_FUNDING_HISTORY.find((transaction) => transaction.txnId === selectedTransactionHash);

  if (!selectedTransaction) {
    return null;
  }

  return (
    <div className="text-body-medium flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex flex-col gap-8 px-16 pt-16">
        <SyntheticsInfoRow label="Date" value={formatTradeActionTimestamp(selectedTransaction.timestamp)} />
        <SyntheticsInfoRow
          label="Amount"
          value={formatBalanceAmount(
            selectedTransaction.size,
            selectedTransaction.token.decimals,
            selectedTransaction.token.symbol
          )}
        />
        <SyntheticsInfoRow
          label="Fee"
          value={formatBalanceAmount(
            34n * 10n ** 5n,
            selectedTransaction.token.decimals,
            selectedTransaction.token.symbol
          )}
        />
        <SyntheticsInfoRow
          label="Network"
          className="!items-center"
          valueClassName="-my-5"
          value={
            <div className="flex items-center gap-8">
              <img
                src={CHAIN_ID_TO_NETWORK_ICON[selectedTransaction.chainId]}
                width={20}
                height={20}
                className="size-20 rounded-full"
              />
              {getChainName(selectedTransaction.chainId)}
            </div>
          }
        />
        <SyntheticsInfoRow label="Wallet" value={shortenAddressOrEns(selectedTransaction.walletAddress, 13)} />
        <SyntheticsInfoRow
          label={CHAIN_ID_TO_EXPLORER_NAME[selectedTransaction.chainId]}
          value={
            <ExternalLink href={CHAIN_ID_TO_TX_URL_BUILDER[selectedTransaction.chainId](selectedTransaction.txnId)}>
              <div className="flex items-center gap-4">
                {shortenAddressOrEns(selectedTransaction.txnId, 13)}
                <img src={externalLink} alt="External Link" className="size-20" />
              </div>
            </ExternalLink>
          }
        />
      </div>
    </div>
  );
};

const MainView = ({ account }: { account: string }) => {
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

const FundingHistorySection = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setSelectedTransactionHash] = useGmxAccountSelectedTransactionHash();

  const fundingHistory = useGmxAccountFundingHistory();

  const filteredFundingHistory = fundingHistory.filter((transaction) => {
    const matchesSearch = transaction.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleTransactionClick = (transaction: FundingHistoryItem) => {
    setSelectedTransactionHash(transaction.txnId);
    setIsVisibleOrView("transactionDetails");
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
        {filteredFundingHistory.map((transaction) => (
          <div
            role="button"
            tabIndex={0}
            key={transaction.id}
            className="flex w-full cursor-pointer items-center justify-between px-16 py-8 text-left -outline-offset-4 gmx-hover:bg-slate-700"
            onClick={() => handleTransactionClick(transaction)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon symbol={transaction.token.symbol} displaySize={40} importSize={40} />
              <div>
                <div>{transaction.token.symbol}</div>
                <FundingHistoryItemLabel status={transaction.status} operation={transaction.operation} />
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(transaction.size, transaction.token.decimals, transaction.token.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatTradeActionTimestamp(transaction.timestamp)}</div>
            </div>
          </div>
        ))}

        {fundingHistory.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            <Trans>No funding activity</Trans>
          </div>
        )}
        {filteredFundingHistory.length === 0 && fundingHistory.length > 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            <Trans>No funding activity matching your search</Trans>
          </div>
        )}
      </div>
    </div>
  );
};

function useMultichainBalances(): TokenChainData[] {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const multichainTokenIds = MULTI_CHAIN_DEPOSIT_SUPPORTED_TOKENS[settlementChainId];

  if (!multichainTokenIds) {
    return EMPTY_ARRAY;
  }

  return multichainTokenIds
    .map((tokenId): TokenChainData | undefined => {
      const mapping = MULTI_CHAIN_TOKEN_MAPPING[settlementChainId]?.[tokenId.chainId]?.[tokenId.address];

      if (!mapping) {
        return undefined;
      }

      const token = getToken(settlementChainId, mapping.settlementChainTokenAddress);

      const prices: TokenPrices = {
        maxPrice: (10n * 10n ** BigInt(USD_DECIMALS)) / 10n ** BigInt(mapping.sourceChainTokenDecimals),
        minPrice: (10n * 10n ** BigInt(USD_DECIMALS)) / 10n ** BigInt(mapping.sourceChainTokenDecimals),
      };

      return {
        ...token,
        sourceChainId: tokenId.chainId,
        sourceChainDecimals: mapping.sourceChainTokenDecimals,
        sourceChainPrices: prices,
        sourceChainBalance: convertToTokenAmount(
          10n * 10n ** BigInt(USD_DECIMALS),
          mapping.sourceChainTokenDecimals,
          getMidPrice(prices)
        ),
      } satisfies TokenChainData;
    })
    .filter((token): token is TokenChainData => token !== undefined);
}

const NETWORKS_FILTER = [
  { id: "all", name: "All Networks" },
  { id: ARBITRUM, name: "Arbitrum" },
  { id: AVALANCHE, name: "Avalanche" },
  { id: BASE_MAINNET, name: "Base" },
  { id: SONIC_MAINNET, name: "Sonic" },
];

const SelectAssetToDepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedNetwork, setSelectedNetwork] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const balances = useMultichainBalances();

  const filteredBalances = balances.filter((balance) => {
    const matchesSearch = balance.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = selectedNetwork === "all" || balance.sourceChainId === selectedNetwork;
    return matchesSearch && matchesNetwork;
  });

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <ButtonRowScrollFadeContainer>
          <div className="flex gap-4">
            {NETWORKS_FILTER.map((network) => (
              <Button
                key={network.id}
                type="button"
                variant="ghost"
                slim
                className={cx("whitespace-nowrap", {
                  "!bg-cold-blue-500": selectedNetwork === network.id,
                })}
                onClick={() => setSelectedNetwork(network.id as number | "all")}
              >
                {network.name}
              </Button>
            ))}
          </div>
        </ButtonRowScrollFadeContainer>
      </div>

      <div className="px-16">
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {filteredBalances.map((tokenChainData) => (
          <TokenListItem
            key={tokenChainData.symbol + "_" + tokenChainData.sourceChainId}
            tokenChainData={tokenChainData}
            onClick={() => setIsVisibleOrView("deposit")}
          />
        ))}
        {filteredBalances.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            No assets are available for deposit
          </div>
        )}
      </div>
    </div>
  );
};

const DepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [amount, setAmount] = useState("0.0");

  return (
    <div className="flex grow flex-col overflow-y-hidden p-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <div
            tabIndex={0}
            role="button"
            onClick={() => setIsVisibleOrView("selectAssetToDeposit")}
            className="flex items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon symbol="USDC" displaySize={20} importSize={40} />
              <span className="text-body-large">USDC</span>
            </div>
            <BiChevronRight className="size-20 text-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-8 rounded-4 border border-cold-blue-900 px-14 py-12">
          <img src={CHAIN_ID_TO_NETWORK_ICON[BASE_MAINNET]} alt="Base" className="size-20" />
          <span className="text-body-large text-slate-100">Base</span>
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small text-slate-100">Deposit</div>
        <div className="text-body-large relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72 text-white"
          />
          <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
            <div className="invisible whitespace-pre font-[RelativeNumber]">
              {amount}
              {amount === "" ? "" : " "}
            </div>
            <div className="text-slate-100">USDC</div>
          </div>
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={noop}
          >
            MAX
          </button>
        </div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Deposit Fee" value="$0.22" />
        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$9.41" to="$9.41" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="0.00 USDC" to="9.41 USDC" />} />
      </div>

      {/* Deposit button */}
      <Button variant="primary" className="mt-auto w-full">
        Deposit
      </Button>
    </div>
  );
};

const Selector = <V, T>({
  value,
  onChange,
  button,
  options,
  item: Item,
  itemKey,
  placeholder,
}: {
  value: V | undefined;
  onChange: (value: V) => void;
  button: React.JSX.Element | undefined;
  options: T[];
  item: ({ option }: { option: T }) => React.JSX.Element;
  itemKey: (option: T) => string;
  placeholder?: string;
}) => {
  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="text-body-large flex w-full items-center justify-between rounded-4 bg-cold-blue-900 px-14 py-12 active:bg-cold-blue-500 gmx-hover:bg-cold-blue-700">
          {value === undefined ? <div className="text-slate-100">{placeholder}</div> : button}
          <BiChevronDown className="size-20 text-slate-100" />
        </Listbox.Button>
        <Listbox.Options className="absolute left-0 right-0 top-full z-10 mt-4 overflow-auto rounded-4 bg-cold-blue-900 px-0 py-8">
          {options.map((option) => (
            <Listbox.Option
              key={itemKey(option)}
              value={itemKey(option)}
              className={({ active, selected }) =>
                cx(
                  "text-body-large cursor-pointer px-14 py-8",

                  (active || selected) && "bg-cold-blue-700"
                )
              }
            >
              <Item option={option} />
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};

function WithdrawAssetItem({ option }: { option: TokenData }) {
  return (
    <div className="flex items-center gap-8">
      <TokenIcon symbol={option.symbol} displaySize={20} importSize={40} />
      <span>
        {option.symbol} <span className="text-slate-100">{option.name}</span>
      </span>
    </div>
  );
}

function withdrawAssetItemKey(option: TokenData) {
  return option.address;
}

function NetworkItem({ option }: { option: { id: number; name: string; fee: string } }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-8">
        <img src={CHAIN_ID_TO_NETWORK_ICON[option.id]} alt={option.name} className="size-20" />
        <span className="text-body-large">{option.name}</span>
      </div>
      <span className="text-body-medium text-slate-100">{option.fee}</span>
    </div>
  );
}

function networkItemKey(option: { id: number; name: string; fee: string }) {
  return option.id.toString();
}

function useGmxAccountBalances(): TokenData[] {
  const [settlementChainId] = useGmxAccountSettlementChainId();

  const settlementChainWithdrawSupportedTokens = MULTI_CHAIN_WITHDRAW_SUPPORTED_TOKENS[settlementChainId];

  if (!settlementChainWithdrawSupportedTokens) {
    return EMPTY_ARRAY;
  }

  return settlementChainWithdrawSupportedTokens.map((tokenAddress) => {
    const token = getToken(settlementChainId, tokenAddress);
    return { ...token, prices: { minPrice: 100n, maxPrice: 100n }, balance: 100n };
  });
}

function useGmxAccountWithdrawNetworks() {
  const networks = useMemo(
    () => [
      { id: ARBITRUM, name: "Arbitrum", fee: "0.32 USDC" },
      { id: AVALANCHE, name: "Avalanche", fee: "0.15 USDC" },
      { id: SONIC_MAINNET, name: "Sonic", fee: "0.59 USDC" },
      { id: BASE_MAINNET, name: "Base", fee: "Free" },
    ],
    []
  );

  return networks;
}

const WithdrawView = () => {
  const [amount, setAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number>(BASE_MAINNET);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);

  // Get unique tokens from GMX balances (chainId === 0)
  const gmxAccountBalances = useGmxAccountBalances();

  const networks = useGmxAccountWithdrawNetworks();

  const selectedToken = useMemo(() => {
    return gmxAccountBalances.find((token) => token.address === selectedTokenAddress);
  }, [selectedTokenAddress, gmxAccountBalances]);

  return (
    <div className=" grow  overflow-y-auto p-16">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">Asset</div>
          <Selector
            value={selectedTokenAddress}
            onChange={setSelectedTokenAddress}
            placeholder="Select token"
            button={
              selectedTokenAddress && selectedToken ? (
                <div className="flex items-center gap-8">
                  <TokenIcon symbol={selectedToken.symbol} displaySize={20} importSize={40} />
                  <span>{selectedToken.symbol}</span>
                </div>
              ) : undefined
            }
            options={gmxAccountBalances}
            item={WithdrawAssetItem}
            itemKey={withdrawAssetItemKey}
          />
        </div>

        {/* Network selector */}
        <div className="flex flex-col gap-4">
          <div className="text-body-small text-slate-100">To Network</div>
          <Selector
            value={selectedNetwork}
            onChange={(value) => setSelectedNetwork(value)}
            placeholder="Select network"
            button={
              <div className="flex items-center gap-8">
                <img
                  src={CHAIN_ID_TO_NETWORK_ICON[selectedNetwork]}
                  alt={getChainName(selectedNetwork)}
                  className="size-20"
                />
                <span className="text-body-large">{getChainName(selectedNetwork)}</span>
              </div>
            }
            options={networks}
            item={NetworkItem}
            itemKey={networkItemKey}
          />
        </div>
      </div>

      <div className="h-20" />

      <div className="flex flex-col gap-4">
        <div className="text-body-small text-slate-100">Withdraw</div>
        <div className="text-body-large relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-body-large w-full rounded-4 bg-cold-blue-900 py-12 pl-14 pr-72 text-white placeholder-slate-100"
            placeholder={`0.0 ${selectedToken?.symbol || ""}`}
          />
          {amount !== "" && (
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">{amount} </div>
              <div className="text-slate-100">{selectedToken?.symbol || ""}</div>
            </div>
          )}
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={noop}
          >
            MAX
          </button>
        </div>
        <div className="text-body-small text-slate-100">$10.00</div>
      </div>

      <div className="h-32" />

      <div className="flex flex-col gap-8">
        <SyntheticsInfoRow label="Network Fee" value="$0.37" />
        <SyntheticsInfoRow label="Withdraw Fee" value="$0.22" />
        <SyntheticsInfoRow label="GMX Balance" value={<ValueTransition from="$1,277.50" to="$1,267.48" />} />
        <SyntheticsInfoRow label="Asset Balance" value={<ValueTransition from="1,277.50 USDC" to="1,267.48 USDC" />} />
      </div>

      <div className="h-16" />

      {/* Withdraw button */}
      <Button variant="primary" className="w-full">
        Withdraw
      </Button>
    </div>
  );
};
