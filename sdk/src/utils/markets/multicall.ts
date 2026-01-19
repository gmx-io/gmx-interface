import { ContractsChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { CLAIMABLE_FUNDING_AMOUNT, MAX_PNL_FACTOR_FOR_TRADERS_KEY } from "configs/dataStore";
import type { MarketConfig, MarketValues, MarketsData } from "types/markets";
import type { TokensData } from "types/tokens";
import { hashDataMap } from "utils/hash";
import { getContractMarketPrices, getOiInTokensFromRawValues, getOiUsdFromRawValues } from "utils/markets";
import type { ContractCallsConfig } from "utils/multicall";
import { getByKey } from "utils/objects";

import { HASHED_MARKET_CONFIG_KEYS, HASHED_MARKET_VALUES_KEYS } from "../../prebuilt";

type MulticallResponse = {
  data: Record<string, any>;
  errors: Record<string, any>;
};

export function buildClaimableFundingDataRequest({
  marketsAddresses,
  marketsData,
  chainId,
  account,
}: {
  marketsAddresses: string[] | undefined;
  marketsData: MarketsData | undefined;
  account: string;
  chainId: ContractsChainId;
}) {
  if (!marketsAddresses) {
    return {};
  }

  return marketsAddresses.reduce(
    (request, marketAddress) => {
      const market = getByKey(marketsData, marketAddress);

      if (!market) {
        return request;
      }

      const keys = hashDataMap({
        claimableFundingAmountLong: [
          ["bytes32", "address", "address", "address"],
          [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.longTokenAddress, account],
        ],
        claimableFundingAmountShort: [
          ["bytes32", "address", "address", "address"],
          [CLAIMABLE_FUNDING_AMOUNT, marketAddress, market.shortTokenAddress, account],
        ],
      });

      request[marketAddress] = {
        contractAddress: getContract(chainId, "DataStore"),
        abiId: "DataStore",
        calls: {
          claimableFundingAmountLong: {
            methodName: "getUint",
            params: [keys.claimableFundingAmountLong],
          },
          claimableFundingAmountShort: {
            methodName: "getUint",
            params: [keys.claimableFundingAmountShort],
          },
        },
      } satisfies ContractCallsConfig<any>;

      return request;
    },
    {} as Record<string, ContractCallsConfig<any>>
  );
}

export async function buildMarketsValuesRequest(
  chainId: ContractsChainId,
  {
    marketsAddresses,
    marketsData,
    tokensData,
  }: {
    marketsAddresses: string[] | undefined;
    marketsData: MarketsData | undefined;
    tokensData: TokensData | undefined;
  }
) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const syntheticsReaderAddress = getContract(chainId, "SyntheticsReader");
  const request: Record<string, ContractCallsConfig<any>> = {};

  for (const marketAddress of marketsAddresses || []) {
    const market = getByKey(marketsData, marketAddress);

    if (!market) {
      continue;
    }

    const marketPrices = getContractMarketPrices(tokensData!, market);

    if (!marketPrices) {
      continue;
    }

    const marketProps = {
      marketToken: market.marketTokenAddress,
      indexToken: market.indexTokenAddress,
      longToken: market.longTokenAddress,
      shortToken: market.shortTokenAddress,
    };

    request[`${marketAddress}-reader`] = {
      contractAddress: syntheticsReaderAddress,
      abiId: "SyntheticsReader",
      calls: {
        marketInfo: {
          methodName: "getMarketInfo",
          params: [dataStoreAddress, marketPrices, marketAddress],
        },
        marketTokenPriceMax: {
          methodName: "getMarketTokenPrice",
          params: [
            dataStoreAddress,
            marketProps,
            marketPrices.indexTokenPrice,
            marketPrices.longTokenPrice,
            marketPrices.shortTokenPrice,
            MAX_PNL_FACTOR_FOR_TRADERS_KEY,
            true,
          ],
        },
        marketTokenPriceMin: {
          methodName: "getMarketTokenPrice",
          params: [
            dataStoreAddress,
            marketProps,
            marketPrices.indexTokenPrice,
            marketPrices.longTokenPrice,
            marketPrices.shortTokenPrice,
            MAX_PNL_FACTOR_FOR_TRADERS_KEY,
            false,
          ],
        },
      },
    } satisfies ContractCallsConfig<any>;

    const prebuiltHashedKeys = HASHED_MARKET_VALUES_KEYS[chainId]?.[marketAddress];

    if (!prebuiltHashedKeys) {
      throw new Error(`No pre-built hashed market keys found for the market ${marketAddress}.`);
    }

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abiId: "DataStore",
      calls: {
        longPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longPoolAmount],
        },
        shortPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortPoolAmount],
        },
        positionImpactPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactPoolAmount],
        },
        swapImpactPoolAmountLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactPoolAmountLong],
        },
        swapImpactPoolAmountShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactPoolAmountShort],
        },
        longInterestUsingLongToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longInterestUsingLongToken],
        },
        longInterestUsingShortToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longInterestUsingShortToken],
        },
        shortInterestUsingLongToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortInterestUsingLongToken],
        },
        shortInterestUsingShortToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortInterestUsingShortToken],
        },
        longInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longInterestInTokensUsingLongToken],
        },
        longInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.longInterestInTokensUsingShortToken],
        },
        shortInterestInTokensUsingLongToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortInterestInTokensUsingLongToken],
        },
        shortInterestInTokensUsingShortToken: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.shortInterestInTokensUsingShortToken],
        },
      },
    } satisfies ContractCallsConfig<any>;
  }

  return request;
}

