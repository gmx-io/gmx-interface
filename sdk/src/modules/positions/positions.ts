import { zeroAddress, zeroHash } from "viem";

import { getContract } from "configs/contracts";
import {
  hashedPositionKey,
  MAX_AUTO_CANCEL_ORDERS_KEY,
  MIN_COLLATERAL_USD_KEY,
  MIN_POSITION_SIZE_USD_KEY,
  uiFeeFactorKey,
} from "configs/dataStore";
import { ContractMarketPrices, MarketsData, MarketsInfoData } from "types/markets";
import { OrderInfo } from "types/orders";
import { Position, PositionsData, PositionsInfoData } from "types/positions";
import { UserReferralInfo } from "types/referrals";
import { TokensData } from "types/tokens";
import { getPositionFee, getPriceImpactForPosition } from "utils/fees";
import {
  getContractMarketPrices,
  getMarketIndexName,
  getMarketPoolName,
  getMaxAllowedLeverageByMinCollateralFactor,
} from "utils/markets";
import type { MulticallRequestConfig } from "utils/multicall";
import { basisPointsToFloat, getBasisPoints } from "utils/numbers";
import { getByKey } from "utils/objects";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionKey,
  getPositionNetValue,
  getPositionPnlUsd,
} from "utils/positions";
import { getPositionPendingFeesUsd } from "utils/positions";
import { getMarkPrice } from "utils/prices";
import { decodeReferralCode } from "utils/referrals";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";

import { Module } from "../base";

type PositionsResult = {
  positionsData?: PositionsData;
  allPossiblePositionsKeys?: string[];
  error?: Error;
};

type PositionsConstantsResult = {
  minCollateralUsd?: bigint;
  minPositionSizeUsd?: bigint;
  maxAutoCancelOrders?: bigint;
};

export class Positions extends Module {
  static MAX_PENDING_UPDATE_AGE = 600 * 1000; // 10 minutes

  private getKeysAndPricesParams(p: { marketsData: MarketsData | undefined; tokensData: TokensData | undefined }) {
    const { marketsData, tokensData } = p;
    const account = this.account;

    const values = {
      allPositionsKeys: [] as string[],
      marketsPrices: [] as ContractMarketPrices[],
      marketsKeys: [] as string[],
    };

    if (!account || !marketsData || !tokensData) {
      return values;
    }

    const markets = Object.values(marketsData);

    for (const market of markets) {
      const marketPrices = getContractMarketPrices(tokensData, market);

      if (!marketPrices || market.isSpotOnly) {
        continue;
      }

      values.marketsKeys.push(market.marketTokenAddress);
      values.marketsPrices.push(marketPrices);

      const collaterals = market.isSameCollaterals
        ? [market.longTokenAddress]
        : [market.longTokenAddress, market.shortTokenAddress];

      for (const collateralAddress of collaterals) {
        for (const isLong of [true, false]) {
          const positionKey = getPositionKey(account, market.marketTokenAddress, collateralAddress, isLong);
          values.allPositionsKeys.push(positionKey);
        }
      }
    }

    return values;
  }

  private getPositionsData(p: {
    positionsData: PositionsData | undefined;
    allPositionsKeys: string[] | undefined;
  }): PositionsData | undefined {
    const { positionsData, allPositionsKeys } = p;

    if (!allPositionsKeys) {
      return undefined;
    }

    return allPositionsKeys.reduce((acc, key) => {
      let position: Position;

      if (getByKey(positionsData, key)) {
        position = { ...getByKey(positionsData, key)! };
      } else {
        return acc;
      }

      if (position.sizeInUsd > 0) {
        acc[key] = position;
      }

      return acc;
    }, {} as PositionsData);
  }

  async getPositions(p: {
    marketsData: MarketsData;
    tokensData: TokensData;
    start?: number;
    end?: number;
  }): Promise<PositionsResult> {
    const chainId = this.chainId;
    const account = this.sdk.config.account;

    const keysAndPrices = this.getKeysAndPricesParams(p);

    const request = {
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abiId: "SyntheticsReader",
        calls: {
          positions: {
            methodName: "getAccountPositionInfoList",
            params: [
              getContract(chainId, "DataStore"),
              getContract(chainId, "ReferralStorage"),
              account,
              keysAndPrices.marketsKeys,
              keysAndPrices.marketsPrices,
              zeroAddress,
              p.start ?? 0,
              p.end ?? 1000,
            ],
          },
        },
      },
    } satisfies MulticallRequestConfig<any>;

