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
import { ARBITRUM, AVALANCHE, getChainName, getExplorerUrl } from "config/chains";
import { CHAIN_ID_TO_NETWORK_ICON } from "config/icons";
import { CURRENT_PROVIDER_LOCALSTORAGE_KEY, SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import {
  GmxAccountModalView,
  useGmxAccountModalOpen,
  useGmxAccountSelectedTransactionHash,
} from "context/GmxAccountContext/GmxAccountContext";
import { DEV_FUNDING_HISTORY } from "context/GmxAccountContext/dev";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccountModalOpen } from "context/SubaccountContext/SubaccountContext";
import BellIcon from "img/bell.svg?react";
import copy from "img/ic_copy_20.svg";
import InfoIconComponent from "img/ic_info.svg?react";
import externalLink from "img/ic_new_link_20.svg";
import SettingsIcon24 from "img/ic_settings_24.svg?react";
import disconnectIcon from "img/ic_sign_out_20.svg";
import { helperToast } from "lib/helperToast";
import { useENS } from "lib/legacy";
import { formatBalanceAmount, formatUsd } from "lib/numbers";
import { useNotifyModalState } from "lib/useNotifyModalState";
import { userAnalytics } from "lib/userAnalytics";
import { DisconnectWalletEvent } from "lib/userAnalytics/types";
import { shortenAddressOrEns } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import { memo, useMemo, useState } from "react";
import { BiChevronDown, BiChevronRight } from "react-icons/bi";
import { IoArrowBack, IoArrowDown } from "react-icons/io5";
import { TbLoader2, TbProgressAlert } from "react-icons/tb";
import { useCopyToClipboard } from "react-use";
import { base, sonic } from "viem/chains";
import { useDisconnect } from "wagmi";
import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import { formatTradeActionTimestamp } from "../TradeHistory/TradeHistoryRow/utils/shared";

const CHAIN_ID_TO_TX_URL_BUILDER: Record<number, (txId: string) => string> = {
  [ARBITRUM]: (txId: string) => `https://arbiscan.io/tx/${txId}`,
  [AVALANCHE]: (txId: string) => `https://snowtrace.io/tx/${txId}`,
  [base.id]: (txId: string) => `https://basescan.org/tx/${txId}`,
  [sonic.id]: (txId: string) => `https://sonicscan.org/tx/${txId}`,
};

const CHAIN_ID_TO_EXPLORER_NAME: Record<number, string> = {
  [ARBITRUM]: "Arbiscan",
  [AVALANCHE]: "Snowtrace",
  [base.id]: "Basescan",
  [sonic.id]: "Sonicscan",
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

const FundingHistoryTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("main")}
      />
      <Trans>Funding History</Trans>
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
        onClick={() => setIsVisibleOrView("fundingHistory")}
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

const SelectAssetToWithdrawTitle = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  return (
    <div className="flex items-center gap-8">
      <IoArrowBack
        className="size-20 text-slate-100"
        tabIndex={0}
        role="button"
        onClick={() => setIsVisibleOrView("withdraw")}
      />
      <Trans>Select Asset to Withdraw</Trans>
    </div>
  );
};

const VIEW_TITLE: Record<GmxAccountModalView, React.ReactNode> = {
  main: <Trans>GMX Account</Trans>,
  availableToTradeAssets: <AvailableToTradeAssetsTitle />,
  fundingHistory: <FundingHistoryTitle />,
  transactionDetails: <TransactionDetailsTitle />,
  deposit: <DepositTitle />,
  selectAssetToDeposit: <SelectAssetToDepositTitle />,
  withdraw: <WithdrawTitle />,
  selectAssetToWithdraw: <SelectAssetToWithdrawTitle />,
};

type CHAIN_NAME = "arbitrum" | "avalanche" | "base" | "sonic";

// function useSyncGmxAccountModalUrlParams() {
//   const { gmxaccount } = useSearchParams<{
//     gmxaccount:
//       | "main"
//       | "tradable"
//       | "history"
//       | `history-${string}`
//       | "deposit"
//       | `deposit-from-${CHAIN_NAME}-${string}`;
//   }>();
// }

