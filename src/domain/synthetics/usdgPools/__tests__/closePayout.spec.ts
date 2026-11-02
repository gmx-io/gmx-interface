import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { NATIVE_TOKEN_ADDRESS, getTokenBySymbol } from "sdk/configs/tokens";

import { getUsdgClosePayout } from "../closePayout";

const USDG = getTokenBySymbol(ARBITRUM, "USDG").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;

describe("getUsdgClosePayout", () => {
  it.each([
    {
      name: "asked for USDC and the conversion filled",
      receiptAmounts: { swapOutputAmount: 543_320_000n, usdgAmount: 0n },
      outTokenAddress: USDC,
      requestedTokenAddress: USDC,
      swapPathLength: 1,
      expected: { token: USDC, amount: 543_320_000n, isConversionFailed: false, convertTo: undefined },
    },
    {
      name: "asked for ETH and the two-hop conversion filled",
      receiptAmounts: { swapOutputAmount: 150_000_000_000_000_000n, usdgAmount: 0n },
      outTokenAddress: NATIVE_TOKEN_ADDRESS,
      requestedTokenAddress: NATIVE_TOKEN_ADDRESS,
      swapPathLength: 2,
      expected: {
        token: NATIVE_TOKEN_ADDRESS,
        amount: 150_000_000_000_000_000n,
        isConversionFailed: false,
        convertTo: undefined,
      },
    },
    {
      name: "asked for ETH but the conversion couldn't fill",
      receiptAmounts: { swapOutputAmount: undefined, usdgAmount: 812_400_550_000n },
      outTokenAddress: NATIVE_TOKEN_ADDRESS,
      requestedTokenAddress: NATIVE_TOKEN_ADDRESS,
      swapPathLength: 2,
      expected: { token: USDG, amount: 812_400_550_000n, isConversionFailed: true, convertTo: NATIVE_TOKEN_ADDRESS },
    },
    {
      name: "switched to USDG with Receive USDG instead",
      receiptAmounts: { swapOutputAmount: undefined, usdgAmount: 1_212_400_550_000n },
      outTokenAddress: USDG,
      requestedTokenAddress: USDC,
      swapPathLength: 0,
      expected: { token: USDG, amount: 1_212_400_550_000n, isConversionFailed: false, convertTo: USDC },
    },
    {
      name: "stayed on the USDG default",
      receiptAmounts: { swapOutputAmount: undefined, usdgAmount: 20_210_400_000n },
      outTokenAddress: USDG,
      requestedTokenAddress: USDG,
      swapPathLength: 0,
      expected: { token: USDG, amount: 20_210_400_000n, isConversionFailed: false, convertTo: undefined },
    },
    {
      name: "got nothing back",
      receiptAmounts: { swapOutputAmount: undefined, usdgAmount: 0n },
      outTokenAddress: USDC,
      requestedTokenAddress: USDC,
      swapPathLength: 1,
      expected: undefined,
    },
  ])(
    "names the payout when the trader $name PRO-4512",
    ({ receiptAmounts, outTokenAddress, requestedTokenAddress, swapPathLength, expected }) => {
      const payout = getUsdgClosePayout({
        receiptAmounts,
        usdgAddress: USDG,
        outTokenAddress,
        requestedTokenAddress,
        swapPathLength,
      });

      expect(
        payout && {
          token: payout.receivedTokenAddress,
          amount: payout.receivedAmount,
          isConversionFailed: payout.isConversionFailed,
          convertTo: payout.convertToTokenAddress,
        }
      ).toEqual(expected);
    }
  );
});
