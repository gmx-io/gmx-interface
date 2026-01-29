import { PendingPositionUpdate } from "context/SyntheticsEvents";
import { Position as BasePosition, PositionInfo as BasePositionInfo } from "sdk/utils/positions/types";

export * from "sdk/utils/positions/types";

export type Position = BasePosition & {
  pendingUpdate?: PendingPositionUpdate;
};

export type PositionInfo = BasePositionInfo & {
  pendingUpdate?: PendingPositionUpdate;
};
