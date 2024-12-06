import { zeroAddress } from "viem";

import { getContract } from "configs/contracts";
import { convertTokenAddress, getToken } from "configs/tokens";

import SyntheticsReader from "sdk/abis/SyntheticsReader.json";

import { ClaimableFundingData, MarketInfo, MarketsData, MarketSdkConfig, MarketsInfoData } from "types/markets";
import { TokensData } from "types/tokens";

import { TIMEZONE_OFFSET_SEC } from "utils/common";
import graphqlFetcher from "utils/graphqlFetcher";
import { getMarketDivisor, getMarketFullName } from "utils/markets";
import { getByKey } from "utils/objects";

import { Module } from "../base";
import {
  buildClaimableFundingDataRequest,
  buildMarketsConfigsRequest,
  buildMarketsValuesRequest,
} from "./query-builders";
import { MarketConfig, MarketsInfoResult, MarketsResult, MarketValues } from "./types";

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
  }): Promise<MarketsResult> {
    const dataStoreAddress = getContract(this.chainId, "DataStore");
    const syntheticsReaderAddress = getContract(this.chainId, "SyntheticsReader");

    const request = await buildMarketsValuesRequest(this.chainId, {
      marketsAddresses,
      marketsData,
      tokensData,
      dataStoreAddress,
      syntheticsReaderAddress,
    });

    return this.sdk.executeMulticall(request).then((res) => {
      const result = marketsAddresses!.reduce(
        (acc, marketAddress) => {
          const readerErrors = res.errors[`${marketAddress}-reader`];
          const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

          const readerValues = res.data[`${marketAddress}-reader`];
          const dataStoreValues = res.data[`${marketAddress}-dataStore`];

          // Skip invalid market
          if (!readerValues || !dataStoreValues || readerErrors || dataStoreErrors) {
            // eslint-disable-next-line no-console
            console.log("market info error", marketAddress, readerErrors, dataStoreErrors, readerValues);
            return acc;
          }
          const market = getByKey(marketsData, marketAddress)!;
          const marketDivisor = market.isSameCollaterals ? 2n : 1n;

          const longInterestUsingLongToken =
            BigInt(dataStoreValues.longInterestUsingLongToken.returnValues[0]) / marketDivisor;
          const longInterestUsingShortToken =
            BigInt(dataStoreValues.longInterestUsingShortToken.returnValues[0]) / marketDivisor;
          const shortInterestUsingLongToken =
            BigInt(dataStoreValues.shortInterestUsingLongToken.returnValues[0]) / marketDivisor;
          const shortInterestUsingShortToken =
            BigInt(dataStoreValues.shortInterestUsingShortToken.returnValues[0]) / marketDivisor;

          const longInterestUsd = longInterestUsingLongToken + longInterestUsingShortToken;
          const shortInterestUsd = shortInterestUsingLongToken + shortInterestUsingShortToken;

          const longInterestInTokensUsingLongToken =
            BigInt(dataStoreValues.longInterestInTokensUsingLongToken.returnValues[0]) / marketDivisor;
          const longInterestInTokensUsingShortToken =
            BigInt(dataStoreValues.longInterestInTokensUsingShortToken.returnValues[0]) / marketDivisor;
          const shortInterestInTokensUsingLongToken =
            BigInt(dataStoreValues.shortInterestInTokensUsingLongToken.returnValues[0]) / marketDivisor;
          const shortInterestInTokensUsingShortToken =
            BigInt(dataStoreValues.shortInterestInTokensUsingShortToken.returnValues[0]) / marketDivisor;

          const longInterestInTokens = longInterestInTokensUsingLongToken + longInterestInTokensUsingShortToken;
          const shortInterestInTokens = shortInterestInTokensUsingLongToken + shortInterestInTokensUsingShortToken;

          const { nextFunding, virtualInventory } = readerValues.marketInfo.returnValues;

          const [, poolValueInfoMin] = readerValues.marketTokenPriceMin.returnValues as [
            unknown,
            {
              poolValue: bigint;

              longPnl: bigint;
              shortPnl: bigint;
              netPnl: bigint;
            },
          ];

          const [, poolValueInfoMax] = readerValues.marketTokenPriceMax.returnValues as [
            unknown,
            { poolValue: bigint; totalBorrowingFees: bigint; longPnl: bigint; shortPnl: bigint; netPnl: bigint },
          ];

          acc[marketAddress] = {
            longInterestUsd,
            shortInterestUsd,
            longInterestInTokens,
            shortInterestInTokens,
            longPoolAmount: dataStoreValues.longPoolAmount.returnValues[0] / marketDivisor,
            shortPoolAmount: dataStoreValues.shortPoolAmount.returnValues[0] / marketDivisor,
            poolValueMin: poolValueInfoMin.poolValue,
            poolValueMax: poolValueInfoMax.poolValue,
            totalBorrowingFees: poolValueInfoMax.totalBorrowingFees,
            positionImpactPoolAmount: dataStoreValues.positionImpactPoolAmount.returnValues[0],
            swapImpactPoolAmountLong: dataStoreValues.swapImpactPoolAmountLong.returnValues[0],
            swapImpactPoolAmountShort: dataStoreValues.swapImpactPoolAmountShort.returnValues[0],
            pnlLongMax: poolValueInfoMax.longPnl,
            pnlLongMin: poolValueInfoMin.longPnl,
            pnlShortMax: poolValueInfoMax.shortPnl,
            pnlShortMin: poolValueInfoMin.shortPnl,
            netPnlMax: poolValueInfoMax.netPnl,
            netPnlMin: poolValueInfoMin.netPnl,

            borrowingFactorPerSecondForLongs: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForLongs,
            borrowingFactorPerSecondForShorts: readerValues.marketInfo.returnValues.borrowingFactorPerSecondForShorts,

            fundingFactorPerSecond: nextFunding.fundingFactorPerSecond,
            longsPayShorts: nextFunding.longsPayShorts,

            virtualPoolAmountForLongToken: virtualInventory.virtualPoolAmountForLongToken,
            virtualPoolAmountForShortToken: virtualInventory.virtualPoolAmountForShortToken,
            virtualInventoryForPositions: virtualInventory.virtualInventoryForPositions,
          };

          return acc;
        },
        {} as {
          [marketAddress: string]: MarketValues;
        }
      );

      return result;
    });
  }

  private async getMarketsConfigs({
    marketsAddresses,
    marketsData,
  }: {
    marketsAddresses: string[] | undefined;
    marketsData: MarketsData | undefined;
  }) {
    const dataStoreAddress = getContract(this.chainId, "DataStore");

    const request = await buildMarketsConfigsRequest(this.chainId, {
      marketsData,
      marketsAddresses,
      dataStoreAddress,
    });

    return this.sdk.executeMulticall(request).then((res) => {
      const result = marketsAddresses!.reduce(
        (acc, marketAddress) => {
          const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

          const dataStoreValues = res.data[`${marketAddress}-dataStore`];

          // Skip invalid market
          if (!dataStoreValues || dataStoreErrors) {
            // eslint-disable-next-line no-console
            console.log("Market info error", marketAddress, dataStoreErrors, dataStoreValues);
            return acc;
          }

          acc[marketAddress] = {
            isDisabled: dataStoreValues.isDisabled.returnValues[0],
            maxLongPoolUsdForDeposit: dataStoreValues.maxLongPoolUsdForDeposit.returnValues[0],
            maxShortPoolUsdForDeposit: dataStoreValues.maxShortPoolUsdForDeposit.returnValues[0],
            maxLongPoolAmount: dataStoreValues.maxLongPoolAmount.returnValues[0],
            maxShortPoolAmount: dataStoreValues.maxShortPoolAmount.returnValues[0],
            longPoolAmountAdjustment: dataStoreValues.longPoolAmountAdjustment.returnValues[0],
            shortPoolAmountAdjustment: dataStoreValues.shortPoolAmountAdjustment.returnValues[0],
            reserveFactorLong: dataStoreValues.reserveFactorLong.returnValues[0],
            reserveFactorShort: dataStoreValues.reserveFactorShort.returnValues[0],
            openInterestReserveFactorLong: dataStoreValues.openInterestReserveFactorLong.returnValues[0],
            openInterestReserveFactorShort: dataStoreValues.openInterestReserveFactorShort.returnValues[0],
            maxOpenInterestLong: dataStoreValues.maxOpenInterestLong.returnValues[0],
            maxOpenInterestShort: dataStoreValues.maxOpenInterestShort.returnValues[0],
            minPositionImpactPoolAmount: dataStoreValues.minPositionImpactPoolAmount.returnValues[0],
            positionImpactPoolDistributionRate: dataStoreValues.positionImpactPoolDistributionRate.returnValues[0],
            borrowingFactorLong: dataStoreValues.borrowingFactorLong.returnValues[0],
            borrowingFactorShort: dataStoreValues.borrowingFactorShort.returnValues[0],
            borrowingExponentFactorLong: dataStoreValues.borrowingExponentFactorLong.returnValues[0],
            borrowingExponentFactorShort: dataStoreValues.borrowingExponentFactorShort.returnValues[0],
            fundingFactor: dataStoreValues.fundingFactor.returnValues[0],
            fundingExponentFactor: dataStoreValues.fundingExponentFactor.returnValues[0],
            fundingIncreaseFactorPerSecond: dataStoreValues.fundingIncreaseFactorPerSecond.returnValues[0],
            fundingDecreaseFactorPerSecond: dataStoreValues.fundingDecreaseFactorPerSecond.returnValues[0],
            thresholdForDecreaseFunding: dataStoreValues.thresholdForDecreaseFunding.returnValues[0],
            thresholdForStableFunding: dataStoreValues.thresholdForStableFunding.returnValues[0],
            minFundingFactorPerSecond: dataStoreValues.minFundingFactorPerSecond.returnValues[0],
            maxFundingFactorPerSecond: dataStoreValues.maxFundingFactorPerSecond.returnValues[0],

            maxPnlFactorForTradersLong: dataStoreValues.maxPnlFactorForTradersLong.returnValues[0],
            maxPnlFactorForTradersShort: dataStoreValues.maxPnlFactorForTradersShort.returnValues[0],

            minCollateralFactor: dataStoreValues.minCollateralFactor.returnValues[0],
            minCollateralFactorForOpenInterestLong:
              dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0],

            minCollateralFactorForOpenInterestShort:
              dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0],

            positionFeeFactorForPositiveImpact: dataStoreValues.positionFeeFactorForPositiveImpact.returnValues[0],
            positionFeeFactorForNegativeImpact: dataStoreValues.positionFeeFactorForNegativeImpact.returnValues[0],
            positionImpactFactorPositive: dataStoreValues.positionImpactFactorPositive.returnValues[0],
            positionImpactFactorNegative: dataStoreValues.positionImpactFactorNegative.returnValues[0],
            maxPositionImpactFactorPositive: dataStoreValues.maxPositionImpactFactorPositive.returnValues[0],
            maxPositionImpactFactorNegative: dataStoreValues.maxPositionImpactFactorNegative.returnValues[0],
            maxPositionImpactFactorForLiquidations:
              dataStoreValues.maxPositionImpactFactorForLiquidations.returnValues[0],
            positionImpactExponentFactor: dataStoreValues.positionImpactExponentFactor.returnValues[0],
            swapFeeFactorForPositiveImpact: dataStoreValues.swapFeeFactorForPositiveImpact.returnValues[0],
            swapFeeFactorForNegativeImpact: dataStoreValues.swapFeeFactorForNegativeImpact.returnValues[0],
            swapImpactFactorPositive: dataStoreValues.swapImpactFactorPositive.returnValues[0],
            swapImpactFactorNegative: dataStoreValues.swapImpactFactorNegative.returnValues[0],
            swapImpactExponentFactor: dataStoreValues.swapImpactExponentFactor.returnValues[0],

            virtualMarketId: dataStoreValues.virtualMarketId.returnValues[0],
            virtualLongTokenId: dataStoreValues.virtualLongTokenId.returnValues[0],
            virtualShortTokenId: dataStoreValues.virtualShortTokenId.returnValues[0],
          };

          return acc;
        },
        {} as {
          [marketAddress: string]: MarketConfig;
        }
      );

      return result;
    });
  }

  private _marketsData: MarketsResult | undefined;
  async getMarkets(offset = 0n, limit = 100n): Promise<MarketsResult> {
    if (this._marketsData) {
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
          abi: SyntheticsReader.abi,
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
      (acc: MarketsResult, market) => {
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
    return marketsResult;
  }

  async getMarketsInfo(): Promise<MarketsInfoResult> {
    const { marketsData, marketsAddresses } = await this.getMarkets();
    const { tokensData, pricesUpdatedAt } = await this.sdk.tokens.getTokensData();

    const [marketsValues, marketsConfigs, claimableFundingData] = await Promise.all([
      this.getMarketsValues({
        account: this.account,
        marketsAddresses,
        marketsData,
        tokensData,
      }),
      this.getMarketsConfigs({
        marketsAddresses,
        marketsData,
      }),
      this.getClaimableFundingData(),
    ]);

    if (!marketsValues || !marketsConfigs || !marketsAddresses || !claimableFundingData) {
      return {
        marketsInfoData: {},
        tokensData,
        pricesUpdatedAt,
      };
    }

    // Manual merging to avoid cloning tokens as they are sometimes compared by reference
    const marketsInfoData: MarketsInfoData = {};
    for (const marketAddress of marketsAddresses) {
      const market = marketsData?.[marketAddress];
      const marketValues = marketsValues[marketAddress];
      const marketConfig = marketsConfigs[marketAddress];

      const longToken = getByKey(tokensData!, market?.longTokenAddress);
      const shortToken = getByKey(tokensData!, market?.shortTokenAddress);
      const indexToken = market
        ? getByKey(tokensData!, convertTokenAddress(this.chainId, market.indexTokenAddress, "native"))
        : undefined;

      if (!market || !marketValues || !marketConfig || !longToken || !shortToken || !indexToken) {
        continue;
      }

      const fullMarketInfo: MarketInfo = {
        ...marketValues,
        ...marketConfig,
        ...claimableFundingData[marketAddress],
        ...market,
        longToken,
        shortToken,
        indexToken,
      };

      marketsInfoData[marketAddress] = fullMarketInfo;
    }

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

    const LAST_DAY_UNIX_TIMESTAMP = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const timestamp = LAST_DAY_UNIX_TIMESTAMP + TIMEZONE_OFFSET_SEC;
    const variables = {
      timestamp: timestamp,
    };

    return graphqlFetcher<PositionVolumeInfosResponse>(endpoint, POSITIONS_VOLUME_INFOS_QUERY, variables).then(
      (data) => {
        return data?.positionsVolume.length
          ? data?.positionsVolume.reduce((acc, { market, volume }) => {
              return { ...acc, [market]: BigInt(volume) };
            })
          : {};
      }
    );
  }
}

type PositionVolumeInfosResponse = {
  positionsVolume: {
    market: string;
    volume: string;
  }[];
};

const POSITIONS_VOLUME_INFOS_QUERY = `
query PositionVolumeInfoResolver($timestamp: Float!) {
  positionsVolume(where: {timestamp: $timestamp}) {
    market
    volume
  }
}`;
