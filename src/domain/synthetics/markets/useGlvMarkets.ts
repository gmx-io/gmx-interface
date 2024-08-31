import DataStore from "abis/DataStore.json";
import GlvReader from "abis/GlvReader.json";
import TokenAbi from "abis/Token.json";

import { getContract } from "config/contracts";
import {
  glvMaxMarketTokenBalanceAmountKey,
  glvMaxMarketTokenBalanceUsdKey,
  glvShiftLastExecutedAtKey,
  glvShiftMinIntervalKey,
  isGlvMarketDisabledKey,
} from "config/dataStore";
import { getTokenBySymbol } from "config/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { getContractMarketPrices, getGlvMarketName, MarketInfo, MarketsInfoData } from ".";
import { TokenData, TokensData } from "../tokens/types";

export type GlvList = {
  glv: {
    glvToken: string;
    longToken: string;
    shortToken: string;
  };
  markets: string[];
}[];

export type GlvMarketsData = {
  [key in string]: GlvMarketInfo;
};

export interface GlvMarketInfo extends MarketInfo {
  isGlv: true;
  indexToken: TokenData & {
    contractSymbol: string;
  };
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  markets: GlvMarket[];
  shiftLastExecutedAt: bigint;
  shiftMinInterval: bigint;
}

export interface GlvMarket {
  address: string;
  isDisabled: boolean;
  maxMarketTokenBalanceUsd: bigint;
  glvMaxMarketTokenBalanceAmount: bigint;
  gmBalance: bigint;
}

type GlvsRequestConfig = MulticallRequestConfig<{
  glvs: {
    calls: {
      list: {
        methodName: string;
        params: [string, number, number];
      };
    };
  };
}>;

