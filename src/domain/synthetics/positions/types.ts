import type { ContractFunctionReturnType } from "viem";

import { PendingPositionUpdate } from "context/SyntheticsEvents";
import type SyntheticsReaderV2_2_1 from "sdk/abis/SyntheticsReaderV2_2_1";
import { Position as BasePosition, PositionInfo as BasePositionInfo } from "sdk/utils/positions/types";

export * from "sdk/utils/positions/types";

export type Position = BasePosition & {
  pendingUpdate?: PendingPositionUpdate;
};

export type PositionInfo = BasePositionInfo & {
  pendingUpdate?: PendingPositionUpdate;
};

export type ContractPositionInfo = ContractFunctionReturnType<typeof SyntheticsReaderV2_2_1, "view", "getPositionInfo">;