export function parseMarketsValuesResponse(
  res: MulticallResponse,
  marketsAddresses: string[],
  marketsData: MarketsData | undefined,
  getMarketDivisor: (market: any) => bigint
): Record<string, MarketValues> {
  return marketsAddresses.reduce(
    (acc, marketAddress) => {
      const readerErrors = res.errors[`${marketAddress}-reader`];
      const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];

      const readerValues = res.data[`${marketAddress}-reader`];
      const dataStoreValues = res.data[`${marketAddress}-dataStore`];

      if (!readerValues || !dataStoreValues || readerErrors || dataStoreErrors) {
        return acc;
      }

      const market = getByKey(marketsData, marketAddress);

      if (!market) {
        return acc;
      }

      const marketDivisor = getMarketDivisor(market);

      const { longInterestUsd, shortInterestUsd } = getOiUsdFromRawValues(
        {
          longInterestUsingLongToken: BigInt(dataStoreValues.longInterestUsingLongToken.returnValues[0]),
          longInterestUsingShortToken: BigInt(dataStoreValues.longInterestUsingShortToken.returnValues[0]),
          shortInterestUsingLongToken: BigInt(dataStoreValues.shortInterestUsingLongToken.returnValues[0]),
          shortInterestUsingShortToken: BigInt(dataStoreValues.shortInterestUsingShortToken.returnValues[0]),
        },
        marketDivisor
      );

      const { longInterestInTokens, shortInterestInTokens } = getOiInTokensFromRawValues(
        {
          longInterestInTokensUsingLongToken: BigInt(
            dataStoreValues.longInterestInTokensUsingLongToken.returnValues[0]
          ),
          longInterestInTokensUsingShortToken: BigInt(
            dataStoreValues.longInterestInTokensUsingShortToken.returnValues[0]
          ),
          shortInterestInTokensUsingLongToken: BigInt(
            dataStoreValues.shortInterestInTokensUsingLongToken.returnValues[0]
          ),
          shortInterestInTokensUsingShortToken: BigInt(
            dataStoreValues.shortInterestInTokensUsingShortToken.returnValues[0]
          ),
        },
        marketDivisor
      );

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
    {} as Record<string, MarketValues>
  );
}

