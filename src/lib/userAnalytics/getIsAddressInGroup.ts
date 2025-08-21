import { useMemo } from "react";
import { keccak256, stringToHex } from "viem/utils";

export function getIsAddressInGroup({
  address,
  experimentGroupProbability: probability,
  grouping: salt,
}: {
  address: string;
  /**
   * 0-1 meaning 0% - 100%
   */
  experimentGroupProbability: number;
  grouping: string;
}): boolean {
  const hash = keccak256(stringToHex(address.toLowerCase() + (salt || "")));
  const twoDigits = BigInt(hash) % 100n;
  const isInGroup = twoDigits < BigInt(Math.trunc(probability * 100));
  return isInGroup;
}

export function useIsAddressInGroup({
  address,
  experimentGroupProbability: probability,
  grouping: salt,
}: {
  address: string | undefined;
  experimentGroupProbability: number;
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
