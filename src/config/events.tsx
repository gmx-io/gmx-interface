// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { Trans } from "@lingui/macro";
import { type JSX } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "./chains";
import { getIncentivesV2Url } from "./links";
import { getNormalizedTokenSymbol } from "./tokens";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { TokenSymbolWithIcon } from "components/TokenSymbolWithIcon/TokenSymbolWithIcon";

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  startDate?: string;
  endDate: string;
  bodyText: string | string[] | JSX.Element;
  chains?: number[];
  link?: {
    text: string;
    href: string;
    /**
     * @default false
     */
    newTab?: boolean;
  };
};

export const homeEventsData: EventData[] = [];

export const appEventsData: EventData[] = [
  {
    id: "ordi-stx-market-arbitrum",
    title: "ORDI and STX markets added on Arbitrum",
    isActive: true,
    startDate: "14 Aug 2024, 00:00",
    endDate: "28 Aug 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> ORDI/USD and STX/USD, or <Link to="/pools">provide liquidity</Link> to these
        pools by using <TokenSymbolWithIcon symbol="wBTC" /> or U<TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "shib-market-arbitrum",
    title: "SHIB/USD [WETH-USDC] market added on Arbitrum",
    isActive: true,
    startDate: "07 Aug 2024, 00:00",
    endDate: "21 Aug 2024, 00:00",
    bodyText: (
      <>
        Trade SHIB/USD or provide liquidity using <TokenSymbolWithIcon symbol="WETH" /> or{" "}
        <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "ethena-markets-arbitrum",
    title: "ETH/USD [wstETH-USDe] market added on Arbitrum",
    isActive: true,
    startDate: "30 Jul 2024, 00:00",
    endDate: "14 Aug 2024, 00:00",
    bodyText: "Trade ETH/USD or provide liquidity using wstETH or USDe.",
  },
  {
    id: "pepe-and-wif-markets-arbitrum",
    title: "PEPE and WIF markets added on Arbitrum",
    isActive: true,
    startDate: "17 Jul 2024, 00:00",
    endDate: "01 Aug 2024, 00:00",
    bodyText: "Trade PEPE/USD and WIF/USD, or provide liquidity to these pools by using PEPE, WIF, or USDC.",
  },
  {
    id: "arbitrum-and-avalanche-incentives-launch-3",
    title: "Arbitrum and Avalanche Incentives are Live",
    isActive: true,
    endDate: "16 Sep 2024, 00:00",
    startDate: "03 Jul 2024, 00:00",
    bodyText: (
      <Trans>
        Incentives are live for <ExternalLink href={getIncentivesV2Url(ARBITRUM)}>Arbitrum</ExternalLink> and{" "}
        <ExternalLink href={getIncentivesV2Url(AVALANCHE)}>Avalanche</ExternalLink> GM pools and V2 trading.
      </Trans>
    ),
  },
  {
    id: "arbitrum-incentives-launch-2",
    title: "Arbitrum Incentives are Live",
    isActive: true,
    endDate: "03 Jul 2024, 00:00",
    bodyText: "Incentives are live for Arbitrum GM pools and V2 trading.",
    link: {
      text: "Read more",
      href: getIncentivesV2Url(ARBITRUM),
      newTab: true,
    },
  },
  {
    id: "binance-wallet-campaign",
    title: "Binance Web3 Wallet Trading Campaign is Live",
    isActive: true,
    endDate: "09 Apr 2024, 23:59",
    bodyText: ["Complete any or all of the six GMX campaign tasks and qualify for rewards!"],
    link: {
      text: "Check your tasks and their completion status",
      href: "https://www.binance.com/en/activity/mission/gmx-airdrop",
      newTab: true,
    },
  },
  {
    id: "btc-eth-single-token-markets",
    title: "New BTC/USD and ETH/USD single token GM pools",
    isActive: true,
    endDate: "2 May 2024, 23:59",
    bodyText: [
      "Use only BTC or ETH to provide liquidity to BTC/USD or ETH/USD. Now, you can buy GM without being exposed to stablecoins.",
    ],
    link: {
      text: "View GM pools",
      href: "/#/pools",
    },
  },
  {
    id: "delegate-voting-power",
    title: "Delegate your GMX Voting Power",
    isActive: false,
    endDate: "6 Jun 2024, 23:59",
    bodyText: (
      <>
        <ExternalLink href="https://www.tally.xyz/gov/gmx">The GMX DAO is now live on Tally</ExternalLink>. Please{" "}
        <ExternalLink href="https://www.tally.xyz/gov/gmx/my-voting-power">delegate your voting power</ExternalLink>{" "}
        before staking or claiming GMX rewards.
      </>
    ),
  },
  {
    id: "max-leverage-doge",
    title: "Max leverage increased",
    isActive: true,
    endDate: "14 Jun 2024, 0:00",
    bodyText: (
      <>
        Trade <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("DOGE")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("BNB")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("SOL")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("LTC")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("LINK")} />
        {" and "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("XRP")} /> with up to 100x leverage,
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("ARB")} /> with up to 75x leverage and{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("ATOM")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("AVAX")} />
        {" and "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("UNI")} /> with up to 60x on Arbitrum.
      </>
    ),
  },
  {
    id: "gmxusdc-market",
    title: "GMX/USD market added on Arbitrum",
    isActive: true,
    endDate: "14 Jun 2024, 0:00",
    bodyText: "Trade GMX/USD, or provide liquidity using GMX or USDC.",
    link: {
      text: "Read more",
      href: "https://snapshot.org/#/gmx.eth/proposal/0x5fc32bea68c7e2ee237c86bae73859f742304c130df9a44495b816cc62b4f30f",
      newTab: true,
    },
  },
  {
    id: "account-dashboard-feature",
    title: "New PnL Analysis Dashboard",
    isActive: true,
    endDate: "21 Jun 2024, 0:00",
    bodyText:
      "Check the new PnL dashboard for traders under the wallet submenu or the trades history tab when connected.",
  },
  {
    id: "avalanche-single-side-btc-eth-avax-markets",
    title: "New BTC/USD, ETH/USD, and AVAX/USD single token GM pools on Avalanche",
    isActive: true,
    bodyText: (
      <>
        Use only <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("BTC")} />,{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("ETH")} />, or{" "}
        <TokenSymbolWithIcon symbol={getNormalizedTokenSymbol("AVAX")} /> to provide liquidity to BTC/USD, ETH/USD, or
        AVAX/USD. Buy GM without being exposed to stablecoins.
      </>
    ),
    endDate: "14 Jul 2024, 23:59",
  },
];
