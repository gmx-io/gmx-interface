import { createSelectionContext } from "@taskworld.com/rereselect";
import { entries, mapValues } from "lodash";
import { PropsWithChildren, useMemo } from "react";
import useSWR from "swr";
import { createContext, useContext, useContextSelector } from "use-context-selector";
import { type Address } from "viem";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, CHAIN_IDS_WITH_GMX, DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { EMPTY_OBJECT } from "lib/objects";
import { useDashboardV2InfoRequest } from "./useDashboardV2InfoRequest";
import { useDashboardV2SecondaryChainsInfoRequest } from "./useDashboardV2SecondaryChainsInfoRequest";
import { InfoTokens } from "domain/tokens/types";
import { getV1Tokens, getWhitelistedV1Tokens } from "config/tokens";
import { getInfoTokens } from "domain/tokens";
import { getContract } from "config/contracts";

type DashboardV2ContextType = {
  chainId: number;
  aums: bigint[] | undefined;
  totalSupplies: bigint[] | undefined;
  totalTokenWeights: bigint | undefined;
  gmxPriceMap:
    | {
        [chainId: number]: bigint;
      }
    | undefined;

  gmxLiquidityMap:
    | {
        [chainId: number]: bigint;
      }
    | undefined;

  gmxStakedMap:
    | {
        [chainId: number]: bigint;
      }
    | undefined;

  vaultTokenInfoMap:
    | {
        [chainId: number]: bigint[];
      }
    | undefined;
  feesMap:
    | {
        [chainId: number]: bigint[];
      }
    | undefined;
  pricesMap:
    | {
        [chainId: number]: Record<Address, bigint>;
      }
    | undefined;
};

const context = createContext<DashboardV2ContextType>({
  chainId: DEFAULT_CHAIN_ID,
  aums: undefined,
  totalSupplies: undefined,
  feesMap: undefined,
  totalTokenWeights: undefined,
  vaultTokenInfoMap: undefined,
  gmxPriceMap: undefined,
  gmxLiquidityMap: undefined,
  gmxStakedMap: undefined,
  pricesMap: undefined,
});

const Provider = context.Provider;

export function DashboardV2ContextProvider(props: PropsWithChildren) {
  const chainId = useSelector(selectChainId);
  const mainQuery = useDashboardV2InfoRequest();
  const secondaryQuery = useDashboardV2SecondaryChainsInfoRequest();

  const pricesMapQuery = useSWR<Record<number, Record<Address, bigint>>>("DashboardV2ContextProvider:prices", {
    fetcher: async () => {
      const promises = CHAIN_IDS_WITH_GMX.map(async (chainId) => {
        const prices = await fetch(getServerUrl(chainId, "/prices"))
          .then((res) => res.json())
          .then((res) => mapValues(res, BigInt) as unknown as Record<Address, bigint>);
        return [chainId, prices] as const;
      });
      const results = await Promise.all(promises);
      return Object.fromEntries(results);
    },
    refreshInterval: 1000,
  });

  const stableObj = useMemo(() => {
    if (!mainQuery.data) {
      return EMPTY_OBJECT as DashboardV2ContextType;
    }

    // GMX Price
    const gmxPriceMap: {
      [chainId: number]: bigint;
    } = {};

    entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
      acc[chainId] = data.gmxPrice!;

      return acc;
    }, gmxPriceMap);

    gmxPriceMap[chainId] = mainQuery.data.gmxPrice!;

    // Liquidity
    const gmxLiquidityMap: {
      [chainId: number]: bigint;
    } = {};

    entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
      acc[chainId] = data.gmxLiquidity!;

      return acc;
    }, gmxLiquidityMap);

    gmxLiquidityMap[chainId] = mainQuery.data.gmxLiquidity!;

    // Staked
    const gmxStakedMap: {
      [chainId: number]: bigint;
    } = {};

    entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
      acc[chainId] = data.gmxStaked!;

      return acc;
    }, gmxStakedMap);

    gmxStakedMap[chainId] = mainQuery.data.gmxStaked!;

    // Vault Token Info
    const vaultTokenInfoMap: {
      [chainId: number]: bigint[];
    } = {};

    entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
      acc[chainId] = data.vaultTokenInfo;

      return acc;
    }, vaultTokenInfoMap);

    vaultTokenInfoMap[chainId] = mainQuery.data.vaultTokenInfo!;

    // Fees
    const feesMap: {
      [chainId: number]: bigint[];
    } = {};

    entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
      acc[chainId] = data.fees;

      return acc;
    }, feesMap);

    feesMap[chainId] = mainQuery.data.fees!;

    return {
      ...mainQuery.data,
      chainId,
      gmxPriceMap,
      gmxLiquidityMap,
      gmxStakedMap,
      vaultTokenInfoMap,
      feesMap,
      pricesMap: pricesMapQuery.data,
    };
  }, [chainId, mainQuery.data, pricesMapQuery.data, secondaryQuery.data]);

  return <Provider value={stableObj}>{props.children}</Provider>;
}

