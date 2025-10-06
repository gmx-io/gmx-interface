import { t, Trans } from "@lingui/macro";
import { ReactNode, useMemo } from "react";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { GlvAndGmMarketsInfoData, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { useChainId } from "lib/chains";
import { mustNeverExist } from "lib/types";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/types/tokens";

import beefyIcon from "img/ic_beefy.svg";
import deltaPrimeIcon from "img/ic_delta_prime.svg";
import dolomiteIcon from "img/ic_dolo_24.svg";
import gloopIcon from "img/ic_gloop.svg";
import morphoIcon from "img/ic_morpho.svg";
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
  name: string;
  description: ReactNode;
  tags: OpportunityTag[];
  assets: OpportunityAsset[];
  icon: string;
  link: string;
};

export type OpportunityAsset = { type: "market" | "glv" | "token"; address: string } | { type: "stGmx" };

export const ST_GMX_OPPORTUNITY_ASSET: OpportunityAsset = { type: "stGmx" };

const makeMarketAsset = (address: string): OpportunityAsset => ({ type: "market", address });
const makeGlvAsset = (address: string): OpportunityAsset => ({ type: "glv", address });
const makeTokenAsset = (address: string): OpportunityAsset => ({ type: "token", address });

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
            // GLV BTC [WBTC-USDC]
            makeGlvAsset("0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9"),
            // GM BTC/USD [WBTC-USDC]
            makeMarketAsset("0x47c031236e19d024b42f8AE6780E44A573170703"),
            // GM ETH/USD [WETH-WETH]
            makeMarketAsset("0x450bb6774Dd8a756274E0ab4107953259d2ac541"),
            // GM BTC/USD [WBTC-WBTC]
            makeMarketAsset("0x7C11F78Ce78768518D743E81Fdfa2F860C6b9A77"),
            // GLV ETH [WETH-USDC]
            makeGlvAsset("0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96"),
            // GM ETH/USD [WETH-USDC]
            makeMarketAsset("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"),
            // GM AAVE/USD [AAVE-USDC]
            makeMarketAsset("0x1CbBa6346F110c8A5ea739ef2d1eb182990e4EB2"),
            // GM ARB/USD [ARB-USDC]
            makeMarketAsset("0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407"),
            // GM DOGE/USD [DOGE-USDC]
            makeMarketAsset("0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4"),
            // GM GMX/USD [GMX-GMX]
            makeMarketAsset("0xbD48149673724f9cAeE647bb4e9D9dDaF896Efeb"),
            // GM GMX/USD [GMX-USDC]
            makeMarketAsset("0x55391D178Ce46e7AC8eaAEa50A72D1A5a8A622Da"),
            // GM LINK/USD [LINK-USDC]
            makeMarketAsset("0x7f1fa204bb700853D36994DA19F830b6Ad18455C"),
            // GM PENDLE/USD [PENDLE-USDC]
            makeMarketAsset("0x784292E87715d93afD7cb8C941BacaFAAA9A5102"),
            // GM PEPE/USD [PEPE-USDC]
            makeMarketAsset("0x2b477989A149B17073D9C9C82eC9cB03591e20c6"),
            // GM SOL/USD [SOL-USDC]
            makeMarketAsset("0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9"),
            // GM UNI/USD [UNI-USDC]
            makeMarketAsset("0xc7Abb2C5f3BF3CEB389dF0Eecd6120D451170B50"),
            // GM WIF/USD [WIF-USDC]
            makeMarketAsset("0x0418643F94Ef14917f1345cE5C460C37dE463ef7"),
            makeTokenAsset(getTokenBySymbol(ARBITRUM, "GMX").address),
            makeTokenAsset(getTokenBySymbol(ARBITRUM, "USDC").address),
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
          assets: [makeTokenAsset(getTokenBySymbol(ARBITRUM, "GMX").address)],
          link: "https://beefy.com/",
        },
        {
          name: "Morpho",
          icon: morphoIcon,
          description: <Trans>Lend out your GM tokens, and borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [
            // GM ETH/USD [WETH-USDC]
            makeMarketAsset("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"),
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
          assets: [makeTokenAsset(getTokenBySymbol(ARBITRUM, "USDC").address)],
          link: "https://umami.finance/",
        },
        {
          name: "Venus",
          icon: venusIcon,
          description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [
            // GM BTC/USD [WBTC-USDC]
            makeMarketAsset("0x47c031236e19d024b42f8AE6780E44A573170703"),
            // GM ETH/USD [WETH-USDC]
            makeMarketAsset("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"),
          ],
          link: "https://venus.io/",
        },
        {
          name: "Radiant",
          icon: radiantIcon,
          description: <Trans>Lend out your GM LP tokens, or borrow against them.</Trans>,
          tags: ["lending-and-borrowing", "looping"],
          assets: [
            // GLV BTC [WBTC-USDC]
            makeGlvAsset("0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9"),
            // GM BTC/USD [WBTC-USDC]
            makeMarketAsset("0x47c031236e19d024b42f8AE6780E44A573170703"),
            // GM ETH/USD [WETH-USDC]
            makeMarketAsset("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"),
            // GLV ETH [WETH-USDC]
            makeGlvAsset("0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96"),
          ],
          link: "https://radiant.capital/",
        },
        {
          name: "DeltaPrime",
          icon: deltaPrimeIcon,
          description: <Trans>Lend out your tokens, or borrow against it.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [makeTokenAsset(getTokenBySymbol(ARBITRUM, "GMX").address)],
          link: "https://deltaprime.io/",
        },
        {
          name: "Gloop",
          icon: gloopIcon,
          description: <Trans>Lend out your tokens, or borrow against them.</Trans>,
          tags: ["lending-and-borrowing", "looping"],
          assets: [
            // GM BTC/USD [WBTC-USDC]
            makeMarketAsset("0x47c031236e19d024b42f8AE6780E44A573170703"),
            // GM ETH/USD [WETH-USDC]
            makeMarketAsset("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"),
            // GM SOL/USD [SOL-USDC]
            makeMarketAsset("0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9"),
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
          assets: [makeTokenAsset(getTokenBySymbol(AVALANCHE, "GMX").address)],
          link: "https://beefy.com/",
        },
        {
          name: "DeltaPrime",
          icon: deltaPrimeIcon,
          description: <Trans>Lend out your tokens, or borrow against it.</Trans>,
          tags: ["lending-and-borrowing"],
          assets: [makeTokenAsset(getTokenBySymbol(AVALANCHE, "GMX").address)],
          link: "https://deltaprime.io/",
        },
      ],
    };
  }, []);

  return useMemo(() => opportunities[chainId] ?? [], [chainId, opportunities]);
};
