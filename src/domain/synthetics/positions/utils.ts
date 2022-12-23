import { PositionsData } from "./types";

export function getPositions(positionsData: PositionsData) {
  return Object.values(positionsData);
}

export function getPosition(positionsData: PositionsData, positionKey?: string) {
  if (!positionKey) return undefined;

  return positionsData[positionKey];
}

export function getPositionKey(account: string, market: string, collateralToken: string, isLong: boolean) {
  return `${account}-${market}-${collateralToken}-${isLong}`;
}
