import { Interface, TransactionReceipt } from "ethers";

import { abis } from "sdk/abis";

const vesterInterface = new Interface(abis.Vester);

export type VesterClaim = {
  vesterAddress: string;
  claimableAmount: bigint;
};

export function getVesterClaims(vesterClaims: VesterClaim[]) {
  return vesterClaims.filter(({ claimableAmount }) => claimableAmount > 0n);
}

export function getIsRewardRouterClaimNeeded({
  shouldClaimGmx,
  stakingGmxRewards,
  shouldClaimEsGmx,
  esGmxRewards,
  shouldClaimNativeToken,
  nativeTokenRewards,
}: {
  shouldClaimGmx: boolean;
  stakingGmxRewards: bigint;
  shouldClaimEsGmx: boolean;
  esGmxRewards: bigint;
  shouldClaimNativeToken: boolean;
  nativeTokenRewards: bigint;
}) {
  return (
    (shouldClaimGmx && stakingGmxRewards > 0n) ||
    (shouldClaimEsGmx && esGmxRewards > 0n) ||
    (shouldClaimNativeToken && nativeTokenRewards > 0n)
  );
}

export function getVesterClaimedAmount(receipt: TransactionReceipt | null, vesterAddress: string) {
  let claimedAmount = 0n;

  for (const log of receipt?.logs ?? []) {
    if (log.address !== vesterAddress) {
      continue;
    }

    const event = vesterInterface.parseLog(log);

    if (event?.name === "Claim") {
      claimedAmount += event.args.amount as bigint;
    }
  }

  return claimedAmount;
}
