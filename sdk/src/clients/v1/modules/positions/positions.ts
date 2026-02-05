import { zeroAddress, zeroHash } from "viem";

import { Module } from "clients/v1/modules/base";
import type { MulticallRequestConfig } from "clients/v1/multicall";
import { BOTANIX } from "configs/chains";
import { getContract } from "configs/contracts";
import {
  hashedPositionKey,
  MAX_AUTO_CANCEL_ORDERS_KEY,
  MIN_COLLATERAL_USD_KEY,
  MIN_POSITION_SIZE_USD_KEY,
  uiFeeFactorKey,
} from "configs/dataStore";
import { getContractMarketPrices } from "utils/markets";
import { ContractMarketPrices, MarketsData, MarketsInfoData } from "utils/markets/types";
import { basisPointsToFloat } from "utils/numbers";
import { getByKey } from "utils/objects";
import { OrderInfo } from "utils/orders/types";
import { getPositionInfo, getPositionKey } from "utils/positions";
import { Position, PositionsData, PositionsInfoData } from "utils/positions/types";
import { decodeReferralCode } from "utils/referrals";
import { UserReferralInfo } from "utils/referrals/types";
import { TokensData } from "utils/tokens/types";

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

      return positions.reduce((positionsMap: PositionsData, positionInfo: any) => {
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
          pendingImpactAmount: numbers.pendingImpactAmount,
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

  private async getUserReferralCode() {
    if (this.chainId === BOTANIX) {
      return {
        attachedOnChain: false,
        userReferralCode: undefined,
        userReferralCodeString: undefined,
        referralCodeForTxn: zeroHash,
      };
    }

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
      await this.getUserReferralCode();

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
    const { showPnlInLeverage, marketsInfoData } = p;
    const { positionsData } = await this.getPositions({
      marketsData: marketsInfoData,
      tokensData: p.tokensData,
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

      if (!marketInfo) {
        return acc;
      }

      acc[positionKey] = getPositionInfo({
        position,
        marketInfo,
        minCollateralUsd,
        userReferralInfo,
        showPnlInLeverage,
        uiFeeFactor,
      });

      return acc;
    }, {} as PositionsInfoData);

    return positionsInfoData;
  }
}
