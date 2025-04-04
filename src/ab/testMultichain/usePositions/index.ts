import { getIsFlagEnabled } from "config/ab";

import {
  usePositions as usePositionsDisabled,
  getPendingMockPosition as getPendingMockPositionDisabled,
  useOptimisticPositions as useOptimisticPositionsDisabled,
} from "./disabled";
import {
  usePositions as usePositionsEnabled,
  getPendingMockPosition as getPendingMockPositionEnabled,
  useOptimisticPositions as useOptimisticPositionsEnabled,
} from "./enabled";

export const usePositions = getIsFlagEnabled("testMultichain") ? usePositionsEnabled : usePositionsDisabled;
export const useOptimisticPositions = getIsFlagEnabled("testMultichain")
  ? useOptimisticPositionsEnabled
  : useOptimisticPositionsDisabled;
export const getPendingMockPosition = getIsFlagEnabled("testMultichain")
  ? getPendingMockPositionEnabled
  : getPendingMockPositionDisabled;
