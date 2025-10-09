// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { type JSX } from "react";
import { Link } from "react-router-dom";

import ExternalLink from "components/ExternalLink/ExternalLink";

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

export const MKR_USD_DELISTING_EVENT_ID = "mkr-usd-delisting";

export const appEventsData: EventData[] = [
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
    id: MKR_USD_DELISTING_EVENT_ID,
    isActive: true,
    startDate: "16 Sep 2025, 10:00",
    endDate: "30 Sep 2025, 12:00",
    title: "MKR/USD delisting",
    bodyText: (
      <>
        Position opening for MKR/USD are no longer available. Existing positions remain open, but closing is
        recommended.
        <br />
        <br />
        The listing committee will evaluate listing SKY/USD.
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
