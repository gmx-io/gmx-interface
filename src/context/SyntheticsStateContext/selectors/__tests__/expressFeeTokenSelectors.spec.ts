import { describe, expect, it } from "vitest";

import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import type { TokenData } from "domain/tokens";
import { ARBITRUM } from "sdk/configs/chainIds";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import {
  selectIsExternalSwapDisabledByExpressSchema,
  selectTradeboxExpressFeeTokenAddress,
} from "../tradeboxSelectors";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
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
  [WETH.address]: tokenData(WETH, 3000n),
  [LINK.address]: tokenData(LINK, 10n),
};

// WETH -> USDC swap with USDC saved for Express fees
function createState({
  usdcAllowance,
  fromTokenAddress = WETH.address,
}: {
  usdcAllowance: bigint;
  fromTokenAddress?: string;
}): SyntheticsState {
  return {
    globals: { chainId: ARBITRUM, tokensDataResult: { tokensData } },
    settings: { expressOrdersEnabled: true, gasPaymentTokenAddress: USDC.address },
    features: { relayRouterEnabled: true, subaccountRelayRouterEnabled: true },
    subaccountState: { subaccount: undefined },
    gasPaymentTokenAllowance: { tokensAllowanceData: { [USDC.address]: usdcAllowance } },
    tokenPermitsState: { tokenPermits: [] },
    tradebox: {
      tradeType: TradeType.Swap,
      tradeMode: TradeMode.Market,
      fromTokenAddress,
      toTokenAddress: USDC.address,
      isFromTokenGmxAccount: false,
      expressFeeUsdByToken: {},
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
});
