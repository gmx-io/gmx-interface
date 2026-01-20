import { zeroAddress } from "viem";

import { getContract } from "configs/contracts";
import { USE_OPEN_INTEREST_IN_TOKENS_FOR_BALANCE } from "configs/dataStore";
import { convertTokenAddress, getToken } from "configs/tokens";
import graphqlFetcher from "utils/graphqlFetcher";
import {
  composeFullMarketsInfoData,
  composeRawMarketsInfoData,
  getMarketDivisor,
  getMarketFullName,
} from "utils/markets";
import {
  buildClaimableFundingDataRequest,
  buildMarketsConfigsRequest,
  buildMarketsValuesRequest,
  parseMarketsConfigsResponse,
  parseMarketsValuesResponse,
} from "utils/markets/multicall";
import { ClaimableFundingData, MarketsData, MarketSdkConfig, MarketsInfoData, MarketValues } from "utils/markets/types";
import { getByKey } from "utils/objects";
import { TokensData } from "utils/tokens/types";

import { Module } from "../base";

export class Markets extends Module {
  private async getClaimableFundingData() {
    const chainId = this.chainId;
    const account = this.account;

    if (!account) {
      return {};
    }

    const { marketsAddresses, marketsData } = await this.getMarkets();

    return this.sdk
      .executeMulticall(
        buildClaimableFundingDataRequest({
          chainId,
          account,
          marketsAddresses,
          marketsData,
        })
      )
      .then((result) => {
        return Object.entries(result.data).reduce(
          (claimableFundingData, [marketAddress, callsResult]: [string, any]) => {
            const market = getByKey(marketsData, marketAddress);

            if (!market) {
              return claimableFundingData;
            }

            const marketDivisor = getMarketDivisor(market);

            claimableFundingData[marketAddress] = {
              claimableFundingAmountLong: callsResult.claimableFundingAmountLong.returnValues[0] / marketDivisor,
              claimableFundingAmountShort: callsResult.claimableFundingAmountShort.returnValues[0] / marketDivisor,
            };

            return claimableFundingData;
          },
          {} as ClaimableFundingData
        );
      });
  }

  private async getMarketsValues({
    marketsAddresses,
    marketsData,
    tokensData,
  }: {
    account: string | undefined;
    marketsAddresses: string[] | undefined;
    marketsData: MarketsData | undefined;
    tokensData: TokensData | undefined;
  }): Promise<{
    [marketAddress: string]: MarketValues;
  }> {
    const request = await buildMarketsValuesRequest(this.chainId, {
      marketsAddresses,
      marketsData,
      tokensData,
    });

    return this.sdk.executeMulticall(request).then((res) => {
      return parseMarketsValuesResponse(res, marketsAddresses!, marketsData, (market) =>
        market.isSameCollaterals ? 2n : 1n
      );
    });
  }

  private async getMarketsConfigs({ marketsAddresses }: { marketsAddresses: string[] | undefined }) {
    const request = await buildMarketsConfigsRequest(this.chainId, {
      marketsAddresses,
    });

    return this.sdk.executeMulticall(request).then((res) => {
      return parseMarketsConfigsResponse(res, marketsAddresses!);
    });
  }

