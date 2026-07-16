// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ARBITRUM, AVALANCHE, BOTANIX, MEGAETH } from "config/chains";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TokenIcon from "components/TokenIcon/TokenIcon";

import release117PositionFilterPoster from "img/release-117-position-filter-poster.webp";
import release117PositionFilterDemo from "img/release-117-position-filter.mp4";
import sparkleIcon from "img/sparkle.svg";

export type AnnouncementType = "listing" | "delisting" | "update" | "maintenance";
export type AnnouncementVariant = "info" | "warning" | "error" | "success";

export type EventData = {
  id: string;
  type: AnnouncementType;
  title: ReactNode;
  summary?: ReactNode;
  description: ReactNode;

  isActive?: boolean;
  /**
   * KLI UI flag ID. When present, overrides `isActive` — visibility is controlled by KLI.
   */
  flagId?: string;

  startDate?: string;
  endDate: string;

  variant?: AnnouncementVariant;
  chains?: number[];
  link?: {
    text: string;
    href: string;
    /**
     * @default false
     */
    newTab?: boolean;
  };

  requiresOpenPosition?: string;
};

export const appEventsData: EventData[] = [
  {
    id: "release-118-highlights",
    type: "update",
    isActive: true,
    startDate: "17 Jul 2026, 14:00",
    endDate: "24 Jul 2026, 14:00",
    variant: "info",
    title: "App Update: Passkey Login, Wallet Funding, and Performance Sharing",
    summary: (
      <>
        Sign in with a passkey, fund your wallet with a card, share your performance, and skip swap fees on TP/SL
        closes.
      </>
    ),
    description: (
      <span className="flex flex-col gap-12">
        <span>
          Create a GMX wallet with just a passkey. Face ID, Touch ID, Windows Hello, or Android biometrics get you
          trading, with no email or seed phrase required. Funding is built into the Receive flow: buy crypto with a
          card, Apple Pay, or Google Pay, or transfer from another wallet, exchange, or chain.
        </span>
        <span>
          Share your results: the Account Dashboard now generates a performance card with your PnL, win rate, and
          cumulative PnL curve, carrying your referral code.
        </span>
        <span>
          TP/SL and TWAP close orders can now return profit and collateral separately, skipping the internal swap and
          its fee. The app also warns you if a resting increase order would be liquidatable at its trigger price.
        </span>
        <span>Your TradingView chart drawings and tool settings now survive refreshes.</span>
        <span>The Support menu now shows how many replies came in while you were away.</span>
      </span>
    ),
  },
  {
    id: "release-117-highlights",
    type: "update",
    isActive: true,
    startDate: "09 Jul 2026, 14:00",
    endDate: "20 Jul 2026, 14:00",
    variant: "info",
    title: "App Update: PnL Charts, Trade History, and Wallet functionality",
    summary: (
      <>
        Analyze your PnL in more detail, follow any position's full history, and manage funds without leaving the app.
      </>
    ),
    description: (
      <span className="flex flex-col gap-12">
        <span>
          <span className="font-medium text-typography-primary">Account Dashboard:</span> the PnL chart now supports
          daily, weekly, and monthly views, zoom and pan (pinch on mobile), and shares its date range with Trade
          History. Performance details now show your trader rank and a full breakdown of realized and unrealized PnL and
          fees.
        </span>
        <span>
          <span className="font-medium text-typography-primary">Trade History:</span> filter by position to follow every
          action in a position's lifecycle, from open to full close.
        </span>
        <video
          aria-label="Filter Trade History by position"
          className="h-auto w-full rounded-8"
          autoPlay
          controls
          loop
          muted
          playsInline
          poster={release117PositionFilterPoster}
          preload="metadata"
          width={800}
          height={250}
        >
          <source src={release117PositionFilterDemo} type="video/mp4" />
        </video>
        <span>
          <span className="font-medium text-typography-primary">Wallet:</span> new Send and Receive buttons for your
          connected wallet. Receive shows your address as a QR code to copy or scan, and Send transfers tokens to any
          address, with the network fee shown before you confirm.
        </span>
        <span>
          <span className="font-medium text-typography-primary">GMX Account:</span> deposits now start by picking the
          asset you want to move, and each deposit's progress is tracked in Transfer history.
        </span>
        <span>
          <span className="font-medium text-typography-primary">TP/SL orders:</span> the app now warns when a TP or SL
          trigger price is beyond your liquidation price.
        </span>
        <span>
          <span className="font-medium text-typography-primary">Additional bug fixes:</span> market orders no longer get
          stuck as pending after executing, and GM pool fee data loads reliably again in Pools and Earn.
        </span>
      </span>
    ),
  },
  {
    id: "botanix-withdraw-deadline",
    type: "delisting",
    isActive: true,
    startDate: "24 Jun 2026, 16:45",
    endDate: "01 Aug 2026, 0:00",
    chains: [BOTANIX],
    title: "Botanix network is shutting down",
    summary: <>Remove your GM liquidity and withdraw your funds from Botanix by July 9, 2026.</>,
    description: (
      <>
        In the swap interface, swap pBTC to BTC, or stBTC to pBTC then pBTC to BTC. stBTC can also be unstaked to BTC
        directly on Botanix. Move your BTC off the network before the deadline.
        <br />
        <br />
        <Link to="/pools">Withdraw liquidity</Link>
      </>
    ),
  },
  {
    id: "spcx-stock-arbitrum-transition",
    type: "update",
    isActive: true,
    startDate: "12 Jun 2026, 12:00",
    endDate: "19 Jun 2026, 12:00",
    chains: [ARBITRUM],
    title: "SpaceX pre-IPO market is now a 24/7 stock perp on Arbitrum",
    description: (
      <>
        SpaceX pre-IPO market transitioned into a stock market. <Link to="/trade">Trade SPCX</Link> under TradFi &gt;
        Stocks. Existing positions transitioned automatically.
      </>
    ),
  },
  {
    id: "mega-arbitrum-megaeth-listing",
    type: "listing",
    flagId: "showMegaListingArbitrumMegaeth",
    startDate: "01 May 2026, 12:00",
    endDate: "07 May 2026, 12:00",
    chains: [ARBITRUM, MEGAETH],
    title: "MEGA market added on Arbitrum and MegaETH",
    description: (
      <>
        <Link to="/trade">Trade</Link> MEGA, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span> on Arbitrum, or GLV{" "}
        <span className="text-slate-100">[USDM-USDM]</span> on MegaETH.
      </>
    ),
  },
  {
    id: "megaeth-points-program",
    type: "update",
    flagId: "showMegaethPoints",
    startDate: "30 Apr 2026, 0:00",
    endDate: "31 Dec 2026, 0:00",
    chains: [MEGAETH],
    title: "Earn points on GMX MegaETH",
    summary: (
      <>
        Earn points each epoch across four activities: trading, referral volume, trader PnL, and GLV{" "}
        <span className="text-slate-100">[USDM-USDM]</span> liquidity.
      </>
    ),
    description: (
      <span className="grid grid-cols-[auto_1fr] items-start gap-x-8 gap-y-12">
        <img className="mt-3 h-12" src={sparkleIcon} alt="" />
        <span>
          <span className="block font-medium">Trading activity</span>
          <span className="block text-12 text-slate-100">Based on cumulative trading volume</span>
        </span>
        <img className="mt-3 h-12" src={sparkleIcon} alt="" />
        <span>
          <span className="block font-medium">Referral volume</span>
          <span className="block text-12 text-slate-100">Trading volume from wallets using your referral code</span>
        </span>
        <img className="mt-3 h-12" src={sparkleIcon} alt="" />
        <span>
          <span className="block font-medium">Trader PnL</span>
          <span className="block text-12 text-slate-100">Net positive realized PnL only, to reward skill</span>
        </span>
        <img className="mt-3 h-12" src={sparkleIcon} alt="" />
        <span>
          <span className="block font-medium">
            GLV <span className="text-slate-100">[USDM-USDM]</span> liquidity
          </span>
          <span className="block text-12 text-slate-100">Time-weighted share of the vault over the epoch</span>
        </span>
      </span>
    ),
  },
  {
    id: "gold-silver-fee-reduction",
    type: "update",
    flagId: "showGoldSilverFeeReduction",
    startDate: "16 Apr 2026, 12:00",
    endDate: "21 Apr 2026, 12:00",
    chains: [ARBITRUM],
    title: "GOLD and SILVER trading fees heavily reduced",
    description: (
      <>Position fees for GOLD/USD and SILVER/USD have been lowered to 1/2 bps from 4/6 bps during on-hours.</>
    ),
    link: { text: "Read more", href: "https://docs.gmx.io/docs/trading/overview/#fees", newTab: true },
  },
  {
    id: "gold-silver-arbitrum-listing",
    type: "listing",
    isActive: true,
    startDate: "10 Apr 2026, 12:00",
    endDate: "17 Apr 2026, 12:00",
    chains: [ARBITRUM],
    title: "GOLD and SILVER commodity markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> GOLD and SILVER perpetuals 24/7 with up to 100x leverage, or{" "}
        <Link to="/pools">provide liquidity</Link> via GLV <span className="text-slate-100">[WETH-USDC]</span>. Find
        them under the TradFi category in the market dropdown.
      </>
    ),
  },
  {
    id: "energy-markets-arbitrum-listing",
    type: "listing",
    flagId: "showEnergyMarketsArbitrumListing",
    startDate: "23 Apr 2026, 12:00",
    endDate: "30 Apr 2026, 12:00",
    chains: [ARBITRUM],
    title: "WTI Crude Oil, Brent Crude Oil and Natural Gas energy commodity markets added on Arbitrum",
    description: (
      <>
        Trade WTIOIL, BRENTOIL (up to 100x leverage) and NATGAS (up to 40x leverage) perpetuals 24/7, or{" "}
        <Link to="/pools">provide liquidity</Link> via GLV <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
    link: {
      text: "Read more",
      href: "https://docs.gmx.io/docs/trading/overview/#rwa-and-commodity-markets",
      newTab: true,
    },
  },
  {
    id: "megaeth-launch",
    type: "update",
    isActive: true,
    startDate: "03 Apr 2026, 0:00",
    endDate: "10 Apr 2026, 16:00",
    title: "GMX is now live on MegaETH",
    description: (
      <>
        Trade perpetuals, create and share your referral code, and provide liquidity on MegaETH using its native
        stablecoin: USDm.
      </>
    ),
    link: { text: "Read more", href: "https://gmxio.substack.com/p/gmx-is-now-live-on-megaeth-trade", newTab: true },
  },
  {
    id: "cc-met-arbitrum-listing",
    type: "listing",
    isActive: true,
    startDate: "13 Feb 2026, 14:00",
    endDate: "20 Feb 2026, 14:00",
    chains: [ARBITRUM],
    title: "CC (Canton) and MET (Meteora) markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>.
      </>
    ),
  },
  {
    id: "xaut-lit-ip-arbitrum-listing",
    type: "listing",
    isActive: true,
    startDate: "23 Jan 2026, 11:00",
    endDate: "30 Jan 2026, 10:00",
    chains: [ARBITRUM],
    title: "XAUT (Tether Gold), LIT and IP markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>, or GLV <span className="text-slate-100">[WETH-USDC]</span>
      </>
    ),
  },
  {
    id: "listing-01-09-26",
    type: "listing",
    isActive: true,
    startDate: "09 Jan 2026, 10:00",
    endDate: "16 Jan 2026, 12:00",
    chains: [ARBITRUM],
    title: "AR, DASH, JTO, SYRUP and CHZ markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>, or GLV <span className="text-slate-100">[WETH-USDC]</span>
      </>
    ),
  },
  {
    id: "mon-sky-zec-listing",
    type: "listing",
    isActive: true,
    startDate: "22 Dec 2025, 16:10",
    endDate: "29 Dec 2025, 16:10",
    chains: [ARBITRUM],
    title: "MON (Monad), SKY and ZEC (Zcash) markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>, or GLV <span className="text-slate-100">[WETH-USDC]</span>
      </>
    ),
  },
  {
    id: "open-interest-calculation-update",
    type: "update",
    isActive: true,
    startDate: "19 Dec 2025, 08:00",
    endDate: "26 Dec 2025, 08:00",
    title: "Open Interest Calculation Update",
    description: (
      <>
        From 22nd December, open interest will be tracked in token amounts instead of USD values for improved balance
        accuracy.
      </>
    ),
    link: { text: "Read more", href: "https://t.me/GMX_Announcements/1175", newTab: true },
  },
  {
    id: "xaut0-avalanche-listing",
    type: "listing",
    isActive: true,
    startDate: "17 Oct 2025, 10:00",
    endDate: "24 Oct 2025, 10:00",
    chains: [AVALANCHE],
    title: "XAUt0 markets added on Avalanche",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM{" "}
        <span className="text-slate-100">[XAUt0-XAUt0]</span> or GM <span className="text-slate-100">[XAUt0-USDT]</span>
      </>
    ),
  },
  {
    id: "morpho-glv-lending",
    type: "update",
    isActive: true,
    startDate: "14 Oct 2025, 6:00",
    endDate: "21 Oct 2025, 6:00",
    chains: [ARBITRUM],
    title: "Morpho now supports GLV",
    description: (
      <>
        Lending and borrowing are now available for GLV assets:{" "}
        <TokenIcon symbol="GLV" displaySize={16} className="mb-4" /> <span className="text-slate-100">[BTC-USDC]</span>{" "}
        and <TokenIcon symbol="GLV" displaySize={16} className="mb-4" />{" "}
        <span className="text-slate-100">[ETH-USDC]</span> on{" "}
        <ExternalLink href="https://app.morpho.org/arbitrum/borrow?search=GLV">Morpho</ExternalLink>
      </>
    ),
  },
  {
    id: "aster-0g-avnt-linea-listing",
    type: "listing",
    isActive: true,
    startDate: "09 Oct 2025, 14:30",
    endDate: "16 Oct 2025, 12:00",
    chains: [ARBITRUM],
    title: "0G, ASTER, AVNT and LINEA markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>, or GLV <span className="text-slate-100">[WBTC-USDC]</span>
      </>
    ),
  },
  {
    id: "xpl-bnb-sol-listing",
    type: "listing",
    isActive: true,
    startDate: "25 Sep 2025, 16:50",
    endDate: "02 Oct 2025, 18:00",
    chains: [ARBITRUM],
    title: "XPL (Plasma), BNB and SOL markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>
      </>
    ),
  },
  {
    id: "zora-kta-listing",
    type: "listing",
    isActive: true,
    startDate: "18 Sep 2025, 14:00",
    endDate: "25 Sep 2025, 12:00",
    chains: [ARBITRUM],
    title: "ZORA and KTA markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>
      </>
    ),
  },
  {
    id: "new-interface-and-price-impact-improvements",
    type: "update",
    isActive: true,
    startDate: "08 Sep 2025, 12:00",
    endDate: "22 Sep 2025, 12:00",
    title: "New interface and price impact improvements",
    description: (
      <>
        The app has a revamped interface, including a new light theme. Price impact is now capped and charged only on
        position close.
      </>
    ),
    link: { text: "Read more", href: "https://x.com/GMX_IO/status/1965077965236056467", newTab: true },
  },
  {
    id: "listing-09-04",
    type: "listing",
    isActive: true,
    startDate: "04 Sep 2025, 10:00",
    endDate: "11 Sep 2025, 12:00",
    chains: [ARBITRUM],
    title: "LINK, MORPHO, VVV and WELL markets added on Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>
      </>
    ),
  },
  {
    id: "wlfi-listing",
    type: "listing",
    isActive: true,
    startDate: "01 Sep 2025, 12:00",
    endDate: "07 Sep 2025, 12:00",
    chains: [AVALANCHE, ARBITRUM],
    title: "WLFI market added on Avalanche and Arbitrum",
    description: (
      <>
        <Link to="/trade">Trade</Link> this market, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WAVAX-USDC]</span> for WLFI on Avalanche, and GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span> on Arbitrum
      </>
    ),
  },
  {
    id: "aero-brett-pbtc-listing",
    type: "listing",
    isActive: true,
    startDate: "28 Aug 2025, 10:00",
    endDate: "04 Sep 2025, 12:00",
    chains: [ARBITRUM, BOTANIX],
    title: "AERO and BRETT markets added on Arbitrum, BTC market added on Botanix",
    description: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span> for AERO and BRETT, or GM{" "}
        <span className="text-slate-100">[PBTC]</span> for BTC
      </>
    ),
  },
];
