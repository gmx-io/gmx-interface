/* eslint-disable @typescript-eslint/no-explicit-any */
import { BN } from '@coral-xyz/anchor';
import { ONE_USD } from '@/config/constants';
import { MarketState } from '@/selectors/market/types';

type LiquidationFactors = Pick<
  MarketState,
  'minCollateralFactor' | 'minCollateralFactorForLiquidation'
>;

export interface CorrectLiquidationPriceParams {
  statusData: any;
  sizeInUsd: BN | undefined;
  sizeInTokens: BN | undefined;
  collateralAmount: BN | undefined;
  isLong: boolean;
  collateralToken: string;
  indexToken: string;
  marketState: LiquidationFactors | undefined;
}

export function correctLiquidationPrice({
  statusData,
  sizeInUsd,
  sizeInTokens,
  collateralAmount,
  isLong,
  collateralToken,
  indexToken,
  marketState,
}: CorrectLiquidationPriceParams): any {
  if (!statusData || !statusData.liquidation_price || !marketState) return statusData;

  const oldFactor = marketState.minCollateralFactor;
  const newFactor = marketState.minCollateralFactorForLiquidation;
  if (!oldFactor || !newFactor || oldFactor.eq(newFactor)) return statusData;

  if (!sizeInUsd || !sizeInTokens || !collateralAmount) return statusData;
  if (sizeInTokens.isZero()) return statusData;

  const deltaCollateral = sizeInUsd.mul(newFactor.sub(oldFactor)).div(ONE_USD);
  if (deltaCollateral.isZero()) return statusData;
  const isCollateralIndexToken = collateralToken === indexToken;

  let denominator: BN;
  if (isCollateralIndexToken) {
    denominator = isLong
      ? sizeInTokens.add(collateralAmount)
      : sizeInTokens.sub(collateralAmount);
  } else {
    denominator = isLong ? sizeInTokens : sizeInTokens.neg();
  }

  if (denominator.isZero()) return statusData;

  const oldLiqPrice = new BN(statusData.liquidation_price.toString());
  const priceDelta = deltaCollateral.div(denominator);
  const newLiqPrice = oldLiqPrice.add(priceDelta);

  return {
    ...statusData,
    liquidation_price: newLiqPrice.lten(0) ? undefined : BigInt(newLiqPrice.toString()),
  };
}

export function correctLiquidationPriceForRawPosition(
  statusData: any,
  positionObj: any,
  marketState: LiquidationFactors | undefined,
  indexToken: string,
): any {
  if (!positionObj?.state) return statusData;

  return correctLiquidationPrice({
    statusData,
    sizeInUsd: positionObj.state.sizeInUsd,
    sizeInTokens: positionObj.state.sizeInTokens,
    collateralAmount: positionObj.state.collateralAmount,
    isLong: positionObj.kind === 1,
    collateralToken:
      positionObj.collateralToken?.toBase58?.() ?? String(positionObj.collateralToken ?? ''),
    indexToken,
    marketState,
  });
}

function readMarketTokenKey(marketInfo: any): string | undefined {
  const key = marketInfo?.marketToken?.toString?.() ?? marketInfo?.marketToken;
  return key ? String(key) : undefined;
}

export function correctLiquidationPriceFromMarketInfo(
  statusData: any,
  positionObj: any,
  marketInfo: any,
  marketsState: Record<string, LiquidationFactors | undefined> | undefined,
): any {
  if (!statusData || !positionObj) return statusData;
  const marketTokenKey = readMarketTokenKey(marketInfo);
  if (!marketTokenKey) return statusData;
  const indexToken = marketInfo?.indexToken?.toString?.() ?? marketInfo?.indexToken;
  const marketState = marketsState?.[marketTokenKey];
  return correctLiquidationPriceForRawPosition(statusData, positionObj, marketState, indexToken);
}
