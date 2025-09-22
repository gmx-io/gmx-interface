import { PendingPositionUpdate } from "context/SyntheticsEvents";
import { Position as BasePosition, PositionInfo as BasePositionInfo } from "sdk/types/positions";

export * from "sdk/types/positions";

export type Position = BasePosition & {
  pendingUpdate?: PendingPositionUpdate;
};

export type PositionInfo = BasePositionInfo & {
  pendingUpdate?: PendingPositionUpdate;
};
