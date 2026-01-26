// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { type JSX } from "react";
import { Link } from "react-router-dom";

import ExternalLink from "components/ExternalLink/ExternalLink";
import TokenIcon from "components/TokenIcon/TokenIcon";

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

export const AL16Z_DELISTING_EVENT_ID = "al16z-delisting";

export const appEventsData: EventData[] = [
  {
    id: "xaut-lit-ip-arbitrum-listing",
    isActive: true,
    startDate: "23 Jan 2026, 11:00",
    endDate: "30 Jan 2026, 10:00",
    title: "XAUT (Tether Gold), LIT and IP markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>, or GLV <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
  },
  {
    id: "listing-01-09-26",
    isActive: true,
    startDate: "09 Jan 2026, 10:00",
    endDate: "16 Jan 2026, 12:00",
    title: "AR, DASH, JTO, SYRUP and CHZ markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span> or GLV <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
  },
  {
    id: "mon-sky-zec-listing",
    isActive: true,
    startDate: "22 Dec 2025, 16:10",
    endDate: "29 Dec 2025, 16:10",
    title: "MON (Monad), SKY and ZEC (Zcash) markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>, or GLV <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
  },
  {
    id: "open-interest-calculation-update",
    isActive: true,
    startDate: "19 Dec 2025, 08:00",
    endDate: "26 Dec 2025, 08:00",
    title: "Open Interest Calculation Update",
    bodyText: (
      <>
        From 22nd December, the open interest will now be tracked in token amounts instead of USD values for improved
        balance accuracy. <ExternalLink href="https://t.me/GMX_Announcements/1175">Read more</ExternalLink>.
      </>
    ),
  },
  {
    id: AL16Z_DELISTING_EVENT_ID,
    isActive: true,
    startDate: "06 Nov 2025, 08:00",
    endDate: "06 Dec 2025, 08:00",
    title: "AI16Z/USD delisting",
    bodyText: (
      <>
        Position openings for AI16Z/USD are no longer available. Existing positions remain open, but closing them is
        recommended.
        <br />
        <br />
        The listing committee will evaluate the listing of ELIZAOS/USD.
      </>
    ),
  },
  {
    id: "xaut0-avalanche-listing",
    isActive: true,
    startDate: "17 Oct 2025, 10:00",
    endDate: "24 Oct 2025, 10:00",
    title: "XAUt0 markets added on Avalanche",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM{" "}
        <span className="text-slate-100">[XAUt0-XAUt0]</span> or GM <span className="text-slate-100">[XAUt0-USDT]</span>
        .
      </>
    ),
  },
  {
    id: "morpho-glv-lending",
    isActive: true,
    startDate: "14 Oct 2025, 6:00",
    endDate: "21 Oct 2025, 6:00",
    title: "Morpho now supports GLV",
    bodyText: (
      <>
        Lending and borrowing is now available for GLV assets:{" "}
        <TokenIcon symbol="GLV" displaySize={16} className="mb-4" /> <span className="text-slate-100">[BTC-USDC]</span>{" "}
        and <TokenIcon symbol="GLV" displaySize={16} className="mb-4" />{" "}
        <span className="text-slate-100">[ETH-USDC]</span> on{" "}
        <ExternalLink href="https://app.morpho.org/arbitrum/borrow?search=GLV">Morpho</ExternalLink>.
      </>
    ),
  },
  {
    id: "aster-0g-avnt-linea-listing",
    isActive: true,
    startDate: "09 Oct 2025, 14:30",
    endDate: "16 Oct 2025, 12:00",
    title: "0G, ASTER, AVNT and LINEA markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM, GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>, or GLV <span className="text-slate-100">[WBTC-USDC]</span>.
      </>
    ),
  },
  {
    id: "xpl-bnb-sol-listing",
    isActive: true,
    startDate: "25 Sep 2025, 16:50",
    endDate: "02 Oct 2025, 18:00",
    title: "XPL (Plasma), BNB and SOL markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WBTC-USDC]</span>.
      </>
    ),
  },
  {
    id: "zora-kta-listing",
    isActive: true,
    startDate: "18 Sep 2025, 14:00",
    endDate: "25 Sep 2025, 12:00",
    title: "ZORA and KTA markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
  },
  {
    id: "new-interface-and-price-impact-improvements",
    isActive: true,
    startDate: "08 Sep 2025, 12:00",
    endDate: "22 Sep 2025, 12:00",
    title: "New interface and price impact improvements",
    bodyText: (
      <>
        The app has a revamped interface, including a new light theme. Price impact is now capped and charged only on
        position close. <ExternalLink href="https://x.com/GMX_IO/status/1965077965236056467">Read more</ExternalLink>.
      </>
    ),
  },
  {
    id: "listing-09-04",
    isActive: true,
    startDate: "04 Sep 2025, 10:00",
    endDate: "11 Sep 2025, 12:00",
    title: "LINK, MORPHO, VVV and WELL markets added on Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span>.
      </>
    ),
  },
  {
    id: "wlfi-listing",
    isActive: true,
    startDate: "01 Sep 2025, 12:00",
    endDate: "07 Sep 2025, 12:00",
    title: "WLFI market added on Avalanche and Arbitrum",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> this market, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WAVAX-USDC]</span> for WLFI on Avalanche, and GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span> on Arbitrum.
      </>
    ),
  },
  {
    id: "aero-brett-pbtc-listing",
    isActive: true,
    startDate: "28 Aug 2025, 10:00",
    endDate: "04 Sep 2025, 12:00",
    title: "AERO and BRETT markets added on Arbitrum, BTC market added on Botanix",
    bodyText: (
      <>
        <Link to="/trade">Trade</Link> these markets, or <Link to="/pools">provide liquidity</Link> using GM or GLV{" "}
        <span className="text-slate-100">[WETH-USDC]</span> for AERO and BRETT, or GM{" "}
        <span className="text-slate-100">[PBTC]</span> for BTC.
      </>
    ),
  },
];
