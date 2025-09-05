// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { type JSX } from "react";
import { Link } from "react-router-dom";

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
