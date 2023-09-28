import useSWRInfinite from "swr/infinite";
import { useMemo } from "react";
import { BigNumber, ethers } from "ethers";
import Reader from "abis/SyntheticsReader.json";
import { MAX_ALLOWED_LEVERAGE } from "config/factors";
import { getContract } from "config/contracts";
import { getByKey } from "lib/objects";
import { useChainId } from "lib/chains";
import { getProvider } from "lib/rpc";
import { PRECISION } from "lib/legacy";
import { UserReferralInfo } from "domain/referrals";
import { getMarkPrice } from "../trade";
import { getPositionFee, getPriceImpactForPosition } from "../fees";
import { TokensData, convertToUsd } from "../tokens";
import { ContractMarketPrices, MarketsInfoData, useMarketsInfo } from "../markets";
import {
  PositionsInfoData,
  getEntryPrice,
  getLeverage,
  getLiquidationPrice,
  getPositionKey,
  getPositionPendingFeesUsd,
  getPositionPnlUsd,
  usePositionsConstants,
} from "../positions";

import { floorTimestamp } from "./utils";

type PositionsResult = {
  isLoading: boolean;
  data: PositionsInfoData;
  error: Error | null;
  updatedAt: number;
};

type PositionJson = { [key: string]: any; [key: number]: any };

function parsePositionsInfo(
  positionKeys: string[] = [],
  positions: PositionJson[] = [],
  marketsInfoData: MarketsInfoData,
  tokensData: TokensData,
  minCollateralUsd: BigNumber,
  showPnlInLeverage: boolean = true
) {
  const positionsMap: PositionsInfoData = {};
  for (let i = 0; i < positions.length; i++) {
    const positionInfo = positions[i];
    const {
      position: { addresses, numbers, flags, data },
      fees,
    } = positionInfo;
    const { account, market: marketAddress, collateralToken: collateralTokenAddress } = addresses;

    // Empty position
    if (BigNumber.from(numbers.increasedAtBlock).eq(0)) {
      return positionsMap;
    }

    const positionKey = getPositionKey(account, marketAddress, collateralTokenAddress, flags.isLong);
    const contractPositionKey = positionKeys[i];
    const position = {
      key: positionKey,
      contractKey: contractPositionKey,
      account,
      marketAddress,
      collateralTokenAddress,
      sizeInUsd: BigNumber.from(numbers.sizeInUsd),
      sizeInTokens: BigNumber.from(numbers.sizeInTokens),
      collateralAmount: BigNumber.from(numbers.collateralAmount),
      increasedAtBlock: BigNumber.from(numbers.increasedAtBlock),
      decreasedAtBlock: BigNumber.from(numbers.decreasedAtBlock),
      isLong: flags.isLong,
      pendingBorrowingFeesUsd: BigNumber.from(fees.borrowing.borrowingFeeUsd),
      fundingFeeAmount: BigNumber.from(fees.funding.fundingFeeAmount),
      claimableLongTokenAmount: BigNumber.from(fees.funding.claimableLongTokenAmount),
      claimableShortTokenAmount: BigNumber.from(fees.funding.claimableShortTokenAmount),
      data,
    };

    const marketInfo = getByKey(marketsInfoData, position.marketAddress);
    const indexToken = marketInfo?.indexToken;
    const pnlToken = position.isLong ? marketInfo?.longToken : marketInfo?.shortToken;
    const collateralToken = getByKey(tokensData, position.collateralTokenAddress);

    if (!marketInfo || !indexToken || !pnlToken || !collateralToken) {
      return positionsMap;
    }

    const markPrice = getMarkPrice({ prices: indexToken.prices, isLong: position.isLong, isIncrease: false });
    const collateralMinPrice = collateralToken.prices.minPrice;
    const pendingBorrowingFeesUsd = position.pendingBorrowingFeesUsd;

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

    const totalPendingFeesUsd = getPositionPendingFeesUsd({
      pendingBorrowingFeesUsd,
      pendingFundingFeesUsd,
    });

    const closingPriceImpactDeltaUsd = getPriceImpactForPosition(
      marketInfo,
      position.sizeInUsd.mul(-1),
      position.isLong,
      { fallbackToZero: true }
    );

    const userReferralInfo = {
      discountFactor: PRECISION,
      totalRebateFactor: fees.referral.traderDiscountAmount.mul(PRECISION).div(fees.positionFeeAmount),
    } as UserReferralInfo;

    const positionFeeInfo = getPositionFee(
      marketInfo,
      position.sizeInUsd,
      closingPriceImpactDeltaUsd.gt(0),
      userReferralInfo
    );

    const closingFeeUsd = positionFeeInfo.positionFeeUsd;
    const collateralUsd = convertToUsd(position.collateralAmount, collateralToken.decimals, collateralMinPrice)!;
    const pnl = getPositionPnlUsd({
      marketInfo,
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      markPrice,
      isLong: position.isLong,
    });

    const pnlAfterFees = pnl.sub(totalPendingFeesUsd).sub(closingFeeUsd);
    const leverage = getLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: collateralUsd,
      pnl: showPnlInLeverage ? pnl : undefined,
      pendingBorrowingFeesUsd,
      pendingFundingFeesUsd,
    });

    const hasLowCollateral = leverage?.gt(MAX_ALLOWED_LEVERAGE) || false;
    const liquidationPrice = getLiquidationPrice({
      marketInfo,
      collateralToken,
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd,
      collateralAmount: position.collateralAmount,
      minCollateralUsd,
      pendingBorrowingFeesUsd,
      pendingFundingFeesUsd,
      isLong: position.isLong,
      userReferralInfo,
    });

    positionsMap[positionKey] = {
      ...position,
      marketInfo,
      indexToken,
      collateralToken,
      pnlToken,
      markPrice,
      entryPrice,
      liquidationPrice,
      collateralUsd,
      remainingCollateralUsd: BigNumber.from(0), // not used,
      remainingCollateralAmount: BigNumber.from(0), // not used,
      hasLowCollateral,
      leverage,
      leverageWithPnl: BigNumber.from(0), // not used,
      pnl,
      pnlPercentage: BigNumber.from(0), // not used,
      pnlAfterFees,
      pnlAfterFeesPercentage: BigNumber.from(0), // not used,
      netValue: BigNumber.from(0), // not used
      closingFeeUsd,
      pendingFundingFeesUsd,
      pendingClaimableFundingFeesUsd: BigNumber.from(0), // not used,
    };
  }

  return positionsMap;
}

