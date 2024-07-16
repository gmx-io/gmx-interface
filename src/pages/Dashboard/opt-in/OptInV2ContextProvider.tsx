import { createSelectionContext } from "@taskworld.com/rereselect";
import { entries, mapValues } from "lodash";
import { PropsWithChildren, useMemo } from "react";
import useSWR from "swr";
import { createContext, useContext, useContextSelector } from "use-context-selector";
import { zeroAddress, type Address } from "viem";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, CHAIN_IDS_WITH_GMX, DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "config/chains";
import { getContract } from "config/contracts";
import { getTokenBySymbol, getWhitelistedV1Tokens } from "config/tokens";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getGmxPriceFromArbtitrum, getGmxPriceFromAvalanche } from "domain/legacy";
import { MulticallResult } from "lib/multicall/types";
import { useMulticall } from "lib/multicall/useMulticall";
import { useMulticallMany } from "lib/multicall/useMulticallMany";
import { expandDecimals } from "lib/numbers";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import Token from "abis/Token.json";
import UniPool from "abis/UniPool.json";
import UniswapV2 from "abis/UniswapV2.json";
import Vault from "abis/Vault.json";
import VaultReader from "abis/VaultReader.json";
import RewardReader from "abis/RewardReader.json";

export type OptInV2ContextType = {
  chainId: number;
  aums: bigint[] | undefined;
  tokenBalancesWithSupplies: bigint[] | undefined;
  totalTokenWeights: bigint | undefined;
  gmxSupply: bigint | undefined;
  glpSupply: bigint | undefined;
  usdgSupply: bigint | undefined;
  stakedGmxSupply: bigint | undefined;
  esGmxSupply: bigint | undefined;
  depositBalances: bigint[] | undefined;
  stakingInfo: bigint[] | undefined;
  flags: {
    withAums: boolean;
    withTokenBalancesWithSupplies: boolean;
    withFees: boolean;
    withSecondaryFees: boolean;
    withTotalTokenWeights: boolean;
    withNativeTokenMinPrice: boolean;
    withSecondaryNativeTokenMinPrice: boolean;
    withVaultTokenInfo: boolean;
    withSecondaryVaultTokenInfo: boolean;
    withGmxPrice: boolean;
    withSecondaryGmxPrices: boolean;
    withGmxLiquidiyBalance: boolean;
    withSecondaryGmxLiquidiyBalances: boolean;
    withGmxStakedBalance: boolean;
    withSecondaryGmxStakedBalances: boolean;
    withPrices: boolean;
    withSecondaryPrices: boolean;
    withEsGmxSupply: boolean;
    withGmxSupply: boolean;
    withGlpSupply: boolean;
    withUsdgSupply: boolean;
    withStakedGmxSupply: boolean;
    withDepositBalances: boolean;
    withStakingInfo: boolean;
  };
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
  nativeTokenPriceMap:
    | {
        [chainId: number]: bigint;
      }
    | undefined;
};

const context = createContext<OptInV2ContextType>({
  chainId: DEFAULT_CHAIN_ID,
  aums: undefined,
  depositBalances: undefined,
  esGmxSupply: undefined,
  feesMap: undefined,
  glpSupply: undefined,
  gmxLiquidityMap: undefined,
  gmxPriceMap: undefined,
  gmxStakedMap: undefined,
  gmxSupply: undefined,
  nativeTokenPriceMap: undefined,
  pricesMap: undefined,
  stakedGmxSupply: undefined,
  stakingInfo: undefined,
  tokenBalancesWithSupplies: undefined,
  totalTokenWeights: undefined,
  usdgSupply: undefined,
  vaultTokenInfoMap: undefined,
  flags: {
    withAums: false,
    withDepositBalances: false,
    withEsGmxSupply: false,
    withFees: false,
    withGlpSupply: false,
    withGmxLiquidiyBalance: false,
    withGmxPrice: false,
    withGmxStakedBalance: false,
    withGmxSupply: false,
    withNativeTokenMinPrice: false,
    withPrices: false,
    withSecondaryFees: false,
    withSecondaryGmxLiquidiyBalances: false,
    withSecondaryGmxPrices: false,
    withSecondaryGmxStakedBalances: false,
    withSecondaryNativeTokenMinPrice: false,
    withSecondaryPrices: false,
    withSecondaryVaultTokenInfo: false,
    withStakedGmxSupply: false,
    withStakingInfo: false,
    withTokenBalancesWithSupplies: false,
    withTotalTokenWeights: false,
    withUsdgSupply: false,
    withVaultTokenInfo: false,
  },
});