  private async getMarketsConstants(): Promise<{ useOpenInterestInTokensForBalance: boolean } | undefined> {
    const dataStoreAddress = getContract(this.chainId, "DataStore");

    return this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: dataStoreAddress,
          abiId: "DataStore",
          calls: {
            useOpenInterestInTokensForBalance: {
              methodName: "getBool",
              params: [USE_OPEN_INTEREST_IN_TOKENS_FOR_BALANCE],
            },
          },
        },
      })
      .then((res) => {
        if (res.errors.dataStore || !res.data.dataStore) {
          // eslint-disable-next-line no-console
          console.warn("Failed to get markets constants", res.errors.dataStore, res.data.dataStore);
          return undefined;
        }

        return {
          useOpenInterestInTokensForBalance: res.data.dataStore.useOpenInterestInTokensForBalance.returnValues[0],
        };
      });
  }

  private _marketsData: MarketsResult | undefined;
  private _marketsDataOffset: bigint | undefined;
  private _marketsDataLimit: bigint | undefined;
  async getMarkets(offset = 0n, limit = 300n): Promise<MarketsResult> {
    if (this._marketsData && this._marketsDataOffset === offset && this._marketsDataLimit === limit) {
      return this._marketsData;
    }

    const readerAddress = getContract(this.chainId, "SyntheticsReader");
    const dataStoreAddress = getContract(this.chainId, "DataStore");

    const apiMarkets = await this.sdk.oracle.getMarkets();
    const configMarkets = this.sdk.config.markets ?? {};

    const marketsMap = apiMarkets.reduce(
      (acc, market) => {
        if (configMarkets[market.marketToken]?.isListed === false) {
          return acc;
        }

        return {
          ...acc,
          [market.marketToken]: market,
        };
      },
      {} as { [marketToken: string]: MarketSdkConfig }
    );

    const markets = await this.sdk
      .executeMulticall({
        markets: {
          contractAddress: readerAddress,
          abiId: "SyntheticsReader",
          calls: {
            markets: {
              methodName: "getMarkets",
              params: [dataStoreAddress, offset, offset + limit],
            },
          },
        },
      })
      .then((res) => {
        return res.data.markets.markets.returnValues.map(
          (market: { marketToken: string; indexToken: string; longToken: string; shortToken: string }) => {
            return {
              marketTokenAddress: market.marketToken,
              indexTokenAddress: market.indexToken,
              longTokenAddress: market.longToken,
              shortTokenAddress: market.shortToken,
            };
          }
        );
      });

    const chainId = this.chainId;

    const marketsResult = markets.reduce(
      (
        acc: MarketsResult,
        market: {
          marketTokenAddress: string;
          indexTokenAddress: string;
          longTokenAddress: string;
          shortTokenAddress: string;
        }
      ) => {
        try {
          if (!marketsMap[market.marketTokenAddress]?.isListed) {
            return acc;
          }

          const indexToken = getToken(chainId, convertTokenAddress(chainId, market.indexTokenAddress, "native"));
          const longToken = getToken(chainId, market.longTokenAddress);
          const shortToken = getToken(chainId, market.shortTokenAddress);

          const isSameCollaterals = market.longTokenAddress === market.shortTokenAddress;
          const isSpotOnly = market.indexTokenAddress === zeroAddress;

          const name = getMarketFullName({ indexToken, longToken, shortToken, isSpotOnly });

          acc.marketsAddresses!.push(market.marketTokenAddress);
          acc.marketsData![market.marketTokenAddress] = {
            ...market,
            isSameCollaterals,
            isSpotOnly,
            name,
            data: "",
          };
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(`Unsupported market ${market.marketTokenAddress}`, e);
        }

        return acc;
      },
      { marketsData: {}, marketsAddresses: [] }
    );

    this._marketsData = marketsResult;
    this._marketsDataOffset = offset;
    this._marketsDataLimit = limit;
    return marketsResult;
  }

  async getMarketsInfo(): Promise<MarketsInfoResult> {
    const { marketsData, marketsAddresses } = await this.getMarkets();

    const { tokensData, pricesUpdatedAt } = await this.sdk.tokens.getTokensData();

    const [marketsValues, marketsConfigs, claimableFundingData, marketsConstants] = await Promise.all([
      this.getMarketsValues({
        account: this.account,
        marketsAddresses,
        marketsData,
        tokensData,
      }),
      this.getMarketsConfigs({
        marketsAddresses,
      }),
      this.getClaimableFundingData(),
      this.getMarketsConstants(),
    ]);

    if (!marketsValues || !marketsConfigs || !marketsAddresses || !marketsData || !tokensData || !marketsConstants) {
      return {
        marketsInfoData: {},
        tokensData,
        pricesUpdatedAt,
      };
    }

    const rawMarketsInfoData = composeRawMarketsInfoData({
      marketsAddresses,
      marketsData,
      marketsValuesData: marketsValues,
      marketsConfigsData: marketsConfigs,
      marketsConstants,
    });

    const marketsInfoData = composeFullMarketsInfoData({
      chainId: this.chainId,
      marketsAddresses,
      rawMarketsInfoData,
      tokensData,
      claimableFundingData,
    });

    return {
      marketsInfoData,
      tokensData,
      pricesUpdatedAt,
    };
  }

  async getDailyVolumes(): Promise<Record<string, bigint> | undefined> {
    const { marketsAddresses } = await this.getMarkets();

    const endpoint = this.sdk.config.subsquidUrl;

    if (!marketsAddresses || !endpoint) {
      return;
    }

    return graphqlFetcher<PositionVolumeInfosResponse>(endpoint, POSITIONS_VOLUME_INFOS_QUERY).then((data) => {
      return data?.positionsVolume.length
        ? data?.positionsVolume.reduce((acc, { market, volume }) => {
            return { ...acc, [market]: BigInt(volume) };
          }, {})
        : {};
    });
  }
}

type PositionVolumeInfosResponse = {
  positionsVolume: {
    market: string;
    volume: string;
  }[];
};

const POSITIONS_VOLUME_INFOS_QUERY = `
{
  positionsVolume(where: {period: "1d"}) {
    market
    volume
  }
}`;

export type MarketsResult = {
  marketsData?: MarketsData;
  marketsAddresses?: string[];
  error?: Error | undefined;
};

export type MarketsInfoResult = {
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  pricesUpdatedAt?: number;
};