    const positions = await this.sdk.executeMulticall(request).then((res) => {
      const positions = res.data.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo) => {
        const { position, fees, basePnlUsd } = positionInfo;
        const { addresses, numbers, flags, data } = position;
        const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

        // Empty position
        if (numbers.increasedAtTime == 0n) {
          return positionsMap;
        }

        const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
        const contractPositionKey = hashedPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);

        positionsMap[positionKey] = {
          key: positionKey,
          contractKey: contractPositionKey,
          account,
          marketAddress,
          collateralTokenAddress,
          sizeInUsd: numbers.sizeInUsd,
          sizeInTokens: numbers.sizeInTokens,
          collateralAmount: numbers.collateralAmount,
          increasedAtTime: numbers.increasedAtTime,
          decreasedAtTime: numbers.decreasedAtTime,
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: fees.borrowing.borrowingFeeUsd,
          fundingFeeAmount: fees.funding.fundingFeeAmount,
          claimableLongTokenAmount: fees.funding.claimableLongTokenAmount,
          claimableShortTokenAmount: fees.funding.claimableShortTokenAmount,
          pnl: basePnlUsd,
          positionFeeAmount: fees.positionFeeAmount,
          traderDiscountAmount: fees.referral.traderDiscountAmount,
          uiFeeAmount: fees.ui.uiFeeAmount,
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    });

    const positionsData = this.getPositionsData({
      positionsData: positions,
      allPositionsKeys: keysAndPrices?.allPositionsKeys,
    });

