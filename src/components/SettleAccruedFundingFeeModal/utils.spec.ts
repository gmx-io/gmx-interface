import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { ExpressTxnParams, GasPaymentParams, GasPaymentValidations } from "domain/synthetics/express";
import type { TokensData } from "domain/synthetics/tokens";
import { createMockMarketInfo } from "domain/testUtils/mockMarketInfo";
import { createMockPositionInfo } from "domain/testUtils/mockPositionInfo";
import { DEFAULT_MOCK_TOKENS_DATA } from "domain/testUtils/MockSyntheticsStateProvider";
import { ETH_ADDRESS, NATIVE_ETH_ADDRESS, USDC_ADDRESS } from "domain/testUtils/mockTokens";
import { expandDecimals, PRECISION } from "lib/numbers";
import type { PositionInfo } from "sdk/utils/positions/types";

import {
  getCanPayNetworkFeeFromBalance,
  getIsPositionSettleable,
  getSettlementBlockReason,
  getShouldSwitchNetworkFeeSource,
  shouldPreSelectPosition,
} from "./utils";

const ACCOUNT = "0x1234567890123456789012345678901234567890";

// 2% min collateral factor: a $50,000 position needs $1,000 of margin to stay open
const MARKET_INFO = createMockMarketInfo(undefined, { minCollateralFactor: (PRECISION * 2n) / 100n });

const SIZE_IN_USD = expandDecimals(50000, 30);

// MIN_COLLATERAL_USD on Arbitrum and Avalanche: the absolute floor, independent of the position size
const MIN_COLLATERAL_USD = expandDecimals(1, 30);

function createPosition(overrides: Partial<PositionInfo> = {}): PositionInfo {
  const position = createMockPositionInfo({
    account: ACCOUNT,
    marketInfo: MARKET_INFO,
    sizeInUsd: SIZE_IN_USD,
    sizeInTokens: expandDecimals(25, 18),
    collateralUsd: expandDecimals(5000, 30),
  });

  return { ...position, ...overrides };
}