export function usePositionsInfo(
  positionKeys: string[],
  marketPrices: ContractMarketPrices[]
): PositionsResult {
  const { chainId } = useChainId();
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const { marketsInfoData, tokensData, pricesUpdatedAt } = useMarketsInfo(chainId);
  const tsRounded = floorTimestamp(pricesUpdatedAt);
  const pageSize = 150;
  const pageNumb = Math.ceil(positionKeys.length / pageSize);
  const ReaderAddress = getContract(chainId, "SyntheticsReader");
  const DataStoreAddress = getContract(chainId, "DataStore");
  const ReferralStorageAddress = getContract(chainId, "ReferralStorage");
  const contract = useMemo(
    () => new ethers.Contract(ReaderAddress, Reader.abi, getProvider(undefined, chainId)),
    [chainId, ReaderAddress]
  );

  const getKey = (i: number) => (pageNumb && i < pageNumb ? ["usePositionsInfo", chainId, tsRounded, i] : null);
  const { data: positionsInfoJson } = useSWRInfinite<PositionJson[]>(
    getKey,
    ([, , , i]) =>
      contract.getAccountPositionInfoList(
        DataStoreAddress,
        ReferralStorageAddress,
        positionKeys.slice(pageSize * i, pageSize * (i + 1)),
        marketPrices.slice(pageSize * i, pageSize * (i + 1)),
        ethers.constants.AddressZero // uiFeeReceiver
      ),
    {
      parallel: true,
      refreshInterval: 0,
      keepPreviousData: true,
      initialSize: pageNumb,
      revalidateAll: true,
    }
  );

  const positionsInfo = positionsInfoJson?.flat() || [];
  const { data, updatedAt } = useMemo(() => {
    if (
      !tokensData ||
      !marketsInfoData ||
      !minCollateralUsd ||
      !positionsInfo.length ||
      positionsInfo.length !== positionKeys.length
    ) {
      return { data: undefined, updatedAt: 0 };
    }

    const data = parsePositionsInfo(positionKeys, positionsInfo, marketsInfoData, tokensData, minCollateralUsd);
    return { data, updatedAt: Date.now() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, positionsInfo.length ? tsRounded : 0]);

  return { isLoading: !data, error: null, data: data || {}, updatedAt };
}