export async function buildMarketsConfigsRequest(
  chainId: ContractsChainId,
  {
    marketsAddresses,
  }: {
    marketsAddresses: string[] | undefined;
  }
) {
  const dataStoreAddress = getContract(chainId, "DataStore");
  const request: Record<string, ContractCallsConfig<any>> = {};
  for (const marketAddress of marketsAddresses || []) {
    const prebuiltHashedKeys = HASHED_MARKET_CONFIG_KEYS[chainId]?.[marketAddress];

    if (!prebuiltHashedKeys) {
      throw new Error(`No pre-built hashed config keys found for the market ${marketAddress}.`);
    }

    request[`${marketAddress}-dataStore`] = {
      contractAddress: dataStoreAddress,
      abiId: "DataStore",
      calls: {
        isDisabled: {
          methodName: "getBool",
          params: [prebuiltHashedKeys.isDisabled],
        },
        maxLongPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLongPoolAmount],
        },
        maxShortPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxShortPoolAmount],
        },
        maxLongPoolUsdForDeposit: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLongPoolUsdForDeposit],
        },
        maxShortPoolUsdForDeposit: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxShortPoolUsdForDeposit],
        },
        reserveFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.reserveFactorLong],
        },
        reserveFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.reserveFactorShort],
        },
        openInterestReserveFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.openInterestReserveFactorLong],
        },
        openInterestReserveFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.openInterestReserveFactorShort],
        },
        maxOpenInterestLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxOpenInterestLong],
        },
        maxOpenInterestShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxOpenInterestShort],
        },
        minPositionImpactPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minPositionImpactPoolAmount],
        },
        positionImpactPoolDistributionRate: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactPoolDistributionRate],
        },
        borrowingFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingFactorLong],
        },
        borrowingFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingFactorShort],
        },
        borrowingExponentFactorLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingExponentFactorLong],
        },
        borrowingExponentFactorShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.borrowingExponentFactorShort],
        },
        fundingFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingFactor],
        },
        fundingExponentFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingExponentFactor],
        },
        fundingIncreaseFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingIncreaseFactorPerSecond],
        },
        fundingDecreaseFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.fundingDecreaseFactorPerSecond],
        },
        thresholdForStableFunding: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.thresholdForStableFunding],
        },
        thresholdForDecreaseFunding: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.thresholdForDecreaseFunding],
        },
        minFundingFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minFundingFactorPerSecond],
        },
        maxFundingFactorPerSecond: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxFundingFactorPerSecond],
        },
        maxPnlFactorForTradersLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPnlFactorForTradersLong],
        },
        maxPnlFactorForTradersShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPnlFactorForTradersShort],
        },
        positionFeeFactorForBalanceWasImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionFeeFactorForBalanceWasImproved],
        },
        positionFeeFactorForBalanceWasNotImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionFeeFactorForBalanceWasNotImproved],
        },
        positionImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactFactorPositive],
        },
        positionImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactFactorNegative],
        },
        maxPositionImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorPositive],
        },
        maxPositionImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorNegative],
        },
        maxPositionImpactFactorForLiquidations: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxPositionImpactFactorForLiquidations],
        },
        maxLendableImpactFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLendableImpactFactor],
        },
        maxLendableImpactFactorForWithdrawals: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLendableImpactFactorForWithdrawals],
        },
        maxLendableImpactUsd: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.maxLendableImpactUsd],
        },
        lentPositionImpactPoolAmount: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.lentPositionImpactPoolAmount],
        },
        minCollateralFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactor],
        },
        minCollateralFactorForLiquidation: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactorForLiquidation],
        },
        minCollateralFactorForOpenInterestLong: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactorForOpenInterestLong],
        },
        minCollateralFactorForOpenInterestShort: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.minCollateralFactorForOpenInterestShort],
        },
        positionImpactExponentFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactExponentFactorPositive],
        },
        positionImpactExponentFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.positionImpactExponentFactorNegative],
        },
        swapFeeFactorForBalanceWasImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapFeeFactorForBalanceWasImproved],
        },
        swapFeeFactorForBalanceWasNotImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapFeeFactorForBalanceWasNotImproved],
        },
        atomicSwapFeeFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.atomicSwapFeeFactor],
        },
        swapImpactFactorPositive: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactFactorPositive],
        },
        swapImpactFactorNegative: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactFactorNegative],
        },
        swapImpactExponentFactor: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.swapImpactExponentFactor],
        },
        withdrawalFeeFactorBalanceWasImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.withdrawalFeeFactorBalanceWasImproved],
        },
        withdrawalFeeFactorBalanceWasNotImproved: {
          methodName: "getUint",
          params: [prebuiltHashedKeys.withdrawalFeeFactorBalanceWasNotImproved],
        },
        virtualMarketId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualMarketId],
        },
        virtualShortTokenId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualShortTokenId],
        },
        virtualLongTokenId: {
          methodName: "getBytes32",
          params: [prebuiltHashedKeys.virtualLongTokenId],
        },
      },
    } satisfies ContractCallsConfig<any>;
  }

  return request;
}

