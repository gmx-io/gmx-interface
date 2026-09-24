import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { SOURCE_BASE_MAINNET } from "config/chains";
import type { TechnicalGmFees } from "domain/synthetics/markets/technicalFees/technical-fees-types";
import type { TokenData, TokensData } from "domain/synthetics/tokens";
import { TokenBalanceType } from "domain/tokens";
import { expandDecimals } from "lib/numbers";

import { getGmNetworkFeeInfo } from "./useGmNetworkFeeDetails";

const ETH = {
  address: zeroAddress,
  symbol: "ETH",
  decimals: 18,
  isNative: true,
  prices: { minPrice: expandDecimals(2000, 30), maxPrice: expandDecimals(2000, 30) },
} as TokenData;

const USDC = {
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  symbol: "USDC",
  decimals: 6,
  isStable: true,
  prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
} as TokenData;

const tokensData: TokensData = { [zeroAddress]: ETH };

// the logical fee is a cost, so it comes in negative; the row shows it positive
const LOGICAL_FEE_USD = -expandDecimals(3, 30);

describe("getGmNetworkFeeInfo", () => {
  it("returns nothing without technical fees", () => {
    expect(
      getGmNetworkFeeInfo({
        technicalFees: undefined,
        logicalNetworkFeeUsd: LOGICAL_FEE_USD,
        srcChainId: undefined,
        tokensData,
        gasPrice: 1n,
        gasPaymentToken: USDC,
        sourceChainGasNativeAmount: undefined,
      })
    ).toBeUndefined();
  });

  describe("settlement chain wallet", () => {
    const technicalFees = {
      kind: "settlementChain",
      fees: { feeTokenAmount: expandDecimals(1, 15), gasLimit: 2_000_000n },
    } as TechnicalGmFees;

    it("adds the transaction gas to the execution fee and charges the native token from the wallet", () => {
      const info = getGmNetworkFeeInfo({
        technicalFees,
        logicalNetworkFeeUsd: LOGICAL_FEE_USD,
        srcChainId: undefined,
        tokensData,
        gasPrice: 100_000_000n,
        gasPaymentToken: USDC,
        sourceChainGasNativeAmount: undefined,
      });

      expect(info).toEqual({
        details: {
          amount: expandDecimals(1, 15) + 2_000_000n * 100_000_000n,
          usd: expandDecimals(3, 30),
          decimals: 18,
          symbol: "ETH",
        },
        source: { balanceType: TokenBalanceType.Wallet },
        isExpress: false,
      });
      expect(info!.details!.amount).toBe(1_200_000_000_000_000n);
    });

    it("keeps the wallet source while the gas price is unknown", () => {
      expect(
        getGmNetworkFeeInfo({
          technicalFees,
          logicalNetworkFeeUsd: LOGICAL_FEE_USD,
          srcChainId: undefined,
          tokensData,
          gasPrice: undefined,
          gasPaymentToken: USDC,
          sourceChainGasNativeAmount: undefined,
        })
      ).toEqual({ details: undefined, source: { balanceType: TokenBalanceType.Wallet }, isExpress: false });
    });
  });

  describe("GMX Account", () => {
    const technicalFees = {
      kind: "gmxAccount",
      fees: { relayFeeUsd: expandDecimals(3, 30) },
    } as TechnicalGmFees;

    it("converts the USD fee into the gas payment token at its max price", () => {
      const info = getGmNetworkFeeInfo({
        technicalFees,
        logicalNetworkFeeUsd: -expandDecimals(25, 29),
        srcChainId: undefined,
        tokensData,
        gasPrice: 100_000_000n,
        gasPaymentToken: USDC,
        sourceChainGasNativeAmount: undefined,
      });

      expect(info).toEqual({
        details: {
          amount: 2_500_000n,
          usd: expandDecimals(25, 29),
          decimals: 6,
          symbol: "USDC",
          isStable: true,
        },
        source: { balanceType: TokenBalanceType.GmxAccount },
        isExpress: true,
      });
    });

    it("uses the token price, not a stable assumption", () => {
      const weth = {
        ...ETH,
        address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        symbol: "WETH",
        isNative: false,
      } as TokenData;

      const info = getGmNetworkFeeInfo({
        technicalFees,
        logicalNetworkFeeUsd: -expandDecimals(4, 30),
        srcChainId: undefined,
        tokensData,
        gasPrice: undefined,
        gasPaymentToken: weth,
        sourceChainGasNativeAmount: undefined,
      });

      expect(info!.details).toEqual({
        amount: expandDecimals(2, 15),
        usd: expandDecimals(4, 30),
        decimals: 18,
        symbol: "WETH",
        isStable: undefined,
      });
    });

    it("keeps the GMX Account source while the gas payment token is unknown", () => {
      expect(
        getGmNetworkFeeInfo({
          technicalFees,
          logicalNetworkFeeUsd: LOGICAL_FEE_USD,
          srcChainId: undefined,
          tokensData,
          gasPrice: undefined,
          gasPaymentToken: undefined,
          sourceChainGasNativeAmount: undefined,
        })
      ).toEqual({ details: undefined, source: { balanceType: TokenBalanceType.GmxAccount }, isExpress: true });
    });
  });

  describe("source chain wallet", () => {
    const technicalFees = {
      kind: "sourceChain",
      fees: { txnEstimatedGasLimit: 500_000n, txnEstimatedNativeFee: expandDecimals(5, 14) },
    } as TechnicalGmFees;

    it("adds the source chain transaction gas to the bridge fee in the source chain native token", () => {
      const info = getGmNetworkFeeInfo({
        technicalFees,
        logicalNetworkFeeUsd: LOGICAL_FEE_USD,
        srcChainId: SOURCE_BASE_MAINNET,
        tokensData,
        gasPrice: 100_000_000n,
        gasPaymentToken: USDC,
        sourceChainGasNativeAmount: expandDecimals(1, 14),
      });

      expect(info).toEqual({
        details: {
          amount: expandDecimals(6, 14),
          usd: expandDecimals(3, 30),
          decimals: 18,
          symbol: "ETH",
        },
        source: { balanceType: TokenBalanceType.SourceChain, chainId: SOURCE_BASE_MAINNET },
        isExpress: false,
      });
    });

    it("keeps the source chain wallet while its gas price is unknown", () => {
      expect(
        getGmNetworkFeeInfo({
          technicalFees,
          logicalNetworkFeeUsd: LOGICAL_FEE_USD,
          srcChainId: SOURCE_BASE_MAINNET,
          tokensData,
          gasPrice: undefined,
          gasPaymentToken: undefined,
          sourceChainGasNativeAmount: undefined,
        })
      ).toEqual({
        details: undefined,
        source: { balanceType: TokenBalanceType.SourceChain, chainId: SOURCE_BASE_MAINNET },
        isExpress: false,
      });
    });

    it("returns nothing without a source chain", () => {
      expect(
        getGmNetworkFeeInfo({
          technicalFees,
          logicalNetworkFeeUsd: LOGICAL_FEE_USD,
          srcChainId: undefined,
          tokensData,
          gasPrice: undefined,
          gasPaymentToken: undefined,
          sourceChainGasNativeAmount: expandDecimals(1, 14),
        })
      ).toBeUndefined();
    });
  });
});
