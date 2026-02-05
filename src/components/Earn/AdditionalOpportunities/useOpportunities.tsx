import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { getGlvByLabel, GlvLabel } from "config/markets";
import { GlvAndGmMarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { getMarketByLabel, MarketLabel } from "sdk/configs/markets";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/utils/tokens/types";

import beefyIcon from "img/ic_beefy.svg";
import deltaPrimeIcon from "img/ic_delta_prime.svg";
import gloopIcon from "img/ic_gloop.svg";
import morphoIcon from "img/ic_morpho.svg";
import radiantIcon from "img/ic_radiant.svg";
import umamiIcon from "img/ic_umami.svg";
import venusIcon from "img/ic_venus.svg";
import dolomiteIcon from "img/tokens/ic_dolo.svg";

export type OpportunityTag =
  | "lending-and-borrowing"
  | "looping"
  | "delta-neutral-vaults"
  | "autocompound"
  | "yield-trading";

export type Opportunity = {
  name: string;
  description: ReactNode;
  tags: OpportunityTag[];
  assets: OpportunityAsset[];
  icon: string;
  link: string;
};

export type OpportunityAsset = { type: "market" | "glv" | "token"; address: string } | { type: "stGmx" };

export const ST_GMX_OPPORTUNITY_ASSET: OpportunityAsset = { type: "stGmx" };

const makeMarketAsset = (chainId: ContractsChainId, marketLabel: MarketLabel): OpportunityAsset => {
  const market = getMarketByLabel(chainId, marketLabel);
  if (!market) {
    throw new Error(`Market ${marketLabel} not found`);
  }
  return { type: "market", address: market.marketTokenAddress };
};

const makeGlvAsset = (chainId: ContractsChainId, glvLabel: GlvLabel): OpportunityAsset => {
  const glv = getGlvByLabel(chainId, glvLabel);
  if (!glv?.glvTokenAddress) {
    throw new Error(`${glvLabel} not found`);
  }
  return { type: "glv", address: glv.glvTokenAddress };
};

const makeTokenAsset = (chainId: ContractsChainId, tokenSymbol: string): OpportunityAsset => ({
  type: "token",
  address: getTokenBySymbol(chainId, tokenSymbol).address,
});

export const getOpportunityAssetKey = (asset: OpportunityAsset): string => {
  if (asset.type === "stGmx") {
    return "stGmx";
  }
  return asset.type + ":" + asset.address;
};

export const getOpportunityAssetLabel = (
  asset: OpportunityAsset,
  {
    marketsInfoData,
    tokensData,
  }: {
    marketsInfoData: GlvAndGmMarketsInfoData | undefined;
    tokensData: TokensData | undefined;
  }
): string | undefined => {
  switch (asset.type) {
    case "stGmx":
      return "Staked GMX";
    case "token": {
      const token = tokensData?.[asset.address];
      return token?.symbol;
    }
    case "market": {
      const marketInfo = marketsInfoData?.[asset.address];
      if (marketInfo) {
        return `GM: ${getMarketIndexName(marketInfo)} [${getMarketPoolName(marketInfo)}]`;
      }
      return undefined;
    }
    case "glv": {
      const glvInfo = marketsInfoData?.[asset.address];
      if (glvInfo) {
        const poolName = getMarketPoolName(glvInfo);
        return `GLV [${poolName}]`;
      }
      return undefined;
    }
    default:
      mustNeverExist(asset);
  }
};

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

  const opportunities: Partial<Record<ContractsChainId, Opportunity[]>> = useMemo(() => {
    return {
      [ARBITRUM]: [
        {
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
            makeGlvAsset(ARBITRUM, "GLV [WBTC-USDC]"),
            makeMarketAsset(ARBITRUM, "BTC/USD [WBTC-USDC]"),
            makeMarketAsset(ARBITRUM, "ETH/USD [WETH-WETH]"),
            makeMarketAsset(ARBITRUM, "BTC/USD [WBTC-WBTC]"),
            makeGlvAsset(ARBITRUM, "GLV [WETH-USDC]"),
            makeMarketAsset(ARBITRUM, "ETH/USD [WETH-USDC]"),
            makeMarketAsset(ARBITRUM, "AAVE/USD [AAVE-USDC]"),
            makeMarketAsset(ARBITRUM, "ARB/USD [ARB-USDC]"),
            makeMarketAsset(ARBITRUM, "DOGE/USD [WETH-USDC]"),
            makeMarketAsset(ARBITRUM, "GMX/USD [GMX-GMX]"),
            makeMarketAsset(ARBITRUM, "GMX/USD [GMX-USDC]"),
            makeMarketAsset(ARBITRUM, "LINK/USD [LINK-USDC]"),
            makeMarketAsset(ARBITRUM, "PENDLE/USD [PENDLE-USDC]"),
            makeMarketAsset(ARBITRUM, "PEPE/USD [PEPE-USDC]"),
            makeMarketAsset(ARBITRUM, "SOL/USD [SOL-USDC]"),
            makeMarketAsset(ARBITRUM, "UNI/USD [UNI-USDC]"),
            makeMarketAsset(ARBITRUM, "WIF/USD [WIF-USDC]"),
            makeTokenAsset(ARBITRUM, "GMX"),
            makeTokenAsset(ARBITRUM, "USDC"),
          ],
          link: "https://dolomite.io/",
        },
        {
          name: "Beefy",
          icon: beefyIcon,
          description: (
            <Trans>
              Autocompound your earned GMX rewards periodically without having to manually claim and compound your
              rewards.
            </Trans>
          ),
          tags: ["autocompound"],
          assets: [makeTokenAsset(ARBITRUM, "GMX")],
          link: "https://beefy.com/",
        },
        {
          name: "Morpho",
          icon: morphoIcon,
          description: <Trans>Lend out your GLV or GM tokens, and borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [
            makeMarketAsset(ARBITRUM, "ETH/USD [WETH-USDC]"),
            makeGlvAsset(ARBITRUM, "GLV [WBTC-USDC]"),
            makeGlvAsset(ARBITRUM, "GLV [WETH-USDC]"),
          ],
          link: "https://morpho.org/",
        },
        {
          name: "Umami",
          icon: umamiIcon,
          description: (
            <Trans>
              Umami GM vaults enable depositors to provide single-sided liquidity to GMX liquidity pools. Deposits are
              actively managed through a system of hedges and index rebalancing, optimizing for capital efficiency while
              minimizing exposure to impermanent loss.
            </Trans>
          ),
          tags: ["delta-neutral-vaults"],
          assets: [makeTokenAsset(ARBITRUM, "USDC")],
          link: "https://umami.finance/",
        },
        {
          name: "Venus",
          icon: venusIcon,
          description: <Trans>Lend out your GM tokens, and borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [makeMarketAsset(ARBITRUM, "BTC/USD [WBTC-USDC]"), makeMarketAsset(ARBITRUM, "ETH/USD [WETH-USDC]")],
          link: "https://venus.io/",
        },
        {
          name: "Radiant",
          icon: radiantIcon,
          description: <Trans>Lend out your GLV or GM tokens, and borrow against them.</Trans>,
          tags: ["lending-and-borrowing", "looping"],
          assets: [
            makeGlvAsset(ARBITRUM, "GLV [WBTC-USDC]"),
            makeMarketAsset(ARBITRUM, "BTC/USD [WBTC-USDC]"),
            makeMarketAsset(ARBITRUM, "ETH/USD [WETH-USDC]"),
            makeGlvAsset(ARBITRUM, "GLV [WETH-USDC]"),
          ],
          link: "https://radiant.capital/",
        },
        {
          name: "DeltaPrime",
          icon: deltaPrimeIcon,
          description: <Trans>Lend out your tokens, or borrow against it.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [makeTokenAsset(ARBITRUM, "GMX")],
          link: "https://deltaprime.io/",
        },
        {
          name: "Gloop",
          icon: gloopIcon,
          description: <Trans>Lend out your GM tokens, and borrow against them.</Trans>,
          tags: ["lending-and-borrowing", "looping"],
          assets: [
            makeMarketAsset(ARBITRUM, "BTC/USD [WBTC-USDC]"),
            makeMarketAsset(ARBITRUM, "ETH/USD [WETH-USDC]"),
            makeMarketAsset(ARBITRUM, "SOL/USD [SOL-USDC]"),
          ],
          link: "https://gloop.finance/",
        },
      ],
      [AVALANCHE]: [
        {
          name: "Beefy",
          icon: beefyIcon,
          description: (
            <Trans>
              Autocompound your earned GMX rewards instantly without having to manually claim and compound your rewards.
            </Trans>
          ),
          tags: ["autocompound"],
          assets: [makeTokenAsset(AVALANCHE, "GMX")],
          link: "https://beefy.com/",
        },
        {
          name: "DeltaPrime",
          icon: deltaPrimeIcon,
          description: <Trans>Lend out your tokens, or borrow against it.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [makeTokenAsset(AVALANCHE, "GMX")],
          link: "https://deltaprime.io/",
        },
      ],
    };
  }, []);

  return useMemo(() => opportunities[chainId] ?? [], [chainId, opportunities]);
};
