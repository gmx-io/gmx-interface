import { PositionInfo } from "sdk/types/positions";
import { MarketInfo } from "../markets";

export * from "sdk/types/positions";

export type PositionInfoLoaded = PositionInfo & { marketInfo: MarketInfo };
