import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import type { GasPaymentParams } from "domain/synthetics/express/types";
import type { TokenData, TokensData } from "domain/tokens";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { mockMarketsInfoData, mockTokensData } from "sdk/test/mock";
import { OrderType } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import { convertToUsd } from "sdk/utils/tokens";
import { getIncreasePositionAmounts } from "sdk/utils/trade/increase";

import {
  type ConfirmedUsdgOrder,
  getConvertedOrderStatus,
  getConvertedSizeFit,
  getConvertFirstPayAmount,
  getIsOrderStepGasCovered,
  getOrderAutoSubmitStep,
} from "../orderAutoSubmit";

const ready = {
  isSubmitting: false,
  isButtonLoading: false,
  isAllowanceLoaded: true,
  isButtonDisabled: false,
  isDepositButtonShown: false,
  approvalTokenAddress: undefined,
  isApprovalRequested: false,
};

const USDG = "0x004B506865409877C9fA29bfb1ebA929984B9bbC";

describe("getOrderAutoSubmitStep", () => {
  it.each([
    ["submits a ready order", {}, "submit"],
    ["waits while network fees load", { isButtonLoading: true, isButtonDisabled: true }, "wait"],
    ["waits while a submit is in flight", { isSubmitting: true }, "wait"],
    [
      "waits for the allowance before choosing between the approval and the order",
      { isAllowanceLoaded: false },
      "wait",
    ],
    ["stops on a validation error instead of sending once it clears", { isButtonDisabled: true }, "stop"],
    ["stops instead of opening the GMX Account deposit", { isDepositButtonShown: true }, "stop"],
    ["requests an approval", { approvalTokenAddress: USDG }, "approve"],
    ["doesn't ask for the same approval twice", { approvalTokenAddress: USDG, isApprovalRequested: true }, "wait"],
  ] as const)("%s", (_, overrides, expected) => {
    expect(getOrderAutoSubmitStep({ ...ready, ...overrides })).toBe(expected);
  });
});

const USDC_ADDRESS = getTokenBySymbol(ARBITRUM, "USDC").address;
const USDT_ADDRESS = getTokenBySymbol(ARBITRUM, "USDT").address;
const usd = (value: number) => expandDecimals(value, 30);
const usdc = (value: number) => BigInt(Math.round(value * 1e6));

function token(address: string, decimals: number, price: bigint, balances: { wallet?: bigint; gmxAccount?: bigint }) {
  return {
    address,
    symbol: address,
    decimals,
    prices: { minPrice: price, maxPrice: price },
    walletBalance: balances.wallet ?? 0n,
    gmxAccountBalance: balances.gmxAccount ?? 0n,
  } as unknown as TokenData;
}

function tokensData(p: { usdc?: number; usdt?: number; eth?: bigint; isGmxAccount?: boolean }): TokensData {
  const balances = (value: bigint) => (p.isGmxAccount ? { gmxAccount: value } : { wallet: value });

  return {
    [USDC_ADDRESS]: token(USDC_ADDRESS, 6, usd(1), balances(usdc(p.usdc ?? 0))),
    [USDT_ADDRESS]: token(USDT_ADDRESS, 6, usd(1), balances(usdc(p.usdt ?? 0))),
    [zeroAddress]: token(zeroAddress, 18, usd(3000), { wallet: p.eth ?? 0n }),
  };
}

function gasParams(data: TokensData, amount: bigint, tokenAddress = USDC_ADDRESS): GasPaymentParams {
  return {
    gasPaymentToken: data[tokenAddress],
    gasPaymentTokenAddress: tokenAddress,
    gasPaymentTokenAmount: amount,
    totalRelayerFeeTokenAmount: expandDecimals(1, 15),
  } as GasPaymentParams;
}

describe("getIsOrderStepGasCovered", () => {
  const check = (data: TokensData, payAmount: number, isGmxAccount = false) =>
    getIsOrderStepGasCovered({
      chainId: ARBITRUM,
      tokensData: data,
      orderGasPaymentParams: gasParams(data, usdc(1)),
      conversionGasPaymentParams: gasParams(data, usdc(1)),
      payTokenAddress: USDC_ADDRESS,
      payAmount: usdc(payAmount),
      isGmxAccount,
    });

  it("covers the order fee with USDC left after the conversion and its fee", () => {
    expect(check(tokensData({ usdc: 100 }), 98)).toBe(true);
  });

  it("isn't covered when the conversion leaves too little USDC and nothing else pays", () => {
    expect(check(tokensData({ usdc: 100 }), 99)).toBe(false);
  });

  it("is covered by another gas token the order switches to", () => {
    expect(check(tokensData({ usdc: 100, usdt: 5 }), 99)).toBe(true);
  });

  it("is covered by wallet ETH for a classic transaction", () => {
    expect(check(tokensData({ usdc: 100, eth: expandDecimals(1, 16) }), 99)).toBe(true);
  });

  it("doesn't count wallet ETH for a GMX Account order", () => {
    expect(check(tokensData({ usdc: 100, eth: expandDecimals(1, 16), isGmxAccount: true }), 99, true)).toBe(false);
  });

  it("doesn't switch the order's fee to the USDC the conversion spends", () => {
    const data = tokensData({ usdc: 100, usdt: 1.5 });

    expect(
      getIsOrderStepGasCovered({
        chainId: ARBITRUM,
        tokensData: data,
        orderGasPaymentParams: gasParams(data, usdc(1), USDT_ADDRESS),
        conversionGasPaymentParams: gasParams(data, usdc(1), USDT_ADDRESS),
        payTokenAddress: USDC_ADDRESS,
        payAmount: usdc(100),
        isGmxAccount: false,
      })
    ).toBe(false);
  });

  it("doesn't judge a classic order, which pays in ETH", () => {
    expect(
      getIsOrderStepGasCovered({
        chainId: ARBITRUM,
        tokensData: tokensData({ usdc: 100 }),
        orderGasPaymentParams: undefined,
        conversionGasPaymentParams: undefined,
        payTokenAddress: USDC_ADDRESS,
        payAmount: usdc(100),
        isGmxAccount: false,
      })
    ).toBe(true);
  });
});

