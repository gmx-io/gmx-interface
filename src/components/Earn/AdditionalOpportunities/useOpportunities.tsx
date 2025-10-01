import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { useChainId } from "lib/chains";

export type OpportunityTag =
  | "lending-and-borrowing"
  | "looping"
  | "delta-neutral-vaults"
  | "autocompound"
  | "yield-trading";

export type Opportunity = {
  id: string;
  name: ReactNode;
  description: ReactNode;
  tags: OpportunityTag[];
  tokens: string[];
  link?: string;
};

export const useOpportunityTagLabels = () => {
  return {
    "lending-and-borrowing": t`Lending and Borrowing`,
    looping: t`Looping`,
    "delta-neutral-vaults": t`Delta Neutral Vaults`,
    autocompound: t`Autocompound`,
    "yield-trading": t`Yield Trading`,
  }
};

export const useOpportunities = () => {
  const { chainId } = useChainId();

  const opportunities: Partial<Record<ContractsChainId, Opportunity[]>> = useMemo(() => ({
    [ARBITRUM]: [
      {
        id: "arbitrum-dolomite",
        name: <Trans>Dolomite</Trans>,
        description: <Trans>Lend out your GLV or GM tokens, and borrow against them, or put your LP tokens into strategies to maximize your yield.</Trans>,
        tags: ["lending-and-borrowing", "looping"],
        tokens: [
          "GLV BTC",
          "GLV ETH",
          "GM AAVE-USDC",
          "GM ARB-USDC",
          "GM BTC-BTC",
          "GM BTC-USDC",
          "GM DOGE-USDC",
          "GM ETH-ETH",
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
        link: "https://app.dolomite.io/",
      },
      {
        id: "arbitrum-lodestar",
        name: <Trans>Lodestar</Trans>,
        description: <Trans>Lend out your GMX tokens or borrow against them.</Trans>,
        tags: ["lending-and-borrowing"],
        tokens: ["GMX"],
        link: "https://lodestarfinance.com/",
      },
      {
        id: "arbitrum-beefy",
        name: <Trans>Beefy</Trans>,
        description: <Trans>Autocompound your earned GMX rewards periodically without having to manually claim and compound your rewards.</Trans>,
        tags: ["autocompound"],
        tokens: ["GMX"],
        link: "https://app.beefy.com/",
      },
      {
        id: "arbitrum-umami",
        name: <Trans>Umami</Trans>,
        description: <Trans>Umami GM vaults enable depositors to provide single-sided liquidity to GMX liquidity pools. Deposits are actively managed to optimize for capital efficiency while minimizing exposure to impermanent loss.</Trans>,
        tags: ["delta-neutral-vaults"],
        tokens: ["USDC"],
        link: "https://app.umami.finance/",
      },
      {
        id: "arbitrum-venus",
        name: <Trans>Venus</Trans>,
        description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
        tags: ["lending-and-borrowing"],
        tokens: ["GM BTC-USDC", "GM ETH-USDC"],
        link: "https://app.venus.io/",
      },
      {
        id: "arbitrum-radiant",
        name: <Trans>Radiant</Trans>,
        description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
        tags: ["lending-and-borrowing", "looping"],
        tokens: ["GM ARB-USDC"],
        link: "https://app.radiant.capital/",
      },
      {
        id: "arbitrum-pendle",
        name: <Trans>Pendle</Trans>,
        description: <Trans>Trade spot yield and earn fixed yield.</Trans>,
        tags: ["yield-trading"],
        tokens: ["GM ETH-ETH"],
        link: "https://app.pendle.finance/",
      },
    ],
    [AVALANCHE]: [
      {
        id: "avalanche-beefy",
        name: <Trans>Beefy</Trans>,
        description: t`Autocompound your earned GMX rewards instantly without having to manually claim and compound your rewards.`,
        tags: ["autocompound"],
        tokens: ["GMX"],
        link: "https://app.beefy.com/",
      },
    ],
  }), []);

  return useMemo(() => opportunities[chainId] ?? [], [chainId, opportunities]);
};
