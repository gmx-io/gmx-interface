import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { useChainId } from "lib/chains";

import beefyIcon from "img/ic_beefy.svg";
import dolomiteIcon from "img/ic_dolo_24.svg";
import lodestarIcon from "img/ic_lodestar.svg";
import pendleIcon from "img/ic_pendle_24.svg";
import radiantIcon from "img/ic_radiant.svg";
import umamiIcon from "img/ic_umami.svg";
import venusIcon from "img/ic_venus.svg";

export type OpportunityTag =
  | "lending-and-borrowing"
  | "looping"
  | "delta-neutral-vaults"
  | "autocompound"
  | "yield-trading";

export type Opportunity = {
  id: string;
  name: string;
  description: ReactNode;
  tags: OpportunityTag[];
  assets: OpportunityAsset[];
  icon: string;
  link?: string;
};

export type OpportunityAsset = "GMX" | "stGMX" | `GLV ${string}` | `GM ${string}` | "USDC";

export const useOpportunityTagLabels = () => {
  return {
    "lending-and-borrowing": t`Lending and Borrowing`,
    looping: t`Looping`,
    "delta-neutral-vaults": t`Delta Neutral Vaults`,
    autocompound: t`Autocompound`,
    "yield-trading": t`Yield Trading`,
  };
};

export const useOpportunities = () => {
  const { chainId } = useChainId();

  const opportunities: Partial<Record<ContractsChainId, Opportunity[]>> = useMemo(
    () => ({
      [ARBITRUM]: [
        {
          id: "arbitrum-dolomite",
          name: "Dolomite",
          icon: dolomiteIcon,
          description: (
            <Trans>
              Lend out your GLV or GM tokens, and borrow against them, or put your LP tokens into strategies to maximize
              your yield.
            </Trans>
          ),
          tags: ["lending-and-borrowing", "looping"],
          assets: [
            "GLV BTC-USDC",
            "GM BTC-BTC",
            "GM WETH-WETH",
            "GLV WETH-USDC",
            "GM AAVE-USDC",
            "GM ARB-USDC",
            "GM BTC-USDC",
            // "GM DOGE-USDC",
            "GM GMX-GMX",
            "GM GMX-USDC",
            "GM LINK-USDC",
            "GM PENDLE-USDC",
            "GM PEPE-USDC",
            "GM SOL-USDC",
            "GM UNI-USDC",
            "GM WIF-USDC",
            "GMX",
            "stGMX",
          ],
          link: "https://dolomite.io/",
        },
        {
          id: "arbitrum-lodestar",
          name: "Lodestar",
          icon: lodestarIcon,
          description: <Trans>Lend out your GMX tokens or borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: ["GMX"],
          link: "https://www.lodestarfinance.io/",
        },
        {
          id: "arbitrum-beefy",
          name: "Beefy",
          icon: beefyIcon,
          description: (
            <Trans>
              Autocompound your earned GMX rewards periodically without having to manually claim and compound your
              rewards.
            </Trans>
          ),
          tags: ["autocompound"],
          assets: ["GMX"],
          link: "https://beefy.com/",
        },
        {
          id: "arbitrum-umami",
          name: "Umami",
          icon: umamiIcon,
          description: (
            <Trans>
              Umami GM vaults enable depositors to provide single-sided liquidity to GMX liquidity pools. Deposits are
              actively managed to optimize for capital efficiency while minimizing exposure to impermanent loss.
            </Trans>
          ),
          tags: ["delta-neutral-vaults"],
          assets: ["USDC"],
          link: "https://umami.finance/",
        },
        {
          id: "arbitrum-venus",
          name: "Venus",
          icon: venusIcon,
          description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: ["GM BTC-USDC", "GM WETH-USDC"],
          link: "https://venus.io/",
        },
        {
          id: "arbitrum-radiant",
          name: "Radiant",
          icon: radiantIcon,
          description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
          tags: ["lending-and-borrowing", "looping"],
          assets: ["GM ARB-USDC"],
          link: "https://radiant.capital/",
        },
        {
          id: "arbitrum-pendle",
          name: "Pendle",
          icon: pendleIcon,
          description: <Trans>Trade spot yield and earn fixed yield.</Trans>,
          tags: ["yield-trading"],
          assets: ["GM WETH-WETH"],
          link: "https://pendle.finance/",
        },
      ],
      [AVALANCHE]: [
        {
          id: "avalanche-beefy",
          name: "Beefy",
          icon: beefyIcon,
          description: (
            <Trans>
              Autocompound your earned GMX rewards instantly without having to manually claim and compound your rewards.
            </Trans>
          ),
          tags: ["autocompound"],
          assets: ["GMX"],
          link: "https://beefy.com/",
        },
      ],
    }),
    []
  );

  return useMemo(() => opportunities[chainId] ?? [], [chainId, opportunities]);
};