describe("getConvertedOrderStatus", () => {
  const typedSize: ConfirmedUsdgOrder = { setupKey: "setup", sizeDeltaUsd: usd(11_000), sizeInputValue: "4.88888888" };
  const typedPay: ConfirmedUsdgOrder = { ...typedSize, sizeInputValue: undefined };
  const confirmed = {
    setupKey: "setup",
    sizeDeltaUsd: usd(11_000),
    sizeInputValue: "4.88888888",
    payAmount: usdc(1_137.3),
    convertedAmount: usdc(1_137.3),
  };

  it.each([
    ["sends the typed size the converted USDG pays for", typedSize, {}, "confirmed"],
    ["fits a typed size that needs more USDG than converted", typedSize, { payAmount: usdc(1_137.31) }, "marginShort"],
    ["holds a changed size input", typedSize, { sizeInputValue: "4.8853" }, "changed"],
    ["sends a size from the pay amount when it isn't larger", typedPay, { sizeDeltaUsd: usd(10_999) }, "confirmed"],
    ["sends a size from the pay amount a better fill moved up", typedPay, { sizeDeltaUsd: usd(11_010) }, "confirmed"],
    ["holds a size more than 0.1% above the confirmed one", typedPay, { sizeDeltaUsd: usd(11_012) }, "changed"],
    ["holds a size grown by the position's pending fees", typedPay, { sizeDeltaUsd: usd(11_327) }, "changed"],
    ["holds a changed price, impact, leverage or TP/SL", typedSize, { setupKey: "changed" }, "changed"],
  ] as const)("%s PRO-4531", (_, confirmedOrder, overrides, expected) => {
    expect(getConvertedOrderStatus({ ...confirmed, ...overrides, confirmedOrder })).toBe(expected);
  });
});

describe("getConvertFirstPayAmount", () => {
  it.each([
    ["converts 0.1% more than a typed size needs", usdc(2_000), usdc(1_001)],
    ["keeps the extra within the available amount", usdc(1_000.4), usdc(1_000.4)],
    ["leaves an amount over the available one as it is", usdc(900), usdc(1_000)],
  ] as const)("%s PRO-4531", (_, maxAvailableAmount, expected) => {
    expect(getConvertFirstPayAmount({ payAmount: usdc(1_000), maxAvailableAmount })).toBe(expected);
  });
});

describe("getConvertedSizeFit", () => {
  it("fits a typed size to the converted USDG PRO-4531", () => {
    const tokensData = mockTokensData();
    const marketsInfoData = mockMarketsInfoData(tokensData, ["ETH-USDC-USDC"]);
    const marketInfo = marketsInfoData["ETH-USDC-USDC"];
    const collateral = tokensData.USDC;
    const position = { pendingBorrowingFeesUsd: usd(30), fundingFeeAmount: 0n } as unknown as PositionInfo;
    const amountsFor = (indexTokenAmount: bigint) =>
      getIncreasePositionAmounts({
        marketInfo,
        indexToken: marketInfo.indexToken,
        initialCollateralToken: collateral,
        collateralToken: collateral,
        isLong: true,
        initialCollateralAmount: 0n,
        position,
        externalSwapQuote: undefined,
        indexTokenAmount,
        leverage: 100_000n,
        triggerPrice: usd(1100),
        limitOrderType: OrderType.LimitIncrease,
        userReferralInfo: undefined,
        strategy: "leverageBySize",
        findSwapPath: () => undefined,
        uiFeeFactor: 0n,
        marketsInfoData,
        chainId: ARBITRUM,
        externalSwapQuoteParams: undefined,
        isSetAcceptablePriceImpactEnabled: false,
      });

    const typed = amountsFor(expandDecimals(10, 18));
    const converted = typed.initialCollateralAmount - usdc(0.5);
    const fitted = amountsFor(
      getConvertedSizeFit({
        increaseAmounts: typed,
        convertedUsd: convertToUsd(converted, collateral.decimals, typed.initialCollateralPrice)!,
      })!
    );

    // 0.5 USDC short plus the 0.1% margin, at 10x
    expect(fitted.initialCollateralAmount).toBeLessThanOrEqual(converted - converted / 1000n);
    expect(typed.sizeDeltaUsd - fitted.sizeDeltaUsd).toBeLessThan(usd(17));
  });
});
