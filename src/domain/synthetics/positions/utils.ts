import { PositionsData } from "./types";

export function getPositions(positionsData: PositionsData) {
  return Object.values(positionsData);
}

export function getPosition(
  positionsData: PositionsData,
  account?: string,
  market?: string,
  collateralToken?: string,
  isLong?: boolean
) {
  if (!account || !market || !collateralToken || isLong === undefined) return undefined;

  const key = getPositionKey(account, market, collateralToken, isLong);

  return getPositionByKey(positionsData, key);
}

export function getPositionByKey(positionsData: PositionsData, positionKey?: string) {
  if (!positionKey) return undefined;

  return positionsData[positionKey];
}

export function getPositionKey(account: string, market: string, collateralToken: string, isLong: boolean) {
  return `${account}-${market}-${collateralToken}-${isLong}`;
}