export function useDashboardV2Context() {
  return useContext(context);
}

export function useDashboardV2ContextSelector<Selected>(selector: (s: DashboardV2ContextType) => Selected) {
  return useContextSelector(context, selector);
}
const selectorContext = createSelectionContext<DashboardV2ContextType>();
const createDashboardV2Selector = selectorContext.makeSelector;

export const selectGmxPrice = createDashboardV2Selector((q) => {
  const chainId = q((state) => state.chainId);
  const gmxPriceFromArbitrum = q((state) => state.gmxPriceMap?.[ARBITRUM]);
  const gmxPriceFromAvalanche = q((state) => state.gmxPriceMap?.[AVALANCHE]);

  const gmxPrice = chainId === ARBITRUM ? gmxPriceFromArbitrum : gmxPriceFromAvalanche;

  return {
    gmxPrice,
    gmxPriceFromArbitrum,
    gmxPriceFromAvalanche,
  };
});

export const selectTotalGmxInLiquidity = createDashboardV2Selector((q) => {
  const gmxLiquidityFromArbitrum = q((state) => state.gmxLiquidityMap?.[ARBITRUM]);
  const gmxLiquidityFromAvalanche = q((state) => state.gmxLiquidityMap?.[AVALANCHE]);

  const total = (gmxLiquidityFromArbitrum ?? 0n) + (gmxLiquidityFromAvalanche ?? 0n);

  return {
    total,
    [ARBITRUM]: gmxLiquidityFromArbitrum,
    [AVALANCHE]: gmxLiquidityFromAvalanche,
  };
});

export const selectTotalGmxStaked = createDashboardV2Selector((q) => {
  const gmxStakedFromArbitrum = q((state) => state.gmxStakedMap?.[ARBITRUM]);
  const gmxStakedFromAvalanche = q((state) => state.gmxStakedMap?.[AVALANCHE]);

  const total = (gmxStakedFromArbitrum ?? 0n) + (gmxStakedFromAvalanche ?? 0n);

  return {
    total,
    [ARBITRUM]: gmxStakedFromArbitrum,
    [AVALANCHE]: gmxStakedFromAvalanche,
  };
});

export const selectInfoTokensMap = createDashboardV2Selector((q) => {
  const pricesMap = q((state) => state.pricesMap);

  const vaultTokenInfoMap = q((state) => state.vaultTokenInfoMap);

  const infoTokensMap: Record<number, InfoTokens> = {};

  for (const chainId of SUPPORTED_CHAIN_IDS) {
    const tokens = getV1Tokens(chainId);
    const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
    const whitelistedTokens = getWhitelistedV1Tokens(chainId);

    const indexPrices = pricesMap?.[chainId];
    const vaultTokenInfo = vaultTokenInfoMap?.[chainId];

    const infoTokens = getInfoTokens({
      tokens,
      nativeTokenAddress,
      whitelistedTokens,
      indexPrices,
      vaultTokenInfo,
    });

    infoTokensMap[chainId] = infoTokens;
  }

  return infoTokensMap;
});
