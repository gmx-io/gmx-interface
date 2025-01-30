// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { Trans } from "@lingui/macro";
import { type JSX } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE } from "./chains";
import { getIncentivesV2Url } from "./links";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

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
    id: "ai16z-anime-fartcoin-listing",
    title: "AI16Z, ANIME and FARTCOIN markets added on Arbitrum",
    isActive: true,
    startDate: "30 Jan 2025, 17:00",
    endDate: "05 Feb 2025, 17:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="AI16Z" />
        /USD, <TokenSymbolWithIcon symbol="ANIME" />
        /USD and <TokenSymbolWithIcon symbol="FARTCOIN" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WBTC" />,{" "}
        <TokenSymbolWithIcon symbol="ANIME" />, <TokenSymbolWithIcon symbol="USDC" />, or by purchasing{" "}
        <span className="whitespace-nowrap">
          <TokenSymbolWithIcon symbol="GLV" /> [WBTC-USDC]
        </span>
        .
      </>
    ),
  },
  {
    id: "ena-melania-listing",
    title: "ENA and MELANIA markets added on Arbitrum",
    isActive: true,
    startDate: "23 Jan 2025, 16:00",
    endDate: "29 Jan 2025, 16:00",
    bodyText: (
      <>
        Trade <TokenSymbolWithIcon symbol="ENA" />
        /USD and <TokenSymbolWithIcon symbol="MELANIA" />
        /USD, or provide liquidity to these pools using <TokenSymbolWithIcon symbol="ETH" />,{" "}
        <TokenSymbolWithIcon symbol="USDC" />, or by purchasing <TokenSymbolWithIcon symbol="GLV" /> [ETH-USDC].
      </>
    ),
  },
  {
    id: "trump-listing",
    title: "TRUMP market added on Arbitrum",
    isActive: true,
    startDate: "20 Jan 2025, 14:30",
    endDate: "27 Jan 2025, 00:00",
    bodyText: (
      <>
        Trade <TokenSymbolWithIcon symbol="TRUMP" />
        /USD, or provide liquidity to the pool using <TokenSymbolWithIcon symbol="ETH" />,{" "}
        <TokenSymbolWithIcon symbol="USDC" />, or by purchasing <TokenSymbolWithIcon symbol="GLV" /> [ETH-USDC].
      </>
    ),
  },
  {
    id: "trading-fees-reduction",
    title: "Trading fees reduced",
    isActive: true,
    startDate: "6 Jan 2025, 12:00",
    endDate: "13 Jan 2025, 12:00",
    bodyText: (
      <>
        Open and close fees have been lowered from 5/7 bps to 4/6 bps with the introduction of liquidation fees.
        <br />
        <br />
        <ExternalLink href="https://t.me/GMX_Announcements/963">Read more</ExternalLink>.
      </>
    ),
  },
  {
    id: "dydx-inj-listing",
    title: "DYDX and INJ markets added on Arbitrum",
    isActive: true,
    startDate: "26 Dec 2024, 15:00",
    endDate: "01 Jan 2025, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="DYDX" />
        /USD and <TokenSymbolWithIcon symbol="INJ" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WBTC" />,{" "}
        <TokenSymbolWithIcon symbol="USDC" />, or by purchasing <TokenSymbolWithIcon symbol="GLV" /> [WBTC-USDC].
      </>
    ),
  },
  {
    id: "fil-listing",
    title: "Filecoin (FIL) market added on Arbitrum",
    isActive: true,
    startDate: "12 Dec 2024, 18:00",
    endDate: "18 Dec 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="FIL" />
        /USD or <Link to="/pools">provide liquidity</Link> to this market using <TokenSymbolWithIcon symbol="WBTC" />,{" "}
        <TokenSymbolWithIcon symbol="USDC" />, or by purchasing <TokenSymbolWithIcon symbol="GLV" /> [WBTC-USDC].
      </>
    ),
  },
  {
    id: "trading-fees-reduction",
    title: "Trading fees are reduced",
    isActive: true,
    startDate: "28 Nov 2024, 00:00",
    endDate: "18 Dec 2024, 00:00",
    bodyText: (
      <>
        Open and close fees are reduced by 25% for <TokenSymbolWithIcon symbol="SOL" />
        /USD, <TokenSymbolWithIcon symbol="DOGE" />
        /USD, and <TokenSymbolWithIcon symbol="LINK" />
        /USD markets on Arbitrum.
        <br />
        <ExternalLink href="https://x.com/GMX_IO/status/1861743953537569043">Learn more</ExternalLink>.
      </>
    ),
  },
  {
    id: "render-sol-xlm-listing",
    title: "RENDER, SOL single-sided, and XLM markets added on Arbitrum",
    isActive: true,
    startDate: "29 Nov 2024, 16:00",
    endDate: "5 Dec 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="RENDER" />
        /USD, <TokenSymbolWithIcon symbol="SOL" />
        /USD, and <TokenSymbolWithIcon symbol="XLM" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WBTC" />,{" "}
        <TokenSymbolWithIcon symbol="WETH" /> or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "ada-bch-dot-icp-listing",
    title: "ADA, BCH, DOT, and ICP markets added on Arbitrum",
    isActive: true,
    startDate: "28 Nov 2024, 16:00",
    endDate: "4 Dec 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="ADA" />
        /USD, <TokenSymbolWithIcon symbol="BCH" />
        /USD, <TokenSymbolWithIcon symbol="DOT" />
        /USD and <TokenSymbolWithIcon symbol="ICP" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WBTC" />{" "}
        or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "gmx-pendle-listing",
    title: "GMX single-sided and PENDLE markets added on Arbitrum",
    isActive: true,
    startDate: "22 Nov 2024, 00:00",
    endDate: "28 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="GMX" />
        /USD and <TokenSymbolWithIcon symbol="PENDLE" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="PENDLE" />
        , <TokenSymbolWithIcon symbol="GMX" /> or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "bome-floki-meme-mew-listing",
    title: "BOME, FLOKI, MEW, MEME and TAO markets added on Arbitrum",
    isActive: true,
    startDate: "21 Nov 2024, 16:00",
    endDate: "27 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="BOME" />
        /USD, <TokenSymbolWithIcon symbol="FLOKI" />
        /USD, <TokenSymbolWithIcon symbol="MEW" />
        /USD and <TokenSymbolWithIcon symbol="MEME" />
        /USD and <TokenSymbolWithIcon symbol="TAO" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WBTC" />{" "}
        or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "wld-listing",
    title: "BONK and WLD markets added on Arbitrum",
    isActive: true,
    startDate: "15 Nov 2024, 12:00",
    endDate: "21 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="BONK" />
        /USD and <TokenSymbolWithIcon symbol="WLD" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WETH" />{" "}
        or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "trx-ton-listing",
    title: "TON and TRX markets added on Arbitrum",
    isActive: true,
    startDate: "7 Nov 2024, 15:00",
    endDate: "13 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="TON" />
        /USD and <TokenSymbolWithIcon symbol="TRX" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WETH" />{" "}
        or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "apt-tia-listing",
    title: "TIA and APT markets added on Arbitrum",
    isActive: true,
    startDate: "31 Oct 2024, 18:00",
    endDate: "6 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="TIA" />
        /USD and <TokenSymbolWithIcon symbol="APT" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="WETH" />{" "}
        or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "gmx-buyback",
    title: "GMX buybacks are now enabled",
    isActive: true,
    startDate: "29 Oct 2024, 00:00",
    endDate: "15 Nov 2024, 00:00",
    bodyText: (
      <>
        Starting October 30, GMX fees from V1 (30%) and V2 (27%) will fund GMX token buybacks, distributed as GMX
        staking rewards instead of ETH/AVAX.
      </>
    ),
  },
  {
    id: "auto-cancel",
    title: "TP/SL orders automatically cancelled with position closure",
    isActive: true,
    startDate: "01 Oct 2024, 00:00",
    endDate: "15 Nov 2024, 00:00",
    bodyText: (
      <>
        New Take-Profit and Stop-Loss orders will now be automatically cancelled when the associated position is fully
        closed. You can disable this feature in the settings.
        <br />
        <br />
        You can enable Auto-Cancel for your existing TP/SL orders by clicking{" "}
        <Link to="/trade?setOrdersAutoCancel=1">here</Link>.
      </>
    ),
  },
  {
    id: "ape-sui-sei-markets-arbitrum",
    title: "APE, SUI, and SEI markets added on Arbitrum",
    isActive: false,
    startDate: "24 Oct 2024, 00:00",
    endDate: "7 Nov 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="APE" />
        /USD, <TokenSymbolWithIcon symbol="SUI" />
        /USD and <TokenSymbolWithIcon symbol="SEI" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="APE" />,{" "}
        <TokenSymbolWithIcon symbol="WETH" /> or <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "pol-aave-pepe-uni-markets-arbitrum",
    title: "POL, AAVE, PEPE, and UNI markets added on Arbitrum",
    isActive: false,
    startDate: "17 Oct 2024, 00:00",
    endDate: "31 Oct 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="POL" />
        /USD, <TokenSymbolWithIcon symbol="AAVE" />
        /USD, <TokenSymbolWithIcon symbol="PEPE" />
        /USD and <TokenSymbolWithIcon symbol="UNI" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools using <TokenSymbolWithIcon symbol="ETH" /> or{" "}
        <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "eigen-sats-market-arbitrum",
    title: "EIGEN and SATS markets added on Arbitrum",
    isActive: true,
    startDate: "10 Oct 2024, 00:00",
    endDate: "24 Oct 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="EIGEN" />
        /USD and <TokenSymbolWithIcon symbol="SATS" />
        /USD, or <Link to="/pools">provide liquidity</Link> to these pools by using{" "}
        <TokenSymbolWithIcon symbol="WETH" />, <TokenSymbolWithIcon symbol="WBTC" /> or{" "}
        <TokenSymbolWithIcon symbol="USDC" />.
      </>
    ),
  },
  {
    id: "glv-wavax",
    title: "GLV [WAVAX-USDC] is live",
    isActive: true,
    startDate: "01 Oct 2024, 00:00",
    endDate: "15 Oct 2024, 00:00",
    bodyText: (
      <>
        <Link to="/pools/?market=0x901eE57f7118A7be56ac079cbCDa7F22663A3874&operation=buy&scroll=1">Buy</Link> the first
        automatically rebalanced vault on Avalanche combining multiple GM tokens with WAVAX, USDC, or eligible GM
        tokens.
      </>
    ),
    link: {
      text: "Read more",
      href: "https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools",
      newTab: true,
    },
  },
  {
    id: "tbtc-market-arbitrum",
    title: "BTC/USD [tBTC] market added on Arbitrum",
    isActive: true,
    startDate: "10 Sep 2024, 00:00",
    endDate: "25 Sep 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> <TokenSymbolWithIcon symbol="BTC" />
        /USD, or{" "}
        <Link to="/pools/?market=0xd62068697bCc92AF253225676D618B0C9f17C663&operation=buy&scroll=1">
          provide liquidity
        </Link>{" "}
        to this pool by using <TokenSymbolWithIcon symbol="tBTC" />.
      </>
    ),
  },
  {
    id: "btc-glv-market",
    title: "GLV [BTC-USDC] is live",
    isActive: true,
    startDate: "10 Sep 2024, 00:00",
    endDate: "24 Sep 2024, 00:00",
    bodyText: (
      <>
        <Link to="/pools/?market=0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96&operation=buy&scroll=1">Buy</Link> the
        second automatically rebalanced vault combining multiple GM tokens with BTC, USDC, or eligible GM tokens on
        Arbitrum.
      </>
    ),
    link: {
      text: "Read more",
      href: "https://docs.gmx.io/docs/providing-liquidity/v2/#glv-pools",
      newTab: true,
    },
  },
  {
    id: "zero-price-impact",
    title: "Zero price impact on BTC/USD and ETH/USD single-side pools",
    isActive: true,
    startDate: "30 Aug 2024, 00:00",
    endDate: "30 Sep 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> with no price impact on <TokenSymbolWithIcon symbol="BTC" />
        /USD [BTC] and <TokenSymbolWithIcon symbol="ETH" />
        /USD [WETH] markets on Arbitrum.
      </>
    ),
  },
  {
    id: "ordi-stx-market-arbitrum",
    title: "ORDI and STX markets added on Arbitrum",
    isActive: true,
    startDate: "14 Aug 2024, 00:00",
    endDate: "28 Aug 2024, 00:00",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> ORDI/USD and STX/USD, or <Link to="/pools">provide liquidity</Link> to these
        pools by using <TokenSymbolWithIcon symbol="wBTC" /> or <TokenSymbolWithIcon symbol="USDC" />.
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