const Provider = context.Provider;

export function OptInV2ContextProvider(
  props: PropsWithChildren<{
    withAums?: boolean;
    withDepositBalances?: boolean;
    withEsGmxSupply?: boolean;
    withFees?: boolean;
    withGlpSupply?: boolean;
    withGmxLiquidiyBalance?: boolean;
    withGmxPrice?: boolean;
    withGmxStakedBalance?: boolean;
    withGmxSupply?: boolean;
    withNativeTokenMinPrice?: boolean;
    withPrices?: boolean;
    withSecondaryFees?: boolean;
    withSecondaryGmxLiquidiyBalances?: boolean;
    withSecondaryGmxPrices?: boolean;
    withSecondaryGmxStakedBalances?: boolean;
    withSecondaryNativeTokenMinPrice?: boolean;
    withSecondaryPrices?: boolean;
    withSecondaryVaultTokenInfo?: boolean;
    withStakedGmxSupply?: boolean;
    withStakingInfo?: boolean;
    withTokenBalancesWithSupplies?: boolean;
    withTotalTokenWeights?: boolean;
    withUsdgSupply?: boolean;
    withVaultTokenInfo?: boolean;
  }>
) {
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);

  const readerAddress = getContract(chainId, "Reader");
  const vaultAddress = getContract(chainId, "Vault");
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const vaultReaderAddress = getContract(chainId, "VaultReader");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor");
  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const liquidGmxTracker = getContract(chainId, chainId === ARBITRUM ? "UniswapGmxEthPool" : "TraderJoeGmxAvaxPool");

  const gmxAddress = getContract(chainId, "GMX");
  const glpAddress = getContract(chainId, "GLP");
  const usdgAddress = getContract(chainId, "USDG");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");

  const tokensForSupplyQuery: string[] = [];
  if (props.withGmxSupply) {
    tokensForSupplyQuery.push(gmxAddress);
  }
  if (props.withGlpSupply) {
    tokensForSupplyQuery.push(glpAddress);
  }
  if (props.withUsdgSupply) {
    tokensForSupplyQuery.push(usdgAddress);
  }
  if (props.withStakedGmxSupply) {
    tokensForSupplyQuery.push(stakedGmxTrackerAddress);
  }
  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress];

  const whitelistedTokens = getWhitelistedV1Tokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    bnGmxAddress,
    glpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedGmxTrackerAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress,
  ];

  const mainQuery = useMulticall(chainId, "OptInV2ContextProvider:main:multicall", {
    key: [
      account,
      props.withAums,
      props.withTokenBalancesWithSupplies,
      props.withFees,
      props.withTotalTokenWeights,
      props.withNativeTokenMinPrice,
      props.withVaultTokenInfo,
      props.withGmxPrice,
      props.withGmxLiquidiyBalance,
      props.withGmxStakedBalance,
      props.withDepositBalances,
      props.withStakingInfo,
      props.withEsGmxSupply,
      props.withGlpSupply,
      props.withGmxSupply,
      props.withUsdgSupply,
      props.withStakedGmxSupply,
    ],
    request: () => ({
      aums: {
        abi: GlpManager.abi,
        contractAddress: glpManagerAddress,
        calls: {
          aums: props.withAums && {
            methodName: "getAums",
            params: [],
          },
        },
      },
      readerV2: {
        abi: ReaderV2.abi,
        contractAddress: readerAddress,
        calls: {
          tokenBalancesWithSupplies: props.withTokenBalancesWithSupplies && {
            methodName: "getTokenBalancesWithSupplies",
            params: [zeroAddress, tokensForSupplyQuery],
          },
          fees: props.withFees && {
            methodName: "getFees",
            params: [vaultAddress, whitelistedTokenAddresses],
          },
          esGmxSupply: props.withEsGmxSupply && {
            methodName: "getTokenSupply",
            params: [esGmxAddress, excludedEsGmxAccounts],
          },
        },
      },
      vault: {
        abi: Vault.abi,
        contractAddress: vaultAddress,
        calls: {
          totalTokenWeights: props.withTotalTokenWeights && {
            methodName: "totalTokenWeights",
            params: [],
          },
          nativeTokenMinPrice: props.withNativeTokenMinPrice && {
            methodName: "getMinPrice",
            params: [nativeTokenAddress],
          },
        },
      },
      vaultTokenInfo: {
        abi: VaultReader.abi,
        contractAddress: vaultReaderAddress,
        calls: {
          getVaultTokenInfoV4: props.withVaultTokenInfo && {
            methodName: "getVaultTokenInfoV4",
            params: [
              vaultAddress,
              positionRouterAddress,
              nativeTokenAddress,
              expandDecimals(1, 18),
              whitelistedTokenAddresses,
            ],
          },
        },
      },
      gmxDexRaw:
        chainId === ARBITRUM
          ? {
              abi: UniPool.abi,
              contractAddress: liquidGmxTracker,
              calls: {
                uniPoolSlot0: props.withGmxPrice && {
                  methodName: "slot0",
                  params: [],
                },
              },
            }
          : {
              abi: UniswapV2.abi,
              contractAddress: liquidGmxTracker,
              calls: {
                getReserves: props.withGmxPrice && {
                  methodName: "getReserves",
                  params: [],
                },
              },
            },
      gmxBalances: {
        abi: Token.abi,
        contractAddress: gmxAddress,
        calls: {
          liquidity: props.withGmxLiquidiyBalance && {
            methodName: "balanceOf",
            params: [liquidGmxTracker],
          },
          staked: props.withGmxStakedBalance && {
            methodName: "balanceOf",
            params: [stakedGmxTrackerAddress],
          },
        },
      },
      rewardReader: {
        abi: RewardReader.abi,
        contractAddress: rewardReaderAddress,
        calls: {
          depositBalances: account !== undefined &&
            props.withDepositBalances && {
              methodName: "getDepositBalances",
              params: [account, depositTokens, rewardTrackersForDepositBalances],
            },
          stakingInfo: account !== undefined &&
            props.withStakingInfo && {
              methodName: "getStakingInfo",
              params: [account, rewardTrackersForStakingInfo],
            },
        },
      },
    }),
    parseResponse: (result) => {
      const nativePrice = props.withNativeTokenMinPrice
        ? (result.data.vault.nativeTokenMinPrice.returnValues[0] as bigint)
        : undefined;

      return {
        aums: props.withAums ? (result.data.aums.aums.returnValues as bigint[]) : undefined,

        tokenBalancesWithSupplies: props.withTokenBalancesWithSupplies
          ? (result.data.readerV2.tokenBalancesWithSupplies.returnValues as bigint[])
          : undefined,

        fees: props.withFees ? (result.data.readerV2.fees.returnValues as bigint[]) : undefined,

        totalTokenWeights: props.withTotalTokenWeights
          ? (result.data.vault.totalTokenWeights.returnValues[0] as bigint)
          : undefined,

        vaultTokenInfo: props.withVaultTokenInfo
          ? (result.data.vaultTokenInfo.getVaultTokenInfoV4.returnValues as bigint[])
          : undefined,

        nativePrice,

        gmxPrice: props.withGmxPrice ? parseGmxPriceFromRawDexData(chainId, nativePrice!, result) : undefined,

        gmxLiquidity: props.withGmxLiquidiyBalance
          ? (result.data.gmxBalances.liquidity.returnValues[0] as bigint)
          : undefined,

        gmxStaked: props.withGmxStakedBalance ? (result.data.gmxBalances.staked.returnValues[0] as bigint) : undefined,

        esGmxSupply: props.withEsGmxSupply ? (result.data.readerV2.esGmxSupply.returnValues[0] as bigint) : undefined,

        depositBalances: props.withDepositBalances
          ? (result.data.rewardReader.depositBalances.returnValues as bigint[])
          : undefined,

        stakingInfo: props.withStakingInfo
          ? (result.data.rewardReader.stakingInfo.returnValues as bigint[])
          : undefined,
      };
    },
    refreshInterval: null,
  });

  const secondaryRequest = (chainId: number) => ({
    vaultTokenInfo: {
      abi: VaultReader.abi,
      contractAddress: getContract(chainId, "VaultReader"),
      calls: {
        getVaultTokenInfoV4: props.withSecondaryVaultTokenInfo && {
          methodName: "getVaultTokenInfoV4",
          params: [
            getContract(chainId, "Vault"),
            getContract(chainId, "PositionRouter"),
            getContract(chainId, "NATIVE_TOKEN"),
            expandDecimals(1, 18),
            getWhitelistedV1Tokens(chainId).map((token) => token.address),
          ],
        },
      },
    },
    readerV2: {
      abi: ReaderV2.abi,
      contractAddress: getContract(chainId, "Reader"),
      calls: {
        getFees: props.withSecondaryFees && {
          methodName: "getFees",
          params: [getContract(chainId, "Vault"), getWhitelistedV1Tokens(chainId).map((token) => token.address)],
        },
      },
    },
    gmxBalances: {
      abi: Token.abi,
      contractAddress: getContract(chainId, "GMX"),
      calls: {
        dex: props.withSecondaryGmxLiquidiyBalances && {
          methodName: "balanceOf",
          params: [getContract(chainId, chainId === ARBITRUM ? "UniswapGmxEthPool" : "TraderJoeGmxAvaxPool")],
        },
        staked: props.withSecondaryGmxStakedBalances && {
          methodName: "balanceOf",
          params: [getContract(chainId, "StakedGmxTracker")],
        },
      },
    },
    vault: {
      abi: Vault.abi,
      contractAddress: getContract(chainId, "Vault"),
      calls: {
        nativeTokenMinPrice: props.withSecondaryNativeTokenMinPrice && {
          methodName: "getMinPrice",
          params: [getContract(chainId, "NATIVE_TOKEN")],
        },
      },
    },
    gmxDexRaw:
      chainId === ARBITRUM
        ? {
            abi: UniPool.abi,
            contractAddress: getContract(ARBITRUM, "UniswapGmxEthPool"),
            calls: {
              uniPoolSlot0: props.withSecondaryGmxPrices && {
                methodName: "slot0",
                params: [],
              },
            },
          }
        : {
            abi: UniswapV2.abi,
            contractAddress: getContract(AVALANCHE, "TraderJoeGmxAvaxPool"),
            calls: {
              getReserves: props.withSecondaryGmxPrices && {
                methodName: "getReserves",
                params: [],
              },
            },
          },
  });

  const secondaryParseResponse = (
    result: MulticallResult<ReturnType<typeof secondaryRequest>>,
    chainId: number
  ): {
    vaultTokenInfo: bigint[] | undefined;
    fees: bigint[] | undefined;
    gmxLiquidity: bigint | undefined;
    gmxStaked: bigint | undefined;
    gmxPrice: bigint | undefined;
    nativePrice: bigint | undefined;
  } => {
    const nativePrice = props.withSecondaryNativeTokenMinPrice
      ? (result.data.vault.nativeTokenMinPrice.returnValues[0] as bigint)
      : undefined;

    return {
      vaultTokenInfo: props.withSecondaryVaultTokenInfo
        ? (result.data.vaultTokenInfo.getVaultTokenInfoV4.returnValues as bigint[])
        : undefined,
      fees: props.withSecondaryFees ? (result.data.readerV2.getFees.returnValues as bigint[]) : undefined,
      gmxLiquidity: props.withSecondaryGmxLiquidiyBalances
        ? (result.data.gmxBalances.dex.returnValues[0] as bigint)
        : undefined,
      gmxStaked: result.data.gmxBalances.staked.returnValues[0] as bigint,
      nativePrice,
      gmxPrice: props.withSecondaryGmxPrices ? parseGmxPriceFromRawDexData(chainId, nativePrice!, result) : undefined,
    };
  };

  const otherChains = CHAIN_IDS_WITH_GMX.filter((anyChain) => anyChain !== chainId);

  const secondaryQuery = useMulticallMany(otherChains, "OptInV2ContextProvider:secondary:multicall", {
    key: [
      props.withSecondaryFees,
      props.withSecondaryGmxLiquidiyBalances,
      props.withSecondaryGmxPrices,
      props.withSecondaryGmxStakedBalances,
      props.withSecondaryVaultTokenInfo,
    ],
    request: secondaryRequest,
    parseResponse: secondaryParseResponse,
  });

  const pricesMapQuery = useSWR<Record<number, Record<Address, bigint>>>(
    (props.withPrices || props.withSecondaryPrices) && [
      "OptInV2ContextProvider:prices",
      props.withPrices,
      props.withSecondaryPrices,
    ],
    {
      fetcher: async () => {
        let chainsOfInterest: number[] = [];

        if (props.withPrices && !props.withSecondaryPrices) {
          chainsOfInterest = [chainId];
        } else if (props.withSecondaryPrices) {
          chainsOfInterest = SUPPORTED_CHAIN_IDS;
        }

        const promises = chainsOfInterest.map(async (chainId) => {
          const pricesRawResponse = await fetch(getServerUrl(chainId, "/prices"));
          const pricesStringMap = await pricesRawResponse.json();
          const prices = mapValues(pricesStringMap, BigInt) as unknown as Record<Address, bigint>;

          return [chainId, prices] as const;
        });

        const results = await Promise.all(promises);
        return Object.fromEntries(results);
      },
      refreshInterval: 1000,
    }
  );

  const stableObj = useMemo(() => {
    // GMX Price
    const gmxPriceMap: {
      [chainId: number]: bigint;
    } = {};
    if (props.withSecondaryGmxPrices) {
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.gmxPrice!;
        return acc;
      }, gmxPriceMap);
    }
    if (props.withGmxPrice && mainQuery.data) {
      gmxPriceMap[chainId] = mainQuery.data.gmxPrice!;
    }

    // Liquidity
    const gmxLiquidityMap: {
      [chainId: number]: bigint;
    } = {};
    if (props.withSecondaryGmxLiquidiyBalances) {
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.gmxLiquidity!;
        return acc;
      }, gmxLiquidityMap);
    }
    if (props.withGmxLiquidiyBalance && mainQuery.data) {
      gmxLiquidityMap[chainId] = mainQuery.data.gmxLiquidity!;
    }

    // Staked
    const gmxStakedMap: {
      [chainId: number]: bigint;
    } = {};
    if (props.withSecondaryGmxStakedBalances)
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.gmxStaked!;
        return acc;
      }, gmxStakedMap);
    if (props.withGmxStakedBalance && mainQuery.data) {
      gmxStakedMap[chainId] = mainQuery.data.gmxStaked!;
    }

    // Vault Token Info
    const vaultTokenInfoMap: {
      [chainId: number]: bigint[];
    } = {};
    if (props.withSecondaryVaultTokenInfo) {
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.vaultTokenInfo;
        return acc;
      }, vaultTokenInfoMap);
    }
    if (props.withVaultTokenInfo && mainQuery.data) {
      vaultTokenInfoMap[chainId] = mainQuery.data.vaultTokenInfo!;
    }

    // Fees
    const feesMap: {
      [chainId: number]: bigint[];
    } = {};
    if (props.withSecondaryFees) {
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.fees;
        return acc;
      }, feesMap);
    }
    if (props.withFees && mainQuery.data) {
      feesMap[chainId] = mainQuery.data.fees!;
    }

    // Native Token Price
    const nativeTokenPriceMap: {
      [chainId: number]: bigint;
    } = {};
    if (props.withSecondaryNativeTokenMinPrice) {
      entries(secondaryQuery.data).reduce((acc, [chainId, data]) => {
        acc[chainId] = data.nativePrice!;
        return acc;
      }, nativeTokenPriceMap);
    }
    if (props.withNativeTokenMinPrice && mainQuery.data) {
      nativeTokenPriceMap[chainId] = mainQuery.data.nativePrice!;
    }

    return {
      aums: props.withAums ? mainQuery.data?.aums : undefined,
      tokenBalancesWithSupplies: props.withTokenBalancesWithSupplies
        ? mainQuery.data?.tokenBalancesWithSupplies
        : undefined,
      totalTokenWeights: props.withTotalTokenWeights ? mainQuery.data?.totalTokenWeights : undefined,
      esGmxSupply: props.withEsGmxSupply ? mainQuery.data?.esGmxSupply : undefined,
      depositBalances: props.withDepositBalances ? mainQuery.data?.depositBalances : undefined,
      stakingInfo: props.withStakingInfo ? mainQuery.data?.stakingInfo : undefined,
      flags: {
        withAums: props.withAums ?? false,
        withTokenBalancesWithSupplies: props.withTokenBalancesWithSupplies ?? false,
        withFees: props.withFees ?? false,
        withSecondaryFees: props.withSecondaryFees ?? false,
        withTotalTokenWeights: props.withTotalTokenWeights ?? false,
        withNativeTokenMinPrice: props.withNativeTokenMinPrice ?? false,
        withVaultTokenInfo: props.withVaultTokenInfo ?? false,
        withSecondaryVaultTokenInfo: props.withSecondaryVaultTokenInfo ?? false,
        withGmxPrice: props.withGmxPrice ?? false,
        withSecondaryGmxPrices: props.withSecondaryGmxPrices ?? false,
        withGmxLiquidiyBalance: props.withGmxLiquidiyBalance ?? false,
        withSecondaryGmxLiquidiyBalances: props.withSecondaryGmxLiquidiyBalances ?? false,
        withGmxStakedBalance: props.withGmxStakedBalance ?? false,
        withSecondaryGmxStakedBalances: props.withSecondaryGmxStakedBalances ?? false,
        withPrices: props.withPrices ?? false,
        withSecondaryPrices: props.withSecondaryPrices ?? false,
        withEsGmxSupply: props.withEsGmxSupply ?? false,
        withDepositBalances: props.withDepositBalances ?? false,
        withStakingInfo: props.withStakingInfo ?? false,
        withSecondaryNativeTokenMinPrice: props.withSecondaryNativeTokenMinPrice ?? false,
      },
      chainId,
      gmxPriceMap,
      gmxLiquidityMap,
      gmxStakedMap,
      vaultTokenInfoMap,
      feesMap,
      nativeTokenPriceMap,
      pricesMap: pricesMapQuery.data,
    } satisfies OptInV2ContextType;
  }, [
    props.withSecondaryGmxPrices,
    props.withGmxPrice,
    props.withSecondaryGmxLiquidiyBalances,
    props.withGmxLiquidiyBalance,
    props.withSecondaryGmxStakedBalances,
    props.withGmxStakedBalance,
    props.withSecondaryVaultTokenInfo,
    props.withVaultTokenInfo,
    props.withSecondaryFees,
    props.withFees,
    props.withAums,
    props.withTokenBalancesWithSupplies,
    props.withTotalTokenWeights,
    props.withEsGmxSupply,
    props.withDepositBalances,
    props.withStakingInfo,
    props.withNativeTokenMinPrice,
    props.withPrices,
    props.withSecondaryPrices,
    props.withSecondaryNativeTokenMinPrice,
    mainQuery.data,
    secondaryQuery.data,
    chainId,
    pricesMapQuery.data,
  ]);

  return <Provider value={stableObj}>{props.children}</Provider>;
}

