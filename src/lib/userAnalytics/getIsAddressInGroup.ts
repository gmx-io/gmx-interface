import { useMemo } from "react";
import { keccak256, stringToHex } from "viem/utils";

export function getIsAddressInGroup({
  address,
  experimentGroupProbability: probability,
  grouping: salt,
}: {
  address: string;
  /**
   * 0n-100n meaning 0% - 100%
   */
  experimentGroupProbability: bigint;
  grouping: string;
}): boolean {
  const hash = keccak256(stringToHex(address.toLowerCase() + (salt || "")));
  const twoDigits = BigInt(hash) % 100n;
  const isInGroup = twoDigits < probability;
  return isInGroup;
}

export function useIsAddressInGroup({
  address,
  experimentGroupProbability: probability,
  grouping: salt,
}: {
  address: string | undefined;
  experimentGroupProbability: bigint;
  grouping: string;
}) {
  const isInGroup = useMemo(
    () =>
      address !== undefined &&
      getIsAddressInGroup({
        address,
        experimentGroupProbability: probability,
        grouping: salt,
      }),
    [address, probability, salt]
  );

  return isInGroup;
}