    return {
      positionsData,
    };
  }

  private getUiFeeFactorRequest(): Promise<bigint> {
    if (!this.account) {
      return Promise.resolve(0n);
    }

    return this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: getContract(this.chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            keys: {
              methodName: "getUint",
              params: [uiFeeFactorKey(this.account)],
            },
          },
        },
      })
      .then((res) => {
        return BigInt(res.data.dataStore.keys.returnValues[0] ?? 0n);
      });
  }

  private _positionsConstants: PositionsConstantsResult | undefined = undefined;
  async getPositionsConstants(): Promise<PositionsConstantsResult> {
    if (this._positionsConstants) {
      return this._positionsConstants;
    }

    const constants = await this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: getContract(this.chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            minCollateralUsd: {
              methodName: "getUint",
              params: [MIN_COLLATERAL_USD_KEY],
            },
            minPositionSizeUsd: {
              methodName: "getUint",
              params: [MIN_POSITION_SIZE_USD_KEY],
            },
            maxAutoCancelOrders: {
              methodName: "getUint",
              params: [MAX_AUTO_CANCEL_ORDERS_KEY],
            },
          },
        },
      })
      .then((res) => {
        return {
          minCollateralUsd: res.data.dataStore.minCollateralUsd.returnValues[0],
          minPositionSizeUsd: res.data.dataStore.minPositionSizeUsd.returnValues[0],
          maxAutoCancelOrders: res.data.dataStore.maxAutoCancelOrders.returnValues[0],
        };
      });

    this._positionsConstants = constants;
    return constants;
  }

  async getMaxAutoCancelOrders({
    draftOrdersCount = 0,
    positionOrders = [],
  }: {
    positionOrders?: OrderInfo[];
    draftOrdersCount?: number;
  }) {
    const constants = await this.getPositionsConstants();
    const maxAutoCancelOrders = constants.maxAutoCancelOrders;
    const existingAutoCancelOrders = positionOrders.filter((order) => order.autoCancel);

    let warning = false;
    let autoCancelOrdersLimit = 0;

    if (maxAutoCancelOrders === undefined) {
      return {
        warning,
        autoCancelOrdersLimit,
      };
    }

    const allowedAutoCancelOrders = Number(maxAutoCancelOrders) - 1;
    autoCancelOrdersLimit = allowedAutoCancelOrders - existingAutoCancelOrders.length;
    const canAddAutoCancelOrder = autoCancelOrdersLimit - draftOrdersCount > 0;

    if (!canAddAutoCancelOrder) {
      warning = true;
    }

    return {
      warning,
      autoCancelOrdersLimit,
    };
  }

  private async getCodeOwner(code: string | undefined): Promise<string | undefined> {
    if (!code) {
      return undefined;
    }

    const referralStorageAddress = getContract(this.chainId, "ReferralStorage");

    return this.sdk
      .executeMulticall({
        referralStorage: {
          contractAddress: referralStorageAddress,
          abiId: "ReferralStorage",
          calls: {
            codeOwner: {
              methodName: "codeOwners",
              params: [code],
            },
          },
        },
      })
      .then((res) => {
        return res.data.referralStorage.codeOwner.returnValues[0];
      });
  }

  private async getUserRefferalCode() {
    const referralStorageAddress = getContract(this.chainId, "ReferralStorage");

    const onChainCode = await this.sdk.executeMulticall({
      referralStorage: {
        contractAddress: referralStorageAddress,
        abiId: "ReferralStorage",
        calls: {
          traderReferralCodes: {
            methodName: "traderReferralCodes",
            params: [this.account],
          },
        },
      },
    });

    let attachedOnChain = false;
    let userReferralCode: string | undefined = undefined;
    let userReferralCodeString: string | undefined = undefined;
    let referralCodeForTxn = zeroHash;

    if (onChainCode && onChainCode === zeroHash) {
      attachedOnChain = true;
      userReferralCode = onChainCode;
      userReferralCodeString = decodeReferralCode(onChainCode);
    }

    return {
      attachedOnChain,
      userReferralCode,
      userReferralCodeString,
      referralCodeForTxn,
    };
  }

  private getAffiliateTier(): Promise<number | undefined> {
    const referralStorageAddress = getContract(this.chainId, "ReferralStorage");
    return this.sdk
      .executeMulticall({
        referralStorage: {
          contractAddress: referralStorageAddress,
          abiId: "ReferralStorage",
          calls: {
            referrerTiers: {
              methodName: "referrerTiers",
              params: [this.account],
            },
          },
        },
      })
      .then((res) => {
        return res.data.referralStorage.referrerTiers.returnValues[0];
      });
  }

  private getTiers(tierLevel?: number) {
    if (tierLevel === undefined) {
      return {
        totalRebate: 0n,
        discountShare: 0n,
      };
    }

    const referralStorageAddress = getContract(this.chainId, "ReferralStorage");

    return this.sdk
      .executeMulticall({
        referralStorage: {
          contractAddress: referralStorageAddress,
          abiId: "ReferralStorage",
          calls: {
            tiers: {
              methodName: "tiers",
              params: [tierLevel],
            },
          },
        },
      })
      .then((res) => {
        const [totalRebate, discountShare] = res.data.referralStorage.tiers.returnValues ?? [];

        return {
          totalRebate,
          discountShare,
        };
      });
  }

  private async getReferrerDiscountShare(owner?: string): Promise<bigint | undefined> {
    if (!owner) {
      return undefined;
    }

    return this.sdk
      .executeMulticall({
        referralStorage: {
          contractAddress: getContract(this.chainId, "ReferralStorage"),
          abiId: "ReferralStorage",
          calls: {
            referrerDiscountShares: {
              methodName: "referrerDiscountShares",
              params: [owner],
            },
          },
        },
      })
      .then((res) => {
        return res.data.referralStorage.referrerDiscountShares.returnValues[0];
      });
  }

  private async getUserReferralInfo(): Promise<UserReferralInfo | undefined> {
    const { userReferralCode, userReferralCodeString, attachedOnChain, referralCodeForTxn } =
      await this.getUserRefferalCode();

    const codeOwner = await this.getCodeOwner(userReferralCodeString);
    const tierId = await this.getAffiliateTier();
    const { totalRebate, discountShare } = await this.getTiers(tierId);
    const customDiscountShare = await this.getReferrerDiscountShare(codeOwner);

    const finalDiscountShare = (customDiscountShare ?? 0n) > 0 ? customDiscountShare : discountShare;

    if (
      !userReferralCode ||
      !userReferralCodeString ||
      !codeOwner ||
      tierId === undefined ||
      totalRebate === undefined ||
      finalDiscountShare === undefined ||
      !referralCodeForTxn
    ) {
      return undefined;
    }

    return {
      userReferralCode,
      userReferralCodeString,
      referralCodeForTxn,
      attachedOnChain,
      affiliate: codeOwner,
      tierId,
      totalRebate,
      totalRebateFactor: basisPointsToFloat(totalRebate),
      discountShare: finalDiscountShare,
      discountFactor: basisPointsToFloat(finalDiscountShare),
    };
  }

  async getPositionsInfo(p: {
    marketsInfoData: MarketsInfoData;
    tokensData: TokensData;
    showPnlInLeverage: boolean;
  }): Promise<PositionsInfoData> {
    const { showPnlInLeverage, marketsInfoData, tokensData } = p;
    const { positionsData } = await this.getPositions({
      marketsData: marketsInfoData,
      tokensData,
    });
    const { minCollateralUsd } = await this.getPositionsConstants();
    const uiFeeFactor = await this.getUiFeeFactorRequest();
    const userReferralInfo = await this.getUserReferralInfo();

    if (!positionsData || minCollateralUsd === undefined) {
      return {};
    }

    const positionsInfoData = Object.keys(positionsData).reduce((acc: PositionsInfoData, positionKey: string) => {
      const position = getByKey(positionsData, positionKey)!;

      const marketInfo = getByKey(marketsInfoData, position.marketAddress);
      const indexToken = marketInfo?.indexToken;
      const longToken = getByKey(tokensData, marketInfo?.longTokenAddress);
      const shortToken = getByKey(tokensData, marketInfo?.shortTokenAddress);

      const pnlToken = position.isLong ? marketInfo?.longToken : marketInfo?.shortToken;
      const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

      if (!marketInfo || !indexToken || !pnlToken || !collateralToken || !longToken || !shortToken) {
        return acc;
      }

      const markPrice = getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false });
      const collateralMinPrice = collateralToken.prices.minPrice;

      const entryPrice = getEntryPrice({
        sizeInTokens: position.sizeInTokens,
        sizeInUsd: position.sizeInUsd,
        indexToken,
      });

      const pendingFundingFeesUsd = convertToUsd(
        position.fundingFeeAmount,
        collateralToken.decimals,
        collateralToken.prices.minPrice
      )!;

      const pendingClaimableFundingFeesLongUsd = convertToUsd(
        position.claimableLongTokenAmount,
        marketInfo.longToken.decimals,
        marketInfo.longToken.prices.minPrice
      )!;
      const pendingClaimableFundingFeesShortUsd = convertToUsd(
        position.claimableShortTokenAmount,
        marketInfo.shortToken.decimals,
        marketInfo.shortToken.prices.minPrice
      )!;

      const pendingClaimableFundingFeesUsd = pendingClaimableFundingFeesLongUsd + pendingClaimableFundingFeesShortUsd;

      const totalPendingFeesUsd = getPositionPendingFeesUsd({
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd,
      });

      const closingPriceImpactDeltaUsd = getPriceImpactForPosition(
        marketInfo,
        position.sizeInUsd * -1n,
        position.isLong,
        { fallbackToZero: true }
      );

      const positionFeeInfo = getPositionFee(
        marketInfo,
        position.sizeInUsd,
        closingPriceImpactDeltaUsd > 0,
        userReferralInfo,
        uiFeeFactor
      );

      const closingFeeUsd = positionFeeInfo.positionFeeUsd;
      const uiFeeUsd = positionFeeInfo.uiFeeUsd ?? 0n;

      const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;

      const remainingCollateralUsd = collateralUsd - totalPendingFeesUsd;

      const remainingCollateralAmount = convertToTokenAmount(
        remainingCollateralUsd,
        collateralToken.decimals,
        collateralMinPrice
      )!;

      const pnl = getPositionPnlUsd({
        marketInfo: marketInfo,
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        markPrice,
        isLong: position.isLong,
      });

      const pnlPercentage =
        collateralUsd !== undefined && collateralUsd != 0n ? getBasisPoints(pnl, collateralUsd) : 0n;

      const netValue = getPositionNetValue({
        collateralUsd: collateralUsd,
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
        closingFeeUsd,
        uiFeeUsd,
      });

      const pnlAfterFees = pnl - totalPendingFeesUsd - closingFeeUsd - uiFeeUsd;
      const pnlAfterFeesPercentage =
        collateralUsd != 0n ? getBasisPoints(pnlAfterFees, collateralUsd + closingFeeUsd) : 0n;

      const leverage = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: collateralUsd,
        pnl: showPnlInLeverage ? pnl : undefined,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
      });

      const leverageWithPnl = getLeverage({
        sizeInUsd: position.sizeInUsd,
        collateralUsd: collateralUsd,
        pnl,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd: pendingFundingFeesUsd,
      });

      const maxAllowedLeverage = getMaxAllowedLeverageByMinCollateralFactor(marketInfo.minCollateralFactor);

      const hasLowCollateral = (leverage !== undefined && leverage > maxAllowedLeverage) || false;

      const liquidationPrice = getLiquidationPrice({
        marketInfo,
        collateralToken,
        sizeInUsd: position.sizeInUsd,
        sizeInTokens: position.sizeInTokens,
        collateralUsd,
        collateralAmount: position.collateralAmount,
        userReferralInfo,
        minCollateralUsd,
        pendingBorrowingFeesUsd: position.pendingBorrowingFeesUsd,
        pendingFundingFeesUsd,
        isLong: position.isLong,
      });

      const indexName = getMarketIndexName({ indexToken, isSpotOnly: false });
      const poolName = getMarketPoolName({ longToken, shortToken });

      acc[positionKey] = {
        ...position,
        market: marketInfo,
        marketInfo,
        indexName,
        poolName,
        indexToken,
        collateralToken,
        pnlToken,
        longToken,
        shortToken,
        markPrice,
        entryPrice,
        liquidationPrice,
        collateralUsd,
        remainingCollateralUsd,
        remainingCollateralAmount,
        hasLowCollateral,
        leverage,
        leverageWithPnl,
        pnl,
        pnlPercentage,
        pnlAfterFees,
        pnlAfterFeesPercentage,
        netValue,
        closingFeeUsd,
        uiFeeUsd,
        pendingFundingFeesUsd,
        pendingClaimableFundingFeesUsd,
      };

      return acc;
    }, {} as PositionsInfoData);

    return positionsInfoData;
  }
}
