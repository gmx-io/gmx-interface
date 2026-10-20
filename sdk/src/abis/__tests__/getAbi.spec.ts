import { type Abi, decodeFunctionResult, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { abis } from "abis";
import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE, AVALANCHE_FUJI, MEGAETH } from "configs/chainIds";

import { getAbi } from "../getAbi";
import responses from "./fixtures/arbitrumSepoliaReaders.json";

const GLV_NUMBERS = { uiFeeFactor: 123n, updatedAtTime: 1789995567n, executionFee: 123456789n, srcChainId: 421614n };

describe("getAbi", () => {
  it.each([
    [
      "SyntheticsReader",
      "getAccountPositions",
      [
        {
          addresses: { account: "0x1111111111111111111111111111111111111111" },
          numbers: {
            sizeInUsd: 4000000000000000000000000000000n,
            collateralAmount: 1997603n,
            realizedUncappedPnlUsd: -7n,
            realizedPnlUsd: 3n,
            cappedPnlPoolTokenAmount: 11n,
            increasedAtTime: 1789995567n,
            decreasedAtTime: 0n,
          },
          flags: { isLong: false },
        },
      ],
    ],
    [
      "SyntheticsReader",
      "getPositionInfoList",
      [
        {
          position: { numbers: { increasedAtTime: 1789995567n }, flags: { isLong: false } },
          fees: { positionFeeAmount: 5n, balanceWasImproved: true },
          basePnlUsd: -25n,
        },
      ],
    ],
    [
      "SyntheticsReader",
      "getMarketInfoList",
      [
        {
          borrowingFactorPerSecondForLongs: 27n,
          borrowingFactorPerSecondForShorts: 13n,
          borrowingFactorForLongsAvailable: true,
          borrowingFactorForShortsAvailable: false,
          isDisabled: false,
        },
      ],
    ],
    ["GlvReader", "getAccountGlvDeposits", [{ numbers: GLV_NUMBERS }]],
    ["GlvReader", "getAccountGlvWithdrawals", [{ numbers: GLV_NUMBERS }]],
  ] as const)("decodes Sepolia %s.%s responses", (abiId, functionName, expected) => {
    const data = responses[functionName] as Hex;

    expect(() => decodeFunctionResult({ abi: abis[abiId] as Abi, functionName, data })).toThrow();
    expect(decodeFunctionResult({ abi: getAbi(ARBITRUM_SEPOLIA, abiId) as Abi, functionName, data })).toMatchObject(
      expected
    );
  });

  it.each([
    [ARBITRUM, "SyntheticsReader"],
    [ARBITRUM, "GlvReader"],
    [AVALANCHE, "SyntheticsReader"],
    [AVALANCHE, "GlvReader"],
    [MEGAETH, "SyntheticsReader"],
    [MEGAETH, "GlvReader"],
    [AVALANCHE_FUJI, "SyntheticsReader"],
    [AVALANCHE_FUJI, "GlvReader"],
    [ARBITRUM_SEPOLIA, "DataStore"],
  ] as const)("keeps the shared %s %s ABI", (chainId, abiId) => {
    expect(getAbi(chainId, abiId)).toBe(abis[abiId]);
  });
});
