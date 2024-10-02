import DataStore from "abis/DataStore.json";
import GlvReader from "abis/GlvReader.json";
import TokenAbi from "abis/Token.json";

import { getContract } from "config/contracts";
import {
  glvMaxMarketTokenBalanceAmountKey,
  glvMaxMarketTokenBalanceUsdKey,
  glvShiftLastExecutedAtKey,
  glvShiftMinIntervalKey,
  isGlvDisabledKey,
} from "config/dataStore";
import { USD_DECIMALS } from "config/factors";
import { GLV_MARKETS } from "config/markets";
import { getTokenBySymbol } from "config/tokens";
import { GM_DECIMALS } from "lib/legacy";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { getContractMarketPrices, getGlvMarketName, GlvInfoData, MarketsInfoData } from ".";
import { convertToContractTokenPrices } from "../tokens";
import { TokenData, TokensData } from "../tokens/types";

export type GlvList = {
  glv: {
    glvToken: string;
    longToken: string;
    shortToken: string;
  };
  markets: string[];
}[];

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
        const glvs = result.data.glvs.list.returnValues as GlvList;

        return glvs.filter(({ glv }) => GLV_MARKETS[chainId][glv.glvToken]);
      },
    }
  );

  const shouldRequest = enabled && marketsInfoData && tokensData && glvs && glvs.length > 0;

  const { data: glvData, isLoading: isLoadingGlvsInfo } = useMulticall<{}, GlvInfoData | undefined>(
    chainId,
    "useGlvMarketsInfos",
    {
      key: shouldRequest ? ["glvMarketsInfos", chainId, glvs, account] : shouldRequest,
      request: () => {
        if (!shouldRequest) {
          throw new Error("Not all required data is loaded");
        }

        const request = glvs.reduce((acc, { glv, markets }) => {
          const glvLongToken = tokensData[glv.longToken];
          const glvShortToken = tokensData[glv.shortToken];

          if (!glvLongToken || !glvShortToken) {
            return acc;
          }

          const contractGlvPricesLong = convertToContractTokenPrices(glvLongToken.prices, glvLongToken.decimals);
          const contractGlvPricesShort = convertToContractTokenPrices(glvShortToken.prices, glvShortToken.decimals);

          const glvPricesQuery = [
            dataStoreAddress,
            markets,
            markets.map((market) => {
              const contractPrices = getContractMarketPrices(tokensData, marketsInfoData[market]);

              return [contractPrices?.indexTokenPrice!.min, contractPrices?.indexTokenPrice!.max];
            }),
            [contractGlvPricesLong.min, contractGlvPricesLong.max],
            [contractGlvPricesShort.min, contractGlvPricesShort.max],
            glv.glvToken,
          ];

          acc[glv.glvToken + "-prices"] = {
            contractAddress: glvReaderAddress,
            abi: GlvReader.abi,
            calls: {
              glvTokenPriceMin: {
                methodName: "getGlvTokenPrice",
                params: [...glvPricesQuery, false],
              },
              glvTokenPriceMax: {
                methodName: "getGlvTokenPrice",
                params: [...glvPricesQuery, true],
              },
            },
          };

          acc[glv.glvToken + "-glvValue"] = {
            contractAddress: glvReaderAddress,
            abi: GlvReader.abi,
            calls: {
              glvValueMax: {
                methodName: "getGlvValue",
                params: [...glvPricesQuery, true],
              },
              glvValueMin: {
                methodName: "getGlvValue",
                params: [...glvPricesQuery, true],
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
                isGlvDisabled: {
                  methodName: "getBool",
                  params: [isGlvDisabledKey(glv.glvToken, market)],
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

        const result: GlvInfoData = {};
        glvs.forEach(({ glv, markets }) => {
          const pricesMax = data[glv.glvToken + "-prices"].glvTokenPriceMax.returnValues;
          const pricesMin = data[glv.glvToken + "-prices"].glvTokenPriceMin.returnValues;
          const [valueMax] = data[glv.glvToken + "-glvValue"].glvValueMax.returnValues;
          const [valueMin] = data[glv.glvToken + "-glvValue"].glvValueMin.returnValues;
          const [priceMin, , totalSupply] = pricesMax;
          const [priceMax] = pricesMin;

          const glvName = getGlvMarketName(chainId, glv.glvToken);

          const tokenConfig = getTokenBySymbol(chainId, "GLV");

          const balance = data[glv.glvToken + "-tokenData"].balance?.returnValues[0] ?? 0n;
          const contractSymbol = data[glv.glvToken + "-tokenData"].symbol.returnValues[0];

          const glvToken: TokenData & {
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
            glvToken: glvToken,
            glvTokenAddress: glv.glvToken,
            longToken: tokensData[glv.longToken],
            shortToken: tokensData[glv.shortToken],
            isSpotOnly: false,
            longTokenAddress: glv.longToken,
            shortTokenAddress: glv.shortToken,
            totalSupply,
            poolValueMax: valueMax,
            poolValueMin: valueMin,
            name: glvName,
            isDisabled: markets.every(
              (market) => data[glv.glvToken + "-" + market + "-info"].isGlvDisabled.returnValues[0]
            ),
            markets: markets
              .map((market) => {
                const marketData = data[glv.glvToken + "-" + market + "-info"];
                const marketBalance = data[glv.glvToken + "-" + market + "-gm-balance"].balance.returnValues[0];

                let maxMarketTokenBalanceUsd = marketData.maxMarketTokenBalanceUsd.returnValues[0];
                let glvMaxMarketTokenBalanceAmount = marketData.glvMaxMarketTokenBalanceAmount.returnValues[0];

                if (maxMarketTokenBalanceUsd === 0n) {
                  maxMarketTokenBalanceUsd = expandDecimals(1_000_000_000, USD_DECIMALS);
                }

                if (glvMaxMarketTokenBalanceAmount === 0n) {
                  glvMaxMarketTokenBalanceAmount = expandDecimals(1_000_000_000, GM_DECIMALS);
                }

                return {
                  address: market,
                  isDisabled: marketData.isGlvDisabled.returnValues[0],
                  maxMarketTokenBalanceUsd,
                  glvMaxMarketTokenBalanceAmount,
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
    glvs,
    glvData,
    isLoading: isLoadingGlvs || isLoadingGlvsInfo,
  };
}