export function useGlvMarketsInfo(
  enabled: boolean,
  deps: {
    marketsInfoData: MarketsInfoData | undefined;
    tokensData: TokensData | undefined;
    chainId: number;
    account: string | undefined;
  }
) {
  const { marketsInfoData, tokensData, chainId, account } = deps;

  const dataStoreAddress = enabled ? getContract(chainId, "DataStore") : "";
  const glvReaderAddress = enabled ? getContract(chainId, "GlvReader") : "";

  const { data: glvs, isLoading: isLoadingGlvs } = useMulticall<GlvsRequestConfig, GlvList>(
    chainId,
    "useGlvTokenMarkets",
    {
      key: enabled ? ["glvMarkets", chainId] : undefined,
      request: () => {
        return {
          glvs: {
            contractAddress: glvReaderAddress,
            abi: GlvReader.abi,
            calls: {
              list: {
                methodName: "getGlvInfoList",
                params: [dataStoreAddress, 0, 100],
              },
            },
          },
        };
      },
      parseResponse(result) {
        return result.data.glvs.list.returnValues as GlvList;
      },
    }
  );

  const shouldRequest = enabled && glvs && marketsInfoData && tokensData;

  const { data: glvMarketInfo, isLoading: isLoadingGlvsInfo } = useMulticall<{}, GlvMarketsData | undefined>(
    chainId,
    "useGlvMarketsInfos",
    {
      key: shouldRequest ? ["glvMarketsInfos", chainId, glvs, account] : shouldRequest,
      request: () => {
        if (!shouldRequest) {
          return {};
        }

        const request = glvs.reduce((acc, { glv, markets }) => {
          const contractGlvPrices = getContractMarketPrices(tokensData, {
            longTokenAddress: glv.longToken,
            shortTokenAddress: glv.shortToken,
          });

          acc[glv.glvToken + "-prices"] = {
            contractAddress: glvReaderAddress,
            abi: GlvReader.abi,
            calls: {
              glvTokenPriceMin: {
                methodName: "getGlvTokenPrice",
                params: [
                  dataStoreAddress,
                  markets,
                  markets.map((market) => {
                    const contractPrices = getContractMarketPrices(tokensData, marketsInfoData[market]);

                    return [contractPrices?.indexTokenPrice!.min, contractPrices?.indexTokenPrice!.min];
                  }),
                  [contractGlvPrices?.longTokenPrice!.max, contractGlvPrices?.longTokenPrice!.min],
                  [contractGlvPrices?.shortTokenPrice!.max, contractGlvPrices?.shortTokenPrice!.min],
                  glv.glvToken,
                  false,
                ],
              },
              glvTokenPriceMax: {
                methodName: "getGlvTokenPrice",
                params: [
                  dataStoreAddress,
                  markets,
                  markets.map((market) => {
                    const contractPrices = getContractMarketPrices(tokensData, marketsInfoData[market]);

                    return [contractPrices?.indexTokenPrice!.min, contractPrices?.indexTokenPrice!.min];
                  }),
                  [contractGlvPrices?.longTokenPrice!.max, contractGlvPrices?.longTokenPrice!.min],
                  [contractGlvPrices?.shortTokenPrice!.max, contractGlvPrices?.shortTokenPrice!.min],
                  glv.glvToken,
                  true,
                ],
              },
            },
          };

          acc[glv.glvToken + "-tokenData"] = {
            contractAddress: glv.glvToken,
            abi: TokenAbi.abi,
            calls: {
              symbol: {
                methodName: "symbol",
                params: [],
              },
            },
          };

          if (account) {
            acc[glv.glvToken + "-tokenData"].calls.balance = {
              methodName: "balanceOf",
              params: [account],
            };
          }

          acc[glv.glvToken + "-info"] = {
            contractAddress: dataStoreAddress,
            abi: DataStore.abi,
            calls: {
              glvShiftLastExecutedAt: {
                methodName: "getUint",
                params: [glvShiftLastExecutedAtKey(glv.glvToken)],
              },
              glvShiftMinInterval: {
                methodName: "getUint",
                params: [glvShiftMinIntervalKey(glv.glvToken)],
              },
            },
          };

          markets.forEach((market) => {
            acc[glv.glvToken + "-" + market + "-info"] = {
              contractAddress: dataStoreAddress,
              abi: DataStore.abi,
              calls: {
                maxMarketTokenBalanceUsd: {
                  methodName: "getUint",
                  params: [glvMaxMarketTokenBalanceUsdKey(glv.glvToken, market)],
                },
                glvMaxMarketTokenBalanceAmount: {
                  methodName: "getUint",
                  params: [glvMaxMarketTokenBalanceAmountKey(glv.glvToken, market)],
                },
                isGlvMarketDisabled: {
                  methodName: "getBool",
                  params: [isGlvMarketDisabledKey(glv.glvToken, market)],
                },
              },
            };
          });

          markets.forEach((market) => {
            acc[glv.glvToken + "-" + market + "-gm-balance"] = {
              contractAddress: market,
              abi: TokenAbi.abi,
              calls: {
                balance: {
                  methodName: "balanceOf",
                  params: [glv.glvToken],
                },
              },
            };
          });

          return acc;
        }, {});

        return request;
      },
      parseResponse({ data }) {
        if (!glvs || !marketsInfoData || !tokensData) {
          return undefined;
        }

        const result: GlvMarketsData = {};
        glvs.forEach(({ glv, markets }) => {
          const pricesMax = data[glv.glvToken + "-prices"].glvTokenPriceMax.returnValues;
          const pricesMin = data[glv.glvToken + "-prices"].glvTokenPriceMax.returnValues;
          const [priceMin, , totalSupply] = pricesMax;
          const [priceMax] = pricesMin;

          const glvName = getGlvMarketName(chainId, glv.glvToken);

          const tokenConfig = getTokenBySymbol(chainId, "GLV");

          const balance = data[glv.glvToken + "-tokenData"].balance?.returnValues[0] ?? 0n;
          const contractSymbol = data[glv.glvToken + "-tokenData"].symbol.returnValues[0];

          const indexToken: TokenData & {
            contractSymbol: string;
          } = {
            ...tokenConfig,
            address: glv.glvToken,
            prices: {
              minPrice: priceMin,
              maxPrice: priceMax,
            },
            totalSupply,
            balance,
            contractSymbol,
          };

          result[glv.glvToken] = {
            ...glv,
            ...data[glv.glvToken + "-info"].returnValues,
            shiftLastExecutedAt: data[glv.glvToken + "-info"].glvShiftLastExecutedAt.returnValues[0],
            shiftMinInterval: data[glv.glvToken + "-info"].glvShiftMinInterval.returnValues[0],
            isGlv: true,
            indexToken: indexToken,
            longToken: tokensData[glv.longToken],
            shortToken: tokensData[glv.shortToken],
            isSpotOnly: false,
            indexTokenAddress: glv.glvToken,
            marketTokenAddress: glv.glvToken,
            longTokenAddress: glv.longToken,
            shortTokenAddress: glv.shortToken,
            totalSupply,
            name: glvName,
            isDisabled: markets.every(
              (market) => data[glv.glvToken + "-" + market + "-info"].isGlvMarketDisabled.returnValues[0]
            ),
            markets: markets
              .map((market) => {
                const marketData = data[glv.glvToken + "-" + market + "-info"];
                const marketBalance = data[glv.glvToken + "-" + market + "-gm-balance"].balance.returnValues[0];
                return {
                  address: market,
                  isDisabled: marketData.isGlvMarketDisabled.returnValues[0],
                  maxMarketTokenBalanceUsd: marketData.maxMarketTokenBalanceUsd.returnValues[0],
                  glvMaxMarketTokenBalanceAmount: marketData.glvMaxMarketTokenBalanceAmount.returnValues[0],
                  gmBalance: marketBalance,
                };
              })
              .sort((a, b) => {
                return a.gmBalance > b.gmBalance ? -1 : 1;
              }),
          };
        });
        return result;
      },
    }
  );

  return {
    glvMarketInfo,
    isLoading: isLoadingGlvs || isLoadingGlvsInfo,
  };
}
