import { describe, expect, it } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { TokenData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { NATIVE_TOKEN_ADDRESS, getTokenBySymbol } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import {
  selectIsExternalSwapDisabledByExpressSchema,
  selectTradeboxExpressFeeTokenAddress,
} from "../tradeboxSelectors";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const USDT = getTokenBySymbol(ARBITRUM, "USDT");
const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const LINK = getTokenBySymbol(ARBITRUM, "LINK");

function tokenData(token: { address: string; symbol: string; decimals: number }, usdPrice: bigint) {
  const price = usdPrice * 10n ** 30n;
  return {
    ...token,
    name: token.symbol,
    prices: { minPrice: price, maxPrice: price },
    walletBalance: 10n ** BigInt(token.decimals),
  } as TokenData;
}

const tokensData = {
  [USDC.address]: tokenData(USDC, 1n),
  [USDT.address]: tokenData(USDT, 1n),
  [WETH.address]: tokenData(WETH, 3000n),
  [LINK.address]: tokenData(LINK, 10n),
};

// WETH -> USDC swap with USDC saved for Express fees
function createState({
  usdcAllowance,
  fromTokenAddress = WETH.address,
  toTokenAddress = USDC.address,
  usdtAllowance,
  expressFeeUsdByToken = {},
}: {
  usdcAllowance: bigint;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  usdtAllowance?: bigint;
  expressFeeUsdByToken?: Record<string, bigint>;
}): SyntheticsState {
  return {
    globals: { chainId: ARBITRUM, tokensDataResult: { tokensData } },
    settings: { expressOrdersEnabled: true, gasPaymentTokenAddress: USDC.address },
    features: { relayRouterEnabled: true, subaccountRelayRouterEnabled: true },
    subaccountState: { subaccount: undefined },
    gasPaymentTokenAllowance: {
      tokensAllowanceData: {
        [USDC.address]: usdcAllowance,
        ...(usdtAllowance !== undefined ? { [USDT.address]: usdtAllowance } : {}),
      },
    },
    tokenPermitsState: { tokenPermits: [] },
    tradebox: {
      tradeType: TradeType.Swap,
      tradeMode: TradeMode.Market,
      fromTokenAddress,
      toTokenAddress,
      isFromTokenGmxAccount: false,
      expressFeeUsdByToken,
    },
  } as unknown as SyntheticsState;
}

describe("selectTradeboxExpressFeeTokenAddress", () => {
  it("pays the fee with the pay token while the saved gas token is not approved", () => {
    expect(selectTradeboxExpressFeeTokenAddress(createState({ usdcAllowance: 0n }))).toBe(WETH.address);
  });

  it("keeps the saved gas token once it is approved", () => {
    expect(selectTradeboxExpressFeeTokenAddress(createState({ usdcAllowance: 10n ** 30n }))).toBe(USDC.address);
  });

  describe("LINK pay token with USDC saved but not approved and USDT approved", () => {
    const approvedUsdt = { usdcAllowance: 0n, usdtAllowance: 10n ** 30n, fromTokenAddress: LINK.address };
    const expressFeeUsdByToken = { [USDC.address]: 10n ** 29n }; // $0.1

    it("pays the fee with the approved USDT", () => {
      const state = createState({ ...approvedUsdt, toTokenAddress: WETH.address, expressFeeUsdByToken });

      expect(selectTradeboxExpressFeeTokenAddress(state)).toBe(USDT.address);
    });

    it("doesn't pick the swap target, which would block the external route", () => {
      const state = createState({ ...approvedUsdt, toTokenAddress: USDT.address, expressFeeUsdByToken });

      expect(selectTradeboxExpressFeeTokenAddress(state)).toBe(USDC.address);
      expect(selectIsExternalSwapDisabledByExpressSchema(state)).toBe(false);
    });
  });

  it("keeps the saved gas token when the pay token can't pay fees", () => {
    expect(
      selectTradeboxExpressFeeTokenAddress(createState({ usdcAllowance: 0n, fromTokenAddress: LINK.address }))
    ).toBe(USDC.address);
  });
});

describe("selectIsExternalSwapDisabledByExpressSchema", () => {
  it("sees no conflict when the fee is paid with the pay token instead of the saved swap-to token", () => {
    expect(selectIsExternalSwapDisabledByExpressSchema(createState({ usdcAllowance: 0n }))).toBe(false);
  });

  it("blocks the external route while the saved swap-to token pays the fee", () => {
    expect(selectIsExternalSwapDisabledByExpressSchema(createState({ usdcAllowance: 10n ** 30n }))).toBe(true);
  });

  it("sees no conflict for a native token payment, which goes Classic with no relay fee", () => {
    expect(
      selectIsExternalSwapDisabledByExpressSchema(
        createState({ usdcAllowance: 10n ** 30n, fromTokenAddress: NATIVE_TOKEN_ADDRESS })
      )
    ).toBe(false);
  });
});
