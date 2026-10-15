import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  isRewardsTesterAvailable,
  registerRewardsTesterVestingSimulator,
  useRewardsTesterRuntime,
} from "./useRewardsTester";

// Moves the team's vesting simulator from the page into the Tester window. The simulator keeps living in
// RewardsVestingFlow (same state and callbacks); only where it is drawn changes.
export function RewardsTesterVestingSimulatorSlot({ children }: { children: ReactNode }) {
  const { vestingSlot } = useRewardsTesterRuntime();

  useEffect(() => registerRewardsTesterVestingSimulator(), []);

  if (!isRewardsTesterAvailable()) return <>{children}</>;

  return vestingSlot ? createPortal(children, vestingSlot) : null;
}
