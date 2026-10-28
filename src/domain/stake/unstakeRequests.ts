import { SECONDS_IN_DAY } from "lib/dates";
import { bigMath } from "sdk/utils/bigmath";

export type UnstakeRequest = {
  key: string;
  amount: bigint;
  requestedAt: number;
};

export type UnstakeRequestStatus =
  | { type: "waiting"; availableAt: number; daysLeft: number }
  | { type: "ready"; availableAt: number };

export function getUnstakeRequestStatus(
  request: UnstakeRequest,
  { unstakeDelay, now }: { unstakeDelay: number; now: number }
): UnstakeRequestStatus {
  const availableAt = request.requestedAt + unstakeDelay;

  if (now < availableAt) {
    return { type: "waiting", availableAt, daysLeft: Math.ceil((availableAt - now) / SECONDS_IN_DAY) };
  }

  return { type: "ready", availableAt };
}

export function getUnstakeDelayDays(unstakeDelay: number) {
  return Math.ceil(unstakeDelay / SECONDS_IN_DAY);
}

export function getRequestableUnstakeAmount({
  stakedAmount,
  pendingAmount,
}: {
  stakedAmount: bigint;
  pendingAmount: bigint;
}) {
  return stakedAmount > pendingAmount ? stakedAmount - pendingAmount : 0n;
}

export function getWithdrawableUnstakeAmount({
  executableAmount,
  stakedTokenAmount,
  unreservedAmount,
}: {
  executableAmount: bigint;
  stakedTokenAmount: bigint;
  unreservedAmount: bigint;
}) {
  return bigMath.max(bigMath.min(executableAmount, stakedTokenAmount, unreservedAmount), 0n);
}

export function getReservedForVestingAmount({
  stakedAmount,
  sbfGmxBalance,
}: {
  stakedAmount: bigint;
  sbfGmxBalance: bigint | undefined;
}) {
  if (sbfGmxBalance === undefined) {
    return 0n;
  }

  return stakedAmount > sbfGmxBalance ? stakedAmount - sbfGmxBalance : 0n;
}
