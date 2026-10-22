import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { getUsdgClosePayout } from "../closePayout";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;

describe("getUsdgClosePayout", () => {
  it.each([
    {
      name: "asked for USDC and the conversion filled",
      received: { [USDC]: 543_320_000n, [USDG]: 0n },
      isUsdcRequested: true,
      swapPathLength: 1,
      expected: { token: USDC, isConversionFailed: false, isConvertLinkShown: false },
    },
    {
      name: "asked for USDC but the conversion couldn't fill",
      received: { [USDC]: 0n, [USDG]: 812_400_550_000n },
      isUsdcRequested: true,
      swapPathLength: 1,
      expected: { token: USDG, isConversionFailed: true, isConvertLinkShown: true },
    },
    {
      name: "switched to USDG with Receive USDG instead",
      received: { [USDC]: 0n, [USDG]: 1_212_400_550_000n },
      isUsdcRequested: true,
      swapPathLength: 0,
      expected: { token: USDG, isConversionFailed: false, isConvertLinkShown: true },
    },
    {
      name: "stayed on the USDG default",
      received: { [USDC]: 0n, [USDG]: 20_210_400_000n },
      isUsdcRequested: false,
      swapPathLength: 0,
      expected: { token: USDG, isConversionFailed: false, isConvertLinkShown: false },
    },
    {
      name: "was paid to the GMX Account",
      received: { [USDC]: 0n, [USDG]: 0n },
      isUsdcRequested: true,
      swapPathLength: 1,
      expected: undefined,
    },
  ])("names the payout when the trader $name", ({ received, isUsdcRequested, swapPathLength, expected }) => {
    const payout = getUsdgClosePayout({
      receivedAmounts: received,
      usdgAddress: USDG,
      usdcAddress: USDC,
      isUsdcRequested,
      swapPathLength,
    });

    expect(
      payout && {
        token: payout.receivedTokenAddress,
        isConversionFailed: payout.isConversionFailed,
        isConvertLinkShown: payout.isConvertLinkShown,
      }
    ).toEqual(expected);
  });
});
