import entries from "lodash/entries";
import { useMemo } from "react";

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
import {
  updateTokenBalance,
  useTokensBalancesUpdates,
} from "context/TokensBalancesContext/TokensBalancesContextProvider";
import { GM_DECIMALS } from "lib/legacy";
import { ContractCallConfig, ContractCallsConfig, MulticallRequestConfig, useMulticall } from "lib/multicall";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { GlvInfoData, MarketsInfoData, getContractMarketPrices, getGlvMarketName } from ".";
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
  const { websocketTokenBalancesUpdates, resetTokensBalancesUpdates } = useTokensBalancesUpdates();
  const { marketsInfoData, tokensData, chainId, account } = deps;

  const dataStoreAddress = enabled ? getContract(chainId, "DataStore") : "";
  const glvReaderAddress = enabled ? getContract(chainId, "GlvReader") : "";

  const { data: glvList, isLoading: isLoadingGlvs } = useMulticall<GlvsRequestConfig, GlvList>(
    chainId,
    "useGlvTokenMarkets",
    {
      key: enabled ? ["glvMarkets", chainId] : undefined,
      request: () => {
        return {
          glvs: {
            contractAddress: glvReaderAddress,
            abiId: "GlvReader",
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

  const glvs = useMemo(() => {
    return glvList?.map(({ glv, markets }) => ({
      glv,
      markets: markets.filter((market) => marketsInfoData?.[market]),
    }));
  }, [glvList, marketsInfoData]);

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
            abiId: "GlvReader",
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
          } satisfies ContractCallsConfig<any>;

          acc[glv.glvToken + "-glvValue"] = {
            contractAddress: glvReaderAddress,
            abiId: "GlvReader",
            calls: {
              glvValueMax: {
                methodName: "getGlvValue",
                params: [...glvPricesQuery, true],
              },
              glvValueMin: {
                methodName: "getGlvValue",
                params: [...glvPricesQuery, false],
              },
            },
          } satisfies ContractCallsConfig<any>;

          acc[glv.glvToken + "-tokenData"] = {
            contractAddress: glv.glvToken,
            abiId: "Token",
            calls: {
              symbol: {
                methodName: "symbol",
                params: [],
              },
            },
          } satisfies ContractCallsConfig<any>;

          if (account) {
            acc[glv.glvToken + "-tokenData"].calls.balance = {
              methodName: "balanceOf",
              params: [account],
            } satisfies ContractCallConfig;
          }

          acc[glv.glvToken + "-info"] = {
            contractAddress: dataStoreAddress,
            abiId: "DataStore",
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
          } satisfies ContractCallsConfig<any>;

          markets.forEach((market) => {
            acc[glv.glvToken + "-" + market + "-info"] = {
              contractAddress: dataStoreAddress,
              abiId: "DataStore",
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
            } satisfies ContractCallsConfig<any>;
          });

          markets.forEach((market) => {
            acc[glv.glvToken + "-" + market + "-gm-balance"] = {
              contractAddress: market,
              abiId: "Token",
              calls: {
                balance: {
                  methodName: "balanceOf",
                  params: [glv.glvToken],
                },
              },
            } satisfies ContractCallsConfig<any>;
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
          const [priceMin, , totalSupply] = pricesMin;
          const [priceMax] = pricesMax;

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

        resetTokensBalancesUpdates(Object.keys(result));

        return result;
      },
    }
  );

  const updatedGlvData = useMemo(() => {
    if (!glvData) {
      return glvData;
    }

    const result = structuredClone(glvData);
    const updateEntries = entries(websocketTokenBalancesUpdates);

    for (const [tokenAddress, balanceUpdate] of updateEntries) {
      if (!result[tokenAddress] || !balanceUpdate) {
        continue;
      }

      const glvToken = result[tokenAddress].glvToken;

      if (glvToken.balance !== undefined) {
        glvToken.balance = updateTokenBalance(balanceUpdate, glvToken.balance);
      }
    }

    return result;
  }, [glvData, websocketTokenBalancesUpdates]);

  return {
    glvs,
    glvData: updatedGlvData,
    isLoading: isLoadingGlvs || isLoadingGlvsInfo,
  };
}
