import { zeroAddress, zeroHash } from "viem";

import DataStore from "abis/DataStore.json";
import ReferralStorage from "abis/ReferralStorage.json";
import SyntheticsReader from "abis/SyntheticsReader.json";

import { getContract } from "configs/contracts";
import {
  hashedPositionKey,
  MAX_AUTO_CANCEL_ORDERS_KEY,
  MIN_COLLATERAL_USD_KEY,
  MIN_POSITION_SIZE_USD_KEY,
  uiFeeFactorKey,
} from "configs/dataStore";
import { ContractMarketPrices, MarketsData, MarketsInfoData } from "types/markets";
import { Position, PositionsData, PositionsInfoData } from "types/positions";
import { PendingPositionUpdate, PositionDecreaseEvent, PositionIncreaseEvent } from "types/syntheticsEvents";
import { TokensData } from "types/tokens";
import { getContractMarketPrices, getMaxAllowedLeverageByMinCollateralFactor } from "utils/markets";
import { getByKey } from "utils/objects";
import {
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionKey,
  getPositionNetValue,
  getPositionPnlUsd,
  parsePositionKey,
} from "utils/positions";

import { Module } from "../base";

import { UserReferralInfo } from "types/referrals";
import { getPositionFee, getPriceImpactForPosition } from "utils/fees";
import { basisPointsToFloat, getBasisPoints } from "utils/numbers";
import { getPositionPendingFeesUsd } from "utils/positions";
import { getMarkPrice } from "utils/prices";
import { decodeReferralCode } from "utils/referrals";
import { convertToTokenAmount, convertToUsd } from "utils/tokens";
import { OrderInfo } from "types/orders";

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

  private getKeysAndPricesParams(p: { marketsInfoData: MarketsData | undefined; tokensData: TokensData | undefined }) {
    const { marketsInfoData, tokensData } = p;
    const account = this.account;

    const values = {
      allPositionsKeys: [] as string[],
      marketsPrices: [] as ContractMarketPrices[],
      marketsKeys: [] as string[],
    };

    if (!account || !marketsInfoData || !tokensData) {
      return values;
    }

    const markets = Object.values(marketsInfoData);

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

  private getOptimisticPositions(p: {
    positionsData: PositionsData | undefined;
    allPositionsKeys: string[] | undefined;
    positionDecreaseEvents?: PositionDecreaseEvent[] | undefined;
    positionIncreaseEvents?: PositionIncreaseEvent[] | undefined;
    pendingPositionsUpdates?: { [key: string]: PendingPositionUpdate } | undefined;
  }): PositionsData | undefined {
    const { positionsData, allPositionsKeys, positionDecreaseEvents, pendingPositionsUpdates, positionIncreaseEvents } =
      p;

    if (!allPositionsKeys) {
      return undefined;
    }

    if (!positionDecreaseEvents && !positionIncreaseEvents && !pendingPositionsUpdates) {
      return positionsData;
    }

    return allPositionsKeys.reduce((acc, key) => {
      const now = Date.now();

      const lastIncreaseEvent = positionIncreaseEvents
        ? positionIncreaseEvents.filter((e) => e.positionKey === key).pop()
        : undefined;
      const lastDecreaseEvent = positionDecreaseEvents
        ? positionDecreaseEvents.filter((e) => e.positionKey === key).pop()
        : undefined;

      const pendingUpdate =
        pendingPositionsUpdates?.[key] &&
        (pendingPositionsUpdates[key]?.updatedAt ?? 0) + Positions.MAX_PENDING_UPDATE_AGE > now
          ? pendingPositionsUpdates[key]
          : undefined;

      let position: Position;

      if (getByKey(positionsData, key)) {
        position = { ...getByKey(positionsData, key)! };
      } else if (pendingUpdate && pendingUpdate.isIncrease) {
        position = getPendingMockPosition(pendingUpdate);
      } else {
        return acc;
      }

      if (
        lastIncreaseEvent &&
        lastIncreaseEvent.increasedAtBlock > position.increasedAtBlock &&
        lastIncreaseEvent.increasedAtBlock > (lastDecreaseEvent?.decreasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastIncreaseEvent);
      } else if (
        lastDecreaseEvent &&
        lastDecreaseEvent.decreasedAtBlock > position.decreasedAtBlock &&
        lastDecreaseEvent.decreasedAtBlock > (lastIncreaseEvent?.increasedAtBlock || 0)
      ) {
        position = applyEventChanges(position, lastDecreaseEvent);
      }

      if (
        pendingUpdate &&
        ((pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.increasedAtBlock) ||
          (!pendingUpdate.isIncrease && pendingUpdate.updatedAtBlock > position.decreasedAtBlock))
      ) {
        position.pendingUpdate = pendingUpdate;
      }

      if (position.sizeInUsd > 0) {
        acc[key] = position;
      }

      return acc;
    }, {} as PositionsData);
  }

  async getPositions(p: {
    marketsInfoData: MarketsData | undefined;
    tokensData: TokensData | undefined;
    start?: number;
    end?: number;
  }): Promise<PositionsResult> {
    const chainId = this.chainId;
    const account = this.sdk.config.account;

    const keysAndPrices = this.getKeysAndPricesParams(p);

    const request = {
      reader: {
        contractAddress: getContract(chainId, "SyntheticsReader"),
        abi: SyntheticsReader.abi,
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
    };

    const positionsData = await this.sdk.executeMulticall(request).then((res) => {
      const positions = res.data.reader.positions.returnValues;

      return positions.reduce((positionsMap: PositionsData, positionInfo) => {
        const { position, fees } = positionInfo;
        const { addresses, numbers, flags, data } = position;
        const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

        // Empty position
        if (BigInt(numbers.increasedAtBlock) == 0n) {
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
          increasedAtBlock: numbers.increasedAtBlock,
          decreasedAtBlock: numbers.decreasedAtBlock,
          isLong: flags.isLong,
          pendingBorrowingFeesUsd: fees.borrowing.borrowingFeeUsd,
          fundingFeeAmount: fees.funding.fundingFeeAmount,
          claimableLongTokenAmount: fees.funding.claimableLongTokenAmount,
          claimableShortTokenAmount: fees.funding.claimableShortTokenAmount,
          data,
        };

        return positionsMap;
      }, {} as PositionsData);
    });

    const optimisticPositionsData = this.getOptimisticPositions({
      positionsData: positionsData,
      allPositionsKeys: keysAndPrices?.allPositionsKeys,
    });

    return {
      positionsData: optimisticPositionsData,
    };
  }

  private getUiFeeFactorRequest(): Promise<bigint> {
    return this.sdk
      .executeMulticall({
        dataStore: {
          contractAddress: getContract(this.chainId, "DataStore"),
          abi: DataStore.abi,
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
          abi: DataStore.abi,
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
          abi: ReferralStorage.abi,
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
        abi: ReferralStorage.abi,
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
          abi: ReferralStorage.abi,
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
          abi: ReferralStorage.abi,
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
          abi: ReferralStorage.abi,
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
      marketsInfoData,
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
      const pnlToken = position.isLong ? marketInfo?.longToken : marketInfo?.shortToken;
      const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

      if (!marketInfo || !indexToken || !pnlToken || !collateralToken) {
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

      acc[positionKey] = {
        ...position,
        marketInfo,
        indexToken,
        collateralToken,
        pnlToken,
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

function getPendingMockPosition(pendingUpdate: PendingPositionUpdate): Position {
  const { account, marketAddress, collateralAddress, isLong } = parsePositionKey(pendingUpdate.positionKey);

  return {
    key: pendingUpdate.positionKey,
    contractKey: hashedPositionKey(account, marketAddress, collateralAddress, isLong),
    account,
    marketAddress,
    collateralTokenAddress: collateralAddress,
    isLong,
    sizeInUsd: pendingUpdate.sizeDeltaUsd ?? 0n,
    collateralAmount: pendingUpdate.collateralDeltaAmount ?? 0n,
    sizeInTokens: pendingUpdate.sizeDeltaInTokens ?? 0n,
    increasedAtBlock: pendingUpdate.updatedAtBlock,
    decreasedAtBlock: 0n,
    pendingBorrowingFeesUsd: 0n,
    fundingFeeAmount: 0n,
    claimableLongTokenAmount: 0n,
    claimableShortTokenAmount: 0n,
    data: "0x",
    isOpening: true,
    pendingUpdate: pendingUpdate,
  };
}

function applyEventChanges(position: Position, event: PositionIncreaseEvent | PositionDecreaseEvent) {
  const nextPosition = { ...position };

  nextPosition.sizeInUsd = event.sizeInUsd;
  nextPosition.sizeInTokens = event.sizeInTokens;
  nextPosition.collateralAmount = event.collateralAmount;
  nextPosition.pendingBorrowingFeesUsd = 0n;
  nextPosition.fundingFeeAmount = 0n;
  nextPosition.claimableLongTokenAmount = 0n;
  nextPosition.claimableShortTokenAmount = 0n;
  nextPosition.pendingUpdate = undefined;
  nextPosition.isOpening = false;

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionIncreaseEvent).increasedAtBlock) {
    nextPosition.increasedAtBlock = (event as PositionIncreaseEvent).increasedAtBlock;
  }

  // eslint-disable-next-line local-rules/no-logical-bigint
  if ((event as PositionDecreaseEvent).decreasedAtBlock) {
    nextPosition.decreasedAtBlock = (event as PositionDecreaseEvent).decreasedAtBlock;
  }

  return nextPosition;
}
