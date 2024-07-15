import { createSelectionContext } from "@taskworld.com/rereselect";
import { entries } from "lodash";
import { PropsWithChildren, useMemo } from "react";
import { createContext, useContextSelector } from "use-context-selector";

import { ARBITRUM, AVALANCHE, DEFAULT_CHAIN_ID } from "config/chains";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { EMPTY_OBJECT } from "lib/objects";
import { useStakeV2InfoRequest } from "./useStakeV2InfoRequest";
import { useStakeV2SecondaryChainsInfoRequest } from "./useStakeV2SecondaryChainsInfoRequest";

type StakeV2ContextType = {
  chainId: number;
  walletBalances: bigint[] | undefined;
  depositBalances: bigint[] | undefined;
  stakingInfo: bigint[] | undefined;
  stakedGmxSupply: bigint | undefined;
  aums: bigint[] | undefined | undefined;
  nativeTokenPrice: bigint | undefined;
  esGmxSupply: bigint | undefined;
  // aums: bigint[] | undefined;
  // totalSupplies: bigint[] | undefined;
  // totalTokenWeights: bigint | undefined;
  gmxPriceMap:
    | {
        [chainId: number]: bigint;
      }
    | undefined;

  // gmxLiquidityMap:
  //   | {
  //       [chainId: number]: bigint;
  //     }
  //   | undefined;

  // gmxStakedMap:
  //   | {
  //       [chainId: number]: bigint;
  //     }
  //   | undefined;

  // vaultTokenInfoMap:
  //   | {
  //       [chainId: number]: bigint[];
  //     }
  //   | undefined;
  // feesMap:
  //   | {
  //       [chainId: number]: bigint[];
  //     }
  //   | undefined;
  // pricesMap:
  //   | {
  //       [chainId: number]: Record<Address, bigint>;
  //     }
  //   | undefined;
};

const context = createContext<StakeV2ContextType>({
  chainId: DEFAULT_CHAIN_ID,
  walletBalances: undefined,
  depositBalances: undefined,
  stakingInfo: undefined,
  stakedGmxSupply: undefined,
  aums: undefined,
  nativeTokenPrice: undefined,
  esGmxSupply: undefined,
  gmxPriceMap: undefined,
});

const Provider = context.Provider;

export function StakeV2ContextProvider(props: PropsWithChildren) {
  const chainId = useSelector(selectChainId);
  const mainQuery = useStakeV2InfoRequest();
  const secondaryQuery = useStakeV2SecondaryChainsInfoRequest();

  // const pricesMapQuery = useSWR<Record<number, Record<Address, bigint>>>("StakeV2ContextProvider:prices", {
  //   fetcher: async () => {
  //     const promises = CHAIN_IDS_WITH_GMX.map(async (chainId) => {
  //       const prices = await fetch(getServerUrl(chainId, "/prices"))
  //         .then((res) => res.json())
  //         .then((res) => mapValues(res, BigInt) as unknown as Record<Address, bigint>);
  //       return [chainId, prices] as const;
  //     });
  //     const results = await Promise.all(promises);
  //     return Object.fromEntries(results);
  //   },
  //   refreshInterval: 1000,
  // });

  const stableObj = useMemo(() => {
    if (!mainQuery.data) {
      return EMPTY_OBJECT as StakeV2ContextType;
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

    // // Liquidity
    // const gmxLiquidityMap: {
    //   [chainId: number]: bigint;
    // } = {};

    // entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
    //   acc[chainId] = data.gmxLiquidity!;

    //   return acc;
    // }, gmxLiquidityMap);

    // gmxLiquidityMap[chainId] = mainQuery.data.gmxLiquidity!;

    // // Staked
    // const gmxStakedMap: {
    //   [chainId: number]: bigint;
    // } = {};

    // entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
    //   acc[chainId] = data.gmxStaked!;

    //   return acc;
    // }, gmxStakedMap);

    // gmxStakedMap[chainId] = mainQuery.data.gmxStaked!;

    // // Vault Token Info
    // const vaultTokenInfoMap: {
    //   [chainId: number]: bigint[];
    // } = {};

    // entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
    //   acc[chainId] = data.vaultTokenInfo;

    //   return acc;
    // }, vaultTokenInfoMap);

    // vaultTokenInfoMap[chainId] = mainQuery.data.vaultTokenInfo!;

    // // Fees
    // const feesMap: {
    //   [chainId: number]: bigint[];
    // } = {};

    // entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
    //   acc[chainId] = data.fees;

    //   return acc;
    // }, feesMap);

    // feesMap[chainId] = mainQuery.data.fees!;

    return {
      ...mainQuery.data,
      chainId,
      gmxPriceMap,
      // gmxLiquidityMap,
      // gmxStakedMap,
      // vaultTokenInfoMap,
      // feesMap,
      // pricesMap: pricesMapQuery.data,
    };
  }, [chainId, mainQuery.data, secondaryQuery.data]);

  return <Provider value={stableObj}>{props.children}</Provider>;
}

export function useStakeV2ContextSelector<Selected>(selector: (s: StakeV2ContextType) => Selected) {
  return useContextSelector(context, selector);
}
const selectorContext = createSelectionContext<StakeV2ContextType>();
const createStakeV2Selector = selectorContext.makeSelector;

export const selectGmxPrice = createStakeV2Selector((q) => {
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

// export const selectTotalGmxInLiquidity = createDashboardV2Selector((q) => {
//   const gmxLiquidityFromArbitrum = q((state) => state.gmxLiquidityMap?.[ARBITRUM]);
//   const gmxLiquidityFromAvalanche = q((state) => state.gmxLiquidityMap?.[AVALANCHE]);

//   const total = (gmxLiquidityFromArbitrum ?? 0n) + (gmxLiquidityFromAvalanche ?? 0n);

//   return {
//     total,
//     [ARBITRUM]: gmxLiquidityFromArbitrum,
//     [AVALANCHE]: gmxLiquidityFromAvalanche,
//   };
// });

// export const selectTotalGmxStaked = createDashboardV2Selector((q) => {
//   const gmxStakedFromArbitrum = q((state) => state.gmxStakedMap?.[ARBITRUM]);
//   const gmxStakedFromAvalanche = q((state) => state.gmxStakedMap?.[AVALANCHE]);

//   const total = (gmxStakedFromArbitrum ?? 0n) + (gmxStakedFromAvalanche ?? 0n);

//   return {
//     total,
//     [ARBITRUM]: gmxStakedFromArbitrum,
//     [AVALANCHE]: gmxStakedFromAvalanche,
//   };
// });

// export const selectInfoTokensMap = createDashboardV2Selector((q) => {
//   const pricesMap = q((state) => state.pricesMap);

//   const vaultTokenInfoMap = q((state) => state.vaultTokenInfoMap);

//   const infoTokensMap: Record<number, InfoTokens> = {};

//   for (const chainId of SUPPORTED_CHAIN_IDS) {
//     const tokens = getV1Tokens(chainId);
//     const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
//     const whitelistedTokens = getWhitelistedV1Tokens(chainId);

//     const indexPrices = pricesMap?.[chainId];
//     const vaultTokenInfo = vaultTokenInfoMap?.[chainId];

//     const infoTokens = getInfoTokens({
//       tokens,
//       nativeTokenAddress,
//       whitelistedTokens,
//       indexPrices,
//       vaultTokenInfo,
//     });

//     infoTokensMap[chainId] = infoTokens;
//   }

//   return infoTokensMap;
// });