export function parseMarketsConfigsResponse(
  res: MulticallResponse,
  marketsAddresses: string[]
): Record<string, MarketConfig> {
  return marketsAddresses.reduce(
    (acc, marketAddress) => {
      const dataStoreErrors = res.errors[`${marketAddress}-dataStore`];
      const dataStoreValues = res.data[`${marketAddress}-dataStore`];

      if (!dataStoreValues || dataStoreErrors) {
        return acc;
      }

      acc[marketAddress] = {
        isDisabled: dataStoreValues.isDisabled.returnValues[0],
        maxLongPoolUsdForDeposit: dataStoreValues.maxLongPoolUsdForDeposit.returnValues[0],
        maxShortPoolUsdForDeposit: dataStoreValues.maxShortPoolUsdForDeposit.returnValues[0],
        maxLongPoolAmount: dataStoreValues.maxLongPoolAmount.returnValues[0],
        maxShortPoolAmount: dataStoreValues.maxShortPoolAmount.returnValues[0],
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
        minCollateralFactorForOpenInterestLong: dataStoreValues.minCollateralFactorForOpenInterestLong.returnValues[0],
        minCollateralFactorForOpenInterestShort:
          dataStoreValues.minCollateralFactorForOpenInterestShort.returnValues[0],
        minCollateralFactorForLiquidation: dataStoreValues.minCollateralFactorForLiquidation.returnValues[0],
        positionFeeFactorForBalanceWasImproved: dataStoreValues.positionFeeFactorForBalanceWasImproved.returnValues[0],
        positionFeeFactorForBalanceWasNotImproved:
          dataStoreValues.positionFeeFactorForBalanceWasNotImproved.returnValues[0],
        positionImpactFactorPositive: dataStoreValues.positionImpactFactorPositive.returnValues[0],
        positionImpactFactorNegative: dataStoreValues.positionImpactFactorNegative.returnValues[0],
        maxPositionImpactFactorPositive: dataStoreValues.maxPositionImpactFactorPositive.returnValues[0],
        maxPositionImpactFactorNegative: dataStoreValues.maxPositionImpactFactorNegative.returnValues[0],
        maxPositionImpactFactorForLiquidations: dataStoreValues.maxPositionImpactFactorForLiquidations.returnValues[0],
        maxLendableImpactFactor: dataStoreValues.maxLendableImpactFactor.returnValues[0],
        maxLendableImpactFactorForWithdrawals: dataStoreValues.maxLendableImpactFactorForWithdrawals.returnValues[0],
        maxLendableImpactUsd: dataStoreValues.maxLendableImpactUsd.returnValues[0],
        lentPositionImpactPoolAmount: dataStoreValues.lentPositionImpactPoolAmount.returnValues[0],
        positionImpactExponentFactorPositive: dataStoreValues.positionImpactExponentFactorPositive.returnValues[0],
        positionImpactExponentFactorNegative: dataStoreValues.positionImpactExponentFactorNegative.returnValues[0],
        swapFeeFactorForBalanceWasImproved: dataStoreValues.swapFeeFactorForBalanceWasImproved.returnValues[0],
        swapFeeFactorForBalanceWasNotImproved: dataStoreValues.swapFeeFactorForBalanceWasNotImproved.returnValues[0],
        swapImpactFactorPositive: dataStoreValues.swapImpactFactorPositive.returnValues[0],
        swapImpactFactorNegative: dataStoreValues.swapImpactFactorNegative.returnValues[0],
        atomicSwapFeeFactor: dataStoreValues.atomicSwapFeeFactor.returnValues[0],
        withdrawalFeeFactorBalanceWasImproved: dataStoreValues.withdrawalFeeFactorBalanceWasImproved.returnValues[0],
        withdrawalFeeFactorBalanceWasNotImproved:
          dataStoreValues.withdrawalFeeFactorBalanceWasNotImproved.returnValues[0],
        swapImpactExponentFactor: dataStoreValues.swapImpactExponentFactor.returnValues[0],
        virtualMarketId: dataStoreValues.virtualMarketId.returnValues[0],
        virtualLongTokenId: dataStoreValues.virtualLongTokenId.returnValues[0],
        virtualShortTokenId: dataStoreValues.virtualShortTokenId.returnValues[0],
      };

      return acc;
    },
    {} as Record<string, MarketConfig>
  );
}