describe("getSettlementBlockReason", () => {
  it("does not block a position with margin above the min collateral for its size", () => {
    expect(getSettlementBlockReason(createPosition(), MIN_COLLATERAL_USD)).toBeUndefined();
  });

  it("blocks a position whose margin is below the min collateral for its size", () => {
    const position = createPosition({
      collateralUsd: expandDecimals(900, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
  });

  it("does not block a position just above the min collateral for its size", () => {
    const position = createPosition({
      collateralUsd: expandDecimals(1100, 30),
      remainingCollateralUsd: expandDecimals(1100, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBeUndefined();
  });

  it("counts pending fees and unrealized pnl into the margin", () => {
    const withLosses = createPosition({
      remainingCollateralUsd: expandDecimals(1100, 30),
      pnl: -expandDecimals(300, 30),
    });
    const withProfit = createPosition({
      remainingCollateralUsd: expandDecimals(900, 30),
      pnl: expandDecimals(300, 30),
    });

    expect(getSettlementBlockReason(withLosses, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason(withProfit, MIN_COLLATERAL_USD)).toBeUndefined();
  });

  it("counts the closing fee into the margin", () => {
    const position = createPosition({
      remainingCollateralUsd: expandDecimals(1100, 30),
      closingFeeUsd: expandDecimals(200, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
  });

  it("blocks a position whose collateral alone is below the min collateral for its size, even in profit", () => {
    const position = createPosition({
      collateralAmount: expandDecimals(900, 6),
      collateralUsd: expandDecimals(900, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
      pnl: expandDecimals(300, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
  });

  it("blocks a position whose collateral is exactly the min collateral, since the settlement withdraws 1 wei", () => {
    const exact = createPosition({
      collateralAmount: expandDecimals(1000, 6),
      collateralUsd: expandDecimals(1000, 30),
      remainingCollateralUsd: expandDecimals(1000, 30),
      pnl: expandDecimals(300, 30),
    });
    const oneWeiAbove = { ...exact, collateralAmount: expandDecimals(1000, 6) + 1n };

    expect(getSettlementBlockReason(exact, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason(oneWeiAbove, MIN_COLLATERAL_USD)).toBeUndefined();
  });

  it("holds the collateral to the open-interest-based min collateral factor when it is stricter than the market's", () => {
    // 4e-8 per dollar of long open interest: $1,000,000 on the long side makes the factor 4%, above the market's 2%
    const marketInfo = createMockMarketInfo(undefined, {
      minCollateralFactor: (PRECISION * 2n) / 100n,
      minCollateralFactorForOpenInterestLong: (PRECISION * 4n) / 100n / 1_000_000n,
      longInterestUsd: expandDecimals(1_000_000, 30),
    });
    const position = createPosition({
      marketInfo,
      collateralAmount: expandDecimals(1500, 6),
      collateralUsd: expandDecimals(1500, 30),
      remainingCollateralUsd: expandDecimals(1500, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason({ ...position, marketInfo: MARKET_INFO }, MIN_COLLATERAL_USD)).toBeUndefined();
  });

  it("blocks a position whose collateral and pnl together fall below the absolute min collateral", () => {
    // $10 long with $2 of collateral: the leverage floor is $0.20, so only the $1 absolute minimum can block it
    const position = createPosition({
      sizeInUsd: expandDecimals(10, 30),
      sizeInTokens: expandDecimals(5, 15),
      collateralAmount: expandDecimals(2, 6),
      collateralUsd: expandDecimals(2, 30),
      remainingCollateralUsd: expandDecimals(2, 30),
      pnl: -expandDecimals(15, 29),
    });
    const smallerLoss = { ...position, pnl: -expandDecimals(5, 29) };

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("belowMinCollateral");
    expect(getSettlementBlockReason(smallerLoss, MIN_COLLATERAL_USD)).toBeUndefined();
    expect(getSettlementBlockReason(position, undefined)).toBeUndefined();
  });

  it("blocks a position with a negative margin after pending fees", () => {
    const position = createPosition({
      remainingCollateralUsd: -expandDecimals(10, 30),
      pnl: expandDecimals(5000, 30),
    });

    expect(getSettlementBlockReason(position, MIN_COLLATERAL_USD)).toBe("negativeMargin");
  });
});

describe("getIsPositionSettleable", () => {
  it("is false for a blocked position and for a disabled market", () => {
    const disabledMarketPosition = createPosition({
      marketInfo: createMockMarketInfo(undefined, { isDisabled: true }),
    });
    const blockedPosition = createPosition({
      remainingCollateralUsd: expandDecimals(900, 30),
    });

    expect(getIsPositionSettleable(createPosition(), MIN_COLLATERAL_USD)).toBe(true);
    expect(getIsPositionSettleable(disabledMarketPosition, MIN_COLLATERAL_USD)).toBe(false);
    expect(getIsPositionSettleable(blockedPosition, MIN_COLLATERAL_USD)).toBe(false);
  });
});

describe("shouldPreSelectPosition", () => {
  const networkFee = expandDecimals(1, 30);

  it("pre-selects a healthy position whose accrued funding covers the network fee", () => {
    const position = createPosition({ pendingClaimableFundingFeesUsd: expandDecimals(20, 30) });

    expect(shouldPreSelectPosition(position, networkFee, MIN_COLLATERAL_USD)).toBe(true);
  });

  it("does not pre-select a blocked position however large its accrued funding", () => {
    const belowMinCollateral = createPosition({
      pendingClaimableFundingFeesUsd: expandDecimals(20, 30),
      remainingCollateralUsd: expandDecimals(900, 30),
    });
    const negativeMargin = createPosition({
      pendingClaimableFundingFeesUsd: expandDecimals(20, 30),
      remainingCollateralUsd: -expandDecimals(10, 30),
    });

    expect(shouldPreSelectPosition(belowMinCollateral, networkFee, MIN_COLLATERAL_USD)).toBe(false);
    expect(shouldPreSelectPosition(negativeMargin, networkFee, MIN_COLLATERAL_USD)).toBe(false);
  });
});

type BalanceSymbol = "USDC" | "WETH" | "ETH";

const BALANCE_ADDRESSES: Record<BalanceSymbol, string> = {
  USDC: USDC_ADDRESS,
  WETH: ETH_ADDRESS,
  ETH: NATIVE_ETH_ADDRESS,
};

// the fee is 1 USDC ($1): USDC needs 1.3 USDC with the buffer, WETH ($2000) needs 0.00065 WETH
const FEE_USDC = expandDecimals(1, 6);
const ENOUGH_USDC = expandDecimals(2, 6);
const SHORT_USDC = expandDecimals(1, 6);
const ENOUGH_WETH = expandDecimals(1, 15);
const RELAYER_FEE_ETH = expandDecimals(1, 15);
const HUGE_ETH = expandDecimals(1, 18);

/** Balances not listed stay `undefined`, i.e. not loaded. */
function createTokensData({
  wallet = {},
  gmxAccount = {},
}: {
  wallet?: Partial<Record<BalanceSymbol, bigint>>;
  gmxAccount?: Partial<Record<BalanceSymbol, bigint>>;
}): TokensData {
  return Object.fromEntries(
    (Object.keys(BALANCE_ADDRESSES) as BalanceSymbol[]).map((symbol) => {
      const address = BALANCE_ADDRESSES[symbol];

      return [
        address,
        { ...DEFAULT_MOCK_TOKENS_DATA[address], walletBalance: wallet[symbol], gmxAccountBalance: gmxAccount[symbol] },
      ];
    })
  );
}

const EMPTY_WALLET = { USDC: 0n, WETH: 0n, ETH: 0n };
const EMPTY_GMX_ACCOUNT = { USDC: 0n, WETH: 0n };

const GAS_PAYMENT_PARAMS = {
  gasPaymentToken: DEFAULT_MOCK_TOKENS_DATA[USDC_ADDRESS],
  gasPaymentTokenAddress: USDC_ADDRESS,
  gasPaymentTokenAmount: FEE_USDC,
  totalRelayerFeeTokenAmount: RELAYER_FEE_ETH,
} as GasPaymentParams;

const OUT_OF_BALANCE: GasPaymentValidations = {
  isGasPaymentTokenBalanceLoaded: true,
  isOutGasTokenBalance: true,
  needGasPaymentTokenApproval: false,
  isValid: false,
};

function createExpressParams(
  isGmxAccount: boolean,
  gasPaymentValidations: GasPaymentValidations = OUT_OF_BALANCE
): ExpressTxnParams {
  return { isGmxAccount, gasPaymentParams: GAS_PAYMENT_PARAMS, gasPaymentValidations } as ExpressTxnParams;
}

function canPay(tokensData: TokensData, isGmxAccount: boolean) {
  return getCanPayNetworkFeeFromBalance({
    chainId: ARBITRUM,
    tokensData,
    gasPaymentParams: GAS_PAYMENT_PARAMS,
    isGmxAccount,
  });
}

function shouldSwitch(tokensData: TokensData, expressParams: ExpressTxnParams) {
  return getShouldSwitchNetworkFeeSource({ chainId: ARBITRUM, tokensData, expressParams });
}

describe("getCanPayNetworkFeeFromBalance", () => {
  it("accepts a wallet where another gas token covers the fee with the 1.3x buffer even if the selected one is short", () => {
    const tokensData = createTokensData({ wallet: { USDC: SHORT_USDC, WETH: ENOUGH_WETH, ETH: 0n } });

    expect(canPay(tokensData, false)).toBe(true);
  });

  it("converts the fee into the other gas token through USD and requires the 1.3x buffer on top", () => {
    // $1 fee at $2000 per WETH: 0.0005 WETH, 0.00065 WETH with the buffer
    const bufferedFeeWeth = expandDecimals(65, 13);
    const belowBuffer = createTokensData({ wallet: { USDC: 0n, WETH: bufferedFeeWeth - 1n, ETH: 0n } });
    const atBuffer = createTokensData({ wallet: { USDC: 0n, WETH: bufferedFeeWeth, ETH: 0n } });

    expect(canPay(belowBuffer, false)).toBe(false);
    expect(canPay(atBuffer, false)).toBe(true);
  });

  it("does not count native ETH in the wallet as a gas token", () => {
    const tokensData = createTokensData({ wallet: { ...EMPTY_WALLET, ETH: HUGE_ETH } });

    expect(canPay(tokensData, false)).toBe(false);
  });

  it("accepts a GMX Account holding enough of a gas token", () => {
    const tokensData = createTokensData({ gmxAccount: { USDC: 0n, WETH: ENOUGH_WETH } });

    expect(canPay(tokensData, true)).toBe(true);
  });

  it("rejects a GMX Account whose balances are not loaded", () => {
    const tokensData = createTokensData({ wallet: { USDC: ENOUGH_USDC } });

    expect(canPay(tokensData, true)).toBe(false);
  });
});

describe("getShouldSwitchNetworkFeeSource", () => {
  it("keeps the source while the shortfall is not confirmed or the balance is enough", () => {
    const tokensData = createTokensData({ wallet: EMPTY_WALLET, gmxAccount: { USDC: ENOUGH_USDC } });
    const notLoaded = createExpressParams(false, { ...OUT_OF_BALANCE, isGasPaymentTokenBalanceLoaded: false });
    const enough = createExpressParams(false, { ...OUT_OF_BALANCE, isOutGasTokenBalance: false, isValid: true });

    expect(shouldSwitch(tokensData, notLoaded)).toBe(false);
    expect(shouldSwitch(tokensData, enough)).toBe(false);
  });

  it("moves from an empty wallet to a GMX Account that holds a gas token", () => {
    const tokensData = createTokensData({ wallet: EMPTY_WALLET, gmxAccount: { USDC: ENOUGH_USDC, WETH: 0n } });

    expect(shouldSwitch(tokensData, createExpressParams(false))).toBe(true);
  });

  it("keeps the wallet when it only holds ETH and the GMX Account is empty: the wallet transaction is the fallback", () => {
    const tokensData = createTokensData({ wallet: { ...EMPTY_WALLET, ETH: HUGE_ETH }, gmxAccount: EMPTY_GMX_ACCOUNT });

    expect(shouldSwitch(tokensData, createExpressParams(false))).toBe(false);
  });

  it("keeps the wallet when another wallet gas token can pay: that is a token switch, not a source switch", () => {
    const tokensData = createTokensData({
      wallet: { USDC: SHORT_USDC, WETH: ENOUGH_WETH, ETH: 0n },
      gmxAccount: { USDC: ENOUGH_USDC, WETH: 0n },
    });

    expect(shouldSwitch(tokensData, createExpressParams(false))).toBe(false);
  });

  it("moves from an empty GMX Account to a wallet that holds a gas token", () => {
    const tokensData = createTokensData({
      wallet: { USDC: 0n, WETH: ENOUGH_WETH, ETH: 0n },
      gmxAccount: EMPTY_GMX_ACCOUNT,
    });

    expect(shouldSwitch(tokensData, createExpressParams(true))).toBe(true);
  });

  it("moves from an empty GMX Account to a wallet that only holds enough ETH for a wallet transaction", () => {
    const tokensData = createTokensData({
      wallet: { ...EMPTY_WALLET, ETH: RELAYER_FEE_ETH },
      gmxAccount: EMPTY_GMX_ACCOUNT,
    });

    expect(shouldSwitch(tokensData, createExpressParams(true))).toBe(true);
  });

  it("keeps the GMX Account when the wallet has neither a gas token nor enough ETH", () => {
    const tokensData = createTokensData({
      wallet: { ...EMPTY_WALLET, ETH: RELAYER_FEE_ETH - 1n },
      gmxAccount: EMPTY_GMX_ACCOUNT,
    });

    expect(shouldSwitch(tokensData, createExpressParams(true))).toBe(false);
  });

  it("prefers Express from the GMX Account over a wallet transaction when the wallet only holds ETH", () => {
    const tokensData = createTokensData({
      wallet: { ...EMPTY_WALLET, ETH: HUGE_ETH },
      gmxAccount: { USDC: 0n, WETH: ENOUGH_WETH },
    });

    expect(shouldSwitch(tokensData, createExpressParams(false))).toBe(true);
  });
});