export function useOptInV2Context() {
  return useContext(context);
}

export function useOptInV2ContextSelector<Selected>(selector: (s: OptInV2ContextType) => Selected) {
  return useContextSelector(context, selector);
}
const selectorContext = createSelectionContext<OptInV2ContextType>();
export const createOptInV2Selector = selectorContext.makeSelector;

function parseGmxPriceFromRawDexData(chainId: number, nativePrice: bigint, result: any): bigint {
  if (!result.data.gmxDexRaw) {
    // eslint-disable-next-line no-console
    console.error("gmxDexRaw not found in result", result);
    return 0n;
  }

  if (chainId === ARBITRUM) {
    return getGmxPriceFromArbtitrum(getTokenBySymbol(ARBITRUM, "WETH").address, nativePrice, {
      sqrtPriceX96: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[0] as bigint,
      tick: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[1] as bigint,
      observationIndex: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[2] as bigint,
      observationCardinality: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[3] as bigint,
      observationCardinalityNext: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[4] as bigint,
      feeProtocol: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[5] as bigint,
      unlocked: result.data.gmxDexRaw.uniPoolSlot0!.returnValues[6] as boolean,
    });
  }

  return getGmxPriceFromAvalanche(
    result.data.gmxDexRaw.getReserves!.returnValues[0] as bigint,
    result.data.gmxDexRaw.getReserves!.returnValues[1] as bigint,
    nativePrice
  );
}
