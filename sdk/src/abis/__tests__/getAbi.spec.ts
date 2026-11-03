import { decodeFunctionResult, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM_SEPOLIA } from "configs/chainIds";

import { getAbi } from "../getAbi";
import responses from "./fixtures/arbitrumSepoliaReaders.json";

describe("Arbitrum Sepolia reader responses", () => {
  it("decodes an existing short position with the deployed position layout", () => {
    const data = responses.getAccountPositions as Hex;

    const positions = decodeFunctionResult({
      abi: getAbi(ARBITRUM_SEPOLIA, "SyntheticsReader"),
      functionName: "getAccountPositions",
      data,
    });

    expect(positions).toMatchObject([
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
          cappedPnlReferencePoolPnlUsd: -13n,
          cappedPnlAllowancePerPrice: 17n,
        },
        flags: { isLong: false },
      },
    ]);
  });

  it("decodes position details and fees after the added position fields", () => {
    const positions = decodeFunctionResult({
      abi: getAbi(ARBITRUM_SEPOLIA, "SyntheticsReader"),
      functionName: "getPositionInfoList",
      data: responses.getPositionInfoList as Hex,
    });

    expect(positions).toMatchObject([
      {
        position: { numbers: { increasedAtTime: 1789995567n }, flags: { isLong: false } },
        fees: { positionFeeAmount: 5n, balanceWasImproved: true },
        basePnlUsd: -25n,
      },
    ]);
  });

  it("decodes market information with borrowing availability flags", () => {
    const markets = decodeFunctionResult({
      abi: getAbi(ARBITRUM_SEPOLIA, "SyntheticsReader"),
      functionName: "getMarketInfoList",
      data: responses.getMarketInfoList as Hex,
    });

    expect(markets).toMatchObject([
      {
        borrowingFactorPerSecondForLongs: 27n,
        borrowingFactorPerSecondForShorts: 13n,
        borrowingFactorForLongsAvailable: true,
        borrowingFactorForShortsAvailable: false,
        isDisabled: false,
      },
    ]);
  });

  it.each(["getAccountGlvDeposits", "getAccountGlvWithdrawals"] as const)(
    "decodes %s with the added UI fee factor",
    (functionName) => {
      const orders = decodeFunctionResult({
        abi: getAbi(ARBITRUM_SEPOLIA, "GlvReader"),
        functionName,
        data: responses[functionName] as Hex,
      });

      expect(orders).toMatchObject([
        {
          numbers: {
            uiFeeFactor: 123n,
            updatedAtTime: 1789995567n,
            executionFee: 123456789n,
            srcChainId: 421614n,
          },
        },
      ]);
    }
  );
});
