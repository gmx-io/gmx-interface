import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { GlobalExpressParams } from "domain/synthetics/express";
import { MOCK_GAS_LIMITS, MOCK_GAS_PRICE } from "domain/testUtils/mockChainData";
import { MOCK_MARKET_ADDRESS } from "domain/testUtils/mockMarketInfo";
import { ETH_ADDRESS, ETH_TOKEN, USDC_ADDRESS, USDC_TOKEN } from "domain/testUtils/mockTokens";
import { expandDecimals } from "lib/numbers";
import { convertToTokenAmount } from "sdk/utils/tokens";
import type { FindSwapPath } from "sdk/utils/trade/types";

import { getArbitraryRelayParamsAndPayload } from "./arbitraryRelayParams";

const ACCOUNT = "0x1234567890123456789012345678901234567890";

// USDC → WETH fee swap quoted 1:1 in USD: the fee in USDC equals the relayer fee in USD
const findFeeSwapPath: FindSwapPath = (usdIn) => ({
  swapPath: [MOCK_MARKET_ADDRESS],
  swapSteps: [],
  totalSwapPriceImpactDeltaUsd: 0n,
  totalSwapFeeUsd: 0n,
  totalFeesDeltaUsd: 0n,
  tokenInAddress: USDC_ADDRESS,
  tokenOutAddress: ETH_ADDRESS,
  usdOut: usdIn,
  amountOut: convertToTokenAmount(usdIn, ETH_TOKEN.decimals, ETH_TOKEN.prices.maxPrice)!,
});

function buildGlobalExpressParams(gmxAccountUsdcBalance: bigint): GlobalExpressParams {
  const gasPaymentToken = { ...USDC_TOKEN, gmxAccountBalance: gmxAccountUsdcBalance };
  const relayerFeeToken = { ...ETH_TOKEN, gmxAccountBalance: 0n };

  return {
    chainId: ARBITRUM,
    gasLimits: MOCK_GAS_LIMITS,
    gasPrice: MOCK_GAS_PRICE,
    tokensData: { [USDC_ADDRESS]: gasPaymentToken, [ETH_ADDRESS]: relayerFeeToken },
    marketsInfoData: {},
    gasPaymentTokenAddress: USDC_ADDRESS,
    relayerFeeTokenAddress: ETH_ADDRESS,
    gasPaymentToken,
    relayerFeeToken,
    tokenPermits: [],
    l1Reference: undefined,
    bufferBps: 3000,
    findFeeSwapPath,
    gasPaymentAllowanceData: {},
  };
}

describe("getArbitraryRelayParamsAndPayload", () => {
  it.each([
    { gmxAccountUsdc: 12_510_000n, isOutGasTokenBalance: false },
    { gmxAccountUsdc: 200_000n, isOutGasTokenBalance: true },
  ])(
    "checks the GMX Account balance against the fee in the gas payment token, not the relayer fee in WETH (balance $gmxAccountUsdc)",
    ({ gmxAccountUsdc, isOutGasTokenBalance }) => {
      const { relayFeeParams, gasPaymentValidations } = getArbitraryRelayParamsAndPayload({
        chainId: ARBITRUM,
        account: ACCOUNT,
        isGmxAccount: true,
        relayerFeeAmount: expandDecimals(1, 14), // 0.0001 WETH = $0.2 at the mock price
        globalExpressParams: buildGlobalExpressParams(gmxAccountUsdc),
        subaccount: undefined,
      });

      expect(relayFeeParams?.gasPaymentParams.gasPaymentTokenAmount).toBe(200_000n); // 0.2 USDC
      expect(gasPaymentValidations).toMatchObject({ isGasPaymentTokenBalanceLoaded: true, isOutGasTokenBalance });
    }
  );
});