export const GmxAccountModal = memo(() => {
  // useSyncGmxAccountModalUrlParams();
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();
  const { account } = useWallet();

  const isVisible = isVisibleOrView !== false;
  const view = typeof isVisibleOrView === "string" ? isVisibleOrView : "main";

  return (
    <SlideModal
      label={VIEW_TITLE[view]}
      isVisible={isVisible}
      setIsVisible={setIsVisibleOrView}
      desktopContentClassName="!h-[570px] !w-[400px]"
      disableOverflowHandling={true}
      className="text-body-medium"
      contentPadding={false}
    >
      {view === "main" && <MainView account={account || ""} />}
      {view === "availableToTradeAssets" && <AvailableToTradeAssetsView />}
      {view === "fundingHistory" && <FundingHistoryView />}
      {view === "transactionDetails" && <TransactionDetailsView />}
      {view === "deposit" && <DepositView />}
      {view === "selectAssetToDeposit" && <SelectAssetToDepositView />}
      {view === "withdraw" && <WithdrawView />}
      {view === "selectAssetToWithdraw" && <SelectAssetToWithdrawView />}
    </SlideModal>
  );
});

const Toolbar = ({ account }: { account: string }) => {
  const { disconnect } = useDisconnect();
  const [isVisible, setIsVisible] = useGmxAccountModalOpen();
  const [, setOneClickModalOpen] = useSubaccountModalOpen();
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

  const handleSubaccountClick = () => {
    setOneClickModalOpen(true);
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

const BalanceSection = () => {
  const [isVisibleOrView, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleAvailableToTradeClick = () => {
    setIsVisibleOrView("availableToTradeAssets");
  };

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
          <TokenIcons tokens={["USDC", "WETH", "WAVAX", "WBTC", "USDT", "DAI"]} />
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

type MultichainBalances = {
  token: {
    symbol: string;
    decimals: number;
    address: string;
    name: string;
  };
  chainId: number;
  balanceAmount: bigint;
  balanceUsd: bigint;
}[];

const DEV_MULTI_CHAIN_BALANCES: MultichainBalances = [
  {
    token: { symbol: "USDC", decimals: 6, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", name: "USD Coin" },
    chainId: 0,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  // WETH on 0 chain
  {
    token: {
      symbol: "WETH",
      decimals: 18,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
    },
    chainId: 0,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  // WAVAX on 0 chain
  {
    token: {
      symbol: "WAVAX",
      decimals: 18,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      name: "Wrapped AVAX",
    },
    chainId: 0,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  // USDT on 0 chain
  {
    token: { symbol: "USDT", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", name: "Tether" },
    chainId: 0,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  // USDC on 0 chain
  {
    token: { symbol: "USDC", decimals: 6, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", name: "USD Coin" },
    chainId: 0,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: {
      symbol: "WETH",
      decimals: 18,
      address: "0x4200000000000000000000000000000000000006",
      name: "Wrapped Ether",
    },
    chainId: AVALANCHE,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: {
      symbol: "WAVAX",
      decimals: 18,
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      name: "Wrapped AVAX",
    },
    chainId: sonic.id,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "WBTC", decimals: 8, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", name: "Wrapped BTC" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 8n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "USDT", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", name: "Tether" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: {
      symbol: "DAI",
      decimals: 18,
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      name: "Dai Stablecoin",
    },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "USDC", decimals: 6, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", name: "USD Coin" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "USDC", decimals: 6, address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", name: "USD Coin" },
    chainId: sonic.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "SOL", decimals: 6, address: "0x0000000000000000000000000000000000000000", name: "Solana" },
    chainId: sonic.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "SOL", decimals: 6, address: "0x0000000000000000000000000000000000000000", name: "Solana" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "ANIME", decimals: 6, address: "0x0000000000000000000000000000000000000000", name: "Anime" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "ANIME", decimals: 6, address: "0x0000000000000000000000000000000000000000", name: "Anime" },
    chainId: sonic.id,
    balanceAmount: 100n * 10n ** 6n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "AAVE", decimals: 18, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", name: "Aave" },
    chainId: base.id,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
  {
    token: { symbol: "AAVE", decimals: 18, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", name: "Aave" },
    chainId: sonic.id,
    balanceAmount: 100n * 10n ** 18n,
    balanceUsd: 100n * 10n ** 30n,
  },
];

type TokenListItemProps = {
  balance: MultichainBalances[0];
  onClick?: () => void;
  className?: string;
};

const TokenListItem = ({ balance, onClick, className }: TokenListItemProps) => {
  return (
    <div
      key={balance.token.symbol + "_" + balance.chainId}
      className={cx("flex cursor-pointer items-center justify-between px-16 py-8 gmx-hover:bg-slate-700", className)}
      onClick={onClick}
    >
      <div className="flex items-center gap-8">
        <TokenIcon symbol={balance.token.symbol} displaySize={40} importSize={40} chainIdBadge={balance.chainId} />
        <div>
          <div>{balance.token.symbol}</div>
          <div className="text-body-small text-slate-100">{getChainName(balance.chainId)}</div>
        </div>
      </div>
      <div className="text-right">
        <div>{formatBalanceAmount(balance.balanceAmount, balance.token.decimals, balance.token.symbol)}</div>
        <div className="text-body-small text-slate-100">{formatUsd(balance.balanceUsd)}</div>
      </div>
    </div>
  );
};

const AvailableToDeposit = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();

  const handleFundingHistoryClick = () => {
    setIsVisibleOrView("fundingHistory");
  };

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="flex items-center justify-between px-16">
        <div className="text-body-large">Available to Deposit</div>
        <Button
          variant="secondary"
          className="text-body-small flex items-center gap-4 !py-4 !pl-8 !pr-4"
          onClick={handleFundingHistoryClick}
        >
          Funding History <IoArrowDown className="block size-16 -rotate-90 text-slate-100" />
        </Button>
      </div>
      <div className="grow overflow-y-auto">
        {DEV_MULTI_CHAIN_BALANCES.filter((balance) => balance.chainId !== 0).map((balance) => (
          <TokenListItem key={balance.token.symbol + "_" + balance.chainId} balance={balance} />
        ))}
        {DEV_MULTI_CHAIN_BALANCES.filter((balance) => balance.chainId !== 0).length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            No assets are available for deposit
          </div>
        )}
      </div>
    </div>
  );
};

type FilterType = "All" | "Gmx Balance" | "Wallet";

const AvailableToTradeAssetsView = () => {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBalances = DEV_MULTI_CHAIN_BALANCES.filter((balance) => {
    const matchesSearch = balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Gmx Balance" && balance.chainId === 0) ||
      (activeFilter === "Wallet" && balance.chainId !== 0);

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
        {filteredBalances.map((balance) => (
          <div
            key={balance.token.symbol + "_" + balance.chainId}
            className="flex items-center justify-between px-16 py-8 gmx-hover:bg-slate-700"
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={balance.token.symbol}
                displaySize={40}
                importSize={40}
                chainIdBadge={balance.chainId}
              />
              <div>
                <div>{balance.token.symbol}</div>
                <div className="text-body-small text-slate-100">{getChainName(balance.chainId)}</div>
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(balance.balanceAmount, balance.token.decimals, balance.token.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatUsd(balance.balanceUsd)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export type FundingHistoryItem = {
  id: string;
  chainId: number;
  walletAddress: string;
  txnId: string;
  token: {
    symbol: string;
    decimals: number;
  };
  operation: "deposit" | "withdraw";
  timestamp: number;
  size: bigint;
  sizeUsd: bigint;
  status: "pending" | "completed" | "failed";
};

const FundingHistoryView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [, setSelectedTransactionHash] = useGmxAccountSelectedTransactionHash();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFundingHistory = [...DEV_FUNDING_HISTORY]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((balance) => {
      const matchesSearch = balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  const handleTransactionClick = (transaction: FundingHistoryItem) => {
    setSelectedTransactionHash(transaction.txnId);
    setIsVisibleOrView("transactionDetails");
  };

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
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
      </div>
    </div>
  );
};

function FundingHistoryItemLabel({ status, operation }: Pick<FundingHistoryItem, "status" | "operation">) {
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
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
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
      <div className="flex flex-col gap-8 px-16 pt-16">
        <Toolbar account={account} />
        <BalanceSection />
        <ActionButtons />
        <div className="h-12" />
      </div>
      <AvailableToDeposit />
    </div>
  );
};

const CHAIN_TO_SUPPORTED_DEPOSIT_TOKENS: Record<number, string[]> = {
  [ARBITRUM]: [
    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI
  ],
  [AVALANCHE]: [
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
    "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // WETH
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    "0x50b7545627a5162F82A992c33b87aDc75187B218", // WBTC
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
    "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", // DAI
  ],
  [base.id]: [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0x4200000000000000000000000000000000000006", // WETH
    "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WBTC
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // USDT
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
  ],
  [sonic.id]: [
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0x4200000000000000000000000000000000000006", // WETH
    "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WAVAX
    "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // WBTC
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // USDT
    "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", // DAI
    "0x3aAB2285ddcDdaD8edf438C1bAB47e1a9D05a9b4", // SOL
  ],
};

const MultichainTokenSelector = () => {
  const [selectedToken, setSelectedToken] = useState<MultichainBalances[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBalances = DEV_MULTI_CHAIN_BALANCES.filter((balance) => {
    const matchesSearch = balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && balance.chainId !== 0; // Only show wallet balances
  });

  return (
    <div className="flex flex-col gap-8">
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
        {filteredBalances.map((balance) => (
          <div
            key={balance.token.symbol + "_" + balance.chainId}
            className={cx(
              "flex cursor-pointer items-center justify-between px-16 py-8 gmx-hover:bg-slate-700",
              selectedToken?.token.symbol === balance.token.symbol &&
                selectedToken?.chainId === balance.chainId &&
                "bg-slate-700"
            )}
            onClick={() => setSelectedToken(balance)}
          >
            <div className="flex items-center gap-8">
              <TokenIcon
                symbol={balance.token.symbol}
                displaySize={40}
                importSize={40}
                chainIdBadge={balance.chainId}
              />
              <div>
                <div>{balance.token.symbol}</div>
                <div className="text-body-small text-slate-100">{getChainName(balance.chainId)}</div>
              </div>
            </div>
            <div className="text-right">
              <div>{formatBalanceAmount(balance.balanceAmount, balance.token.decimals, balance.token.symbol)}</div>
              <div className="text-body-small text-slate-100">{formatUsd(balance.balanceUsd)}</div>
            </div>
          </div>
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

const SelectAssetToDepositView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [selectedNetwork, setSelectedNetwork] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const networks = [
    { id: "all", name: "All Networks" },
    { id: ARBITRUM, name: "Arbitrum" },
    { id: AVALANCHE, name: "Avalanche" },
    { id: base.id, name: "Base" },
    { id: sonic.id, name: "Sonic" },
  ];

  const filteredBalances = DEV_MULTI_CHAIN_BALANCES.filter((balance) => {
    const matchesSearch = balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNetwork = selectedNetwork === "all" || balance.chainId === selectedNetwork;
    return matchesSearch && matchesNetwork && balance.chainId !== 0; // Only show wallet balances
  });

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <ButtonRowScrollFadeContainer>
          <div className="flex gap-4">
            {networks.map((network) => (
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
        {filteredBalances.map((balance) => (
          <TokenListItem
            key={balance.token.symbol + "_" + balance.chainId}
            balance={balance}
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
          <img src={CHAIN_ID_TO_NETWORK_ICON[base.id]} alt="Base" className="size-20" />
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
            onClick={() => console.log("clicked max")}
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
          {/* <div className="flex items-center gap-8">
            {selectedTokenAddress && selectedToken ? (
              <>
                <TokenIcon symbol={selectedToken.token.symbol} displaySize={20} importSize={40} />
                <span>{selectedToken.token.symbol}</span>
              </>
            ) : (
              <span className="text-slate-100">Select token</span>
            )}
          </div> */}

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
              {/* <TokenIcon symbol={token.token.symbol} displaySize={20} importSize={40} />
              <span>
                {token.token.symbol} <span className="text-slate-100">{token.token.name}</span>
              </span> */}
              <Item option={option} />
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
};

function WithdrawAssetItem({ option }: { option: MultichainBalances[0] }) {
  return (
    <div className="flex items-center gap-8">
      <TokenIcon symbol={option.token.symbol} displaySize={20} importSize={40} />
      <span>
        {option.token.symbol} <span className="text-slate-100">{option.token.name}</span>
      </span>
    </div>
  );
}

function withdrawAssetItemKey(option: MultichainBalances[0]) {
  return option.token.address;
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

const WithdrawView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [amount, setAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<number>(base.id);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | undefined>(undefined);

  // Get unique tokens from GMX balances (chainId === 0)
  const uniqueTokens = useMemo(() => {
    const tokens = new Map<string, MultichainBalances[0]>();
    DEV_MULTI_CHAIN_BALANCES.forEach((balance) => {
      if (balance.chainId === 0 && !tokens.has(balance.token.symbol)) {
        tokens.set(balance.token.symbol, balance);
      }
    });
    return Array.from(tokens.values());
  }, []);

  const selectedToken = useMemo(() => {
    return uniqueTokens.find((token) => token.token.address === selectedTokenAddress);
  }, [selectedTokenAddress, uniqueTokens]);

  const networks = [
    { id: ARBITRUM, name: "Arbitrum", fee: "0.32 USDC" },
    { id: AVALANCHE, name: "Avalanche", fee: "0.15 USDC" },
    { id: sonic.id, name: "Sonic", fee: "0.59 USDC" },
    { id: base.id, name: "Base", fee: "Free" },
  ];

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
                  <TokenIcon symbol={selectedToken.token.symbol} displaySize={20} importSize={40} />
                  <span>{selectedToken.token.symbol}</span>
                </div>
              ) : undefined
            }
            options={uniqueTokens}
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
            placeholder={`0.0 ${selectedToken?.token.symbol || ""}`}
          />
          {amount !== "" && (
            <div className="pointer-events-none absolute left-14 top-1/2 flex max-w-[calc(100%-72px)] -translate-y-1/2 overflow-hidden">
              <div className="invisible whitespace-pre font-[RelativeNumber]">{amount} </div>
              <div className="text-slate-100">{selectedToken?.token.symbol || ""}</div>
            </div>
          )}
          <button
            className="text-body-small absolute right-14 top-1/2 -translate-y-1/2 rounded-4 bg-cold-blue-500 px-8 py-2 hover:bg-[#484e92] active:bg-[#505699]"
            onClick={() => console.log("clicked max")}
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

const SelectAssetToWithdrawView = () => {
  const [, setIsVisibleOrView] = useGmxAccountModalOpen();
  const [searchQuery, setSearchQuery] = useState("");

  // Get unique tokens from GMX balances (chainId === 0)
  const uniqueTokens = useMemo(() => {
    const tokens = new Map<string, MultichainBalances[0]>();
    DEV_MULTI_CHAIN_BALANCES.forEach((balance) => {
      if (balance.chainId === 0 && !tokens.has(balance.token.symbol)) {
        tokens.set(balance.token.symbol, balance);
      }
    });
    return Array.from(tokens.values());
  }, []);

  const filteredTokens = uniqueTokens.filter((balance) => {
    return balance.token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex grow flex-col gap-8 overflow-y-hidden">
      <div className="px-16 pt-16">
        <input
          type="text"
          placeholder="Search tokens..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-4 bg-slate-700 px-12 py-8 text-white placeholder:text-slate-100"
        />
      </div>

      <div className="grow overflow-y-auto">
        {filteredTokens.map((balance) => (
          <TokenListItem
            key={balance.token.symbol}
            balance={balance}
            onClick={() => setIsVisibleOrView("withdraw")}
            className="[&_.token-icon-chain-badge]:!hidden"
          />
        ))}
        {filteredTokens.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-8 px-16 text-slate-100">
            <InfoIconComponent className="size-24" />
            No assets are available for withdrawal
          </div>
        )}
      </div>
    </div>
  );
};
