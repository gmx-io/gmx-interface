import { describe, expect, it } from "vitest";

import { parseRewardsVestingResponse } from "./useRewardsVestingData";

function makeMulticallResult(vestingInfo: bigint[] = [55n, 66n, 77n, 88n, 99n, 211n, 222n]) {
  return {
    data: {
      gmx: { balanceOf: { returnValues: [11n] } },
      esGmx: { balanceOf: { returnValues: [22n] } },
      rewardReader: {
        getStakingInfo: {
          returnValues: [21n, 0n, 0n, 0n, 0n, 34n, 0n, 0n, 0n, 0n],
        },
      },
      stakedGmxTracker: { gmxDepositBalance: { returnValues: [33n] } },
      feeGmxTracker: { balanceOf: { returnValues: [44n] } },
      reader: { getVestingInfo: { returnValues: vestingInfo } },
      gmxVester: { vestingDuration: { returnValues: [333n] } },
    },
  } as never;
}

describe("parseRewardsVestingResponse", () => {
  it("parses the Reader seven-field response", () => {
    expect(parseRewardsVestingResponse(makeMulticallResult())).toEqual({
      walletGmxBalance: 11n,
      walletEsGmxBalance: 22n,
      claimableEsGmxRewards: 55n,
      stakedGmxBalance: 33n,
      freePairAmount: 44n,
      vestingInfo: {
        pairAmount: 55n,
        vestedAmount: 66n,
        escrowedBalance: 77n,
        claimedAmounts: 88n,
        claimable: 99n,
        maxVestableAmount: 211n,
        averageStakedAmount: 222n,
      },
      vestingDuration: 333n,
    });
  });

  it("throws when any required return value is missing", () => {
    expect(() => parseRewardsVestingResponse(makeMulticallResult([55n, 66n, 77n, 88n, 99n, 111n]))).toThrow(
      "Incomplete rewards vesting response"
    );
  });
});
