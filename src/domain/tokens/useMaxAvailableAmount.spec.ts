import { describe, expect, it } from "vitest";

import { getNetworkFeeSource, getSourceChainNetworkFeeSource } from "domain/synthetics/fees/networkFeeSource";
import { ARBITRUM, MEGAETH, SOURCE_BASE_MAINNET } from "sdk/configs/chainIds";
import { getTokenBySymbol, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { expandDecimals, formatAmountFree, parseValue } from "sdk/utils/numbers";
import type { TokenData } from "sdk/utils/tokens/types";

import {
  getInsufficientFeeTooltip,
  getMaxActionSelection,
  getMaxActionsHint,
  getMaxAvailableTokenAmount,
  shouldShowGasPaymentTokenWarning,
} from "./useMaxAvailableAmount";

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const USDC_UNIT = 10n ** 6n;
const ETH_UNIT = 10n ** 18n;

function usdc(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}

function eth(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000)) * 10n ** 12n;
}

const USDC_DATA = {
  ...USDC,
  prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
} satisfies TokenData;

const ETH_DATA = {
  ...WETH,
  address: NATIVE_TOKEN_ADDRESS,
  symbol: "ETH",
  isNative: true,
  isWrapped: false,
  prices: { minPrice: expandDecimals(2000, 30), maxPrice: expandDecimals(2000, 30) },
} satisfies TokenData;

const WETH_DATA = {
  ...WETH,
  prices: { minPrice: expandDecimals(2000, 30), maxPrice: expandDecimals(2000, 30) },
} satisfies TokenData;

function usdcFeeCase(balance: bigint, fee: bigint = USDC_UNIT) {
  return getMaxAvailableTokenAmount({
    chainId: ARBITRUM,
    fromTokenAddress: USDC.address,
    fromTokenBalance: balance,
    feeToken: USDC_DATA,
    feeTokenAmount: fee,
    fallbackFeeTokenAmount: undefined,
    reserveToken: USDC_DATA,
  });
}

describe("getMaxAvailableTokenAmount", () => {
  describe("same-source USDC fee of 1 USDC with a USDC reserve (ticket table)", () => {
    it("62.03 USDC: Max holds back the fee + 40 %, Keep gas holds back the $20 reserve on top", () => {
      expect(usdcFeeCase(usdc(62.03))).toEqual({
        maxAvailableAmount: usdc(60.63),
        keepGasAmount: usdc(40.63),
        feeHoldbackAmount: usdc(1.4),
        reserveAmount: usdc(20),
        isFeeLoading: false,
        isFeeUnavailable: false,
        isInsufficientForFee: false,
      });
    });

    it("15 USDC: Max fills 13.60, Keep gas is hidden because 13.60 - 20 < 0", () => {
      const details = usdcFeeCase(usdc(15));
      expect(details.maxAvailableAmount).toBe(usdc(13.6));
      expect(details.keepGasAmount).toBeUndefined();
      expect(details.isInsufficientForFee).toBe(false);
    });

    it("1 USDC: the balance cannot cover the fee holdback, Max is the only blocking state (FEDEV-2513)", () => {
      const details = usdcFeeCase(usdc(1));
      expect(details.isInsufficientForFee).toBe(true);
      expect(details.maxAvailableAmount).toBe(0n);
      expect(details.keepGasAmount).toBeUndefined();
    });

    it("1.40 USDC: a balance that only covers the holdback leaves nothing to fill, Max is disabled", () => {
      const details = usdcFeeCase(usdc(1.4));
      expect(details.isInsufficientForFee).toBe(true);
      expect(details.maxAvailableAmount).toBe(0n);
    });

    it("1.400001 USDC: one unit above the holdback is a positive fill, Max is enabled", () => {
      const details = usdcFeeCase(usdc(1.4) + 1n);
      expect(details.isInsufficientForFee).toBe(false);
      expect(details.maxAvailableAmount).toBe(1n);
    });
  });

  it("fee paid from another token does not reduce Max, the reserve still scales from it", () => {
    const details = getMaxAvailableTokenAmount({
      chainId: ARBITRUM,
      fromTokenAddress: USDC.address,
      fromTokenBalance: usdc(10),
      feeToken: ETH_DATA,
      feeTokenAmount: eth(0.0007),
      fallbackFeeTokenAmount: undefined,
      reserveToken: USDC_DATA,
    });

    expect(details.maxAvailableAmount).toBe(usdc(10));
    expect(details.feeHoldbackAmount).toBe(0n);
    expect(details.keepGasAmount).toBeUndefined();
    expect(details.reserveAmount).toBe(usdc(28));
    expect(details.isFeeLoading).toBe(false);
  });

  describe("repeated clicks with unchanged inputs fill identical values (FEDEV-3593)", () => {
    // the UI fills `formatAmountFree(amount)` and parses it back: a lossy round trip would move the
    // second fill and drop the selected state, so both fills must survive it exactly
    function roundTrip(amount: bigint, decimals: number): bigint {
      return parseValue(formatAmountFree(amount, decimals), decimals)!;
    }

    it("USDC fills round-trip through the input and re-select their action", () => {
      const details = usdcFeeCase(usdc(62.03), 1_234_567n);
      const max = roundTrip(details.maxAvailableAmount, USDC.decimals);
      const keepGas = roundTrip(details.keepGasAmount!, USDC.decimals);

      expect(max).toBe(details.maxAvailableAmount);
      expect(keepGas).toBe(details.keepGasAmount);
      expect(getMaxActionSelection({ fromTokenAmount: max, fromTokenBalance: usdc(62.03), ...details })).toBe("max");
      expect(getMaxActionSelection({ fromTokenAmount: keepGas, fromTokenBalance: usdc(62.03), ...details })).toBe(
        "keepGas"
      );
    });

    it("an 18-decimal ETH fill with an odd fee round-trips through the input", () => {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: NATIVE_TOKEN_ADDRESS,
        fromTokenBalance: eth(10),
        feeToken: ETH_DATA,
        feeTokenAmount: 123_456_789_012_345n,
        fallbackFeeTokenAmount: undefined,
        reserveToken: undefined,
      });
      const max = roundTrip(details.maxAvailableAmount, 18);

      expect(max).toBe(details.maxAvailableAmount);
      expect(getMaxActionSelection({ fromTokenAmount: max, fromTokenBalance: eth(10), ...details })).toBe("max");
    });
  });

  describe("same-chain GMX Account withdrawal: no fee token, USDC reserve (DoD 4)", () => {
    function sameChainWithdrawal(balance: bigint) {
      return getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: balance,
        feeToken: undefined,
        feeTokenAmount: undefined,
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
      });
    }

    it("62.03 USDC: Max is the full balance, Keep gas keeps the $20 minimum reserve", () => {
      const details = sameChainWithdrawal(usdc(62.03));
      expect(details.maxAvailableAmount).toBe(usdc(62.03));
      expect(details.keepGasAmount).toBe(usdc(42.03));
      expect(details.feeHoldbackAmount).toBe(0n);
      expect(details.isFeeLoading).toBe(false);
    });

    it("10 USDC: Max is the full balance, Keep gas is hidden", () => {
      const details = sameChainWithdrawal(usdc(10));
      expect(details.maxAvailableAmount).toBe(usdc(10));
      expect(details.keepGasAmount).toBeUndefined();
    });
  });

  describe("reserve is computed in USD across tokens", () => {
    function ethFeeUsdcReserve(feeTokenAmount: bigint) {
      return getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(1000),
        feeToken: ETH_DATA,
        feeTokenAmount,
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
      });
    }

    it("0.0007 ETH ($1.40) fee scales the USDC reserve to 20 x fee = $28", () => {
      expect(ethFeeUsdcReserve(eth(0.0007)).reserveAmount).toBe(usdc(28));
    });

    it("0.003 ETH ($6) fee clamps the reserve to the $40 maximum", () => {
      expect(ethFeeUsdcReserve(eth(0.003)).reserveAmount).toBe(usdc(40));
    });

    it("zero fee clamps the reserve to the $20 minimum", () => {
      expect(ethFeeUsdcReserve(0n).reserveAmount).toBe(usdc(20));
    });
  });

  describe("per-chain residual policy (MegaETH $1-$2)", () => {
    function megaEth(feeTokenAmount: bigint) {
      return getMaxAvailableTokenAmount({
        chainId: MEGAETH,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(1000),
        feeToken: USDC_DATA,
        feeTokenAmount,
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
      });
    }

    it("zero fee keeps the $1 minimum", () => {
      expect(megaEth(0n).reserveAmount).toBe(usdc(1));
    });

    it("$1 fee clamps to the $2 maximum", () => {
      expect(megaEth(usdc(1)).reserveAmount).toBe(usdc(2));
    });
  });

  describe("native ETH and wrap/unwrap (FEDEV-3514)", () => {
    it("paying with native ETH holds back the ETH fee + 40 % and offers no Keep gas for a USDC reserve", () => {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: NATIVE_TOKEN_ADDRESS,
        fromTokenBalance: eth(10),
        feeToken: ETH_DATA,
        feeTokenAmount: eth(0.001),
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
      });

      expect(details.maxAvailableAmount).toBe(eth(10) - eth(0.0014));
      expect(details.feeHoldbackAmount).toBe(eth(0.0014));
      expect(details.keepGasAmount).toBeUndefined();
      expect(details.reserveAmount).toBeUndefined();
    });

    it("WETH -> ETH unwrap pays the fee in ETH, so Max is the whole WETH balance", () => {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: WETH.address,
        fromTokenBalance: 3n * ETH_UNIT,
        feeToken: ETH_DATA,
        feeTokenAmount: eth(0.001),
        fallbackFeeTokenAmount: undefined,
        reserveToken: undefined,
      });

      expect(details.maxAvailableAmount).toBe(3n * ETH_UNIT);
      expect(details.feeHoldbackAmount).toBe(0n);
      expect(details.isFeeLoading).toBe(false);
    });
  });

  describe("unknown fee", () => {
    function sameSourceFee(feeTokenAmount: bigint | undefined, fallbackFeeTokenAmount: bigint | undefined) {
      return getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(100),
        feeToken: USDC_DATA,
        feeTokenAmount,
        fallbackFeeTokenAmount,
        reserveToken: USDC_DATA,
      });
    }

    it("same-source fee without any estimate is loading", () => {
      const details = sameSourceFee(undefined, undefined);
      expect(details.isFeeLoading).toBe(true);
      expect(details.maxAvailableAmount).toBe(0n);
      expect(details.keepGasAmount).toBeUndefined();
      expect(details.isInsufficientForFee).toBe(false);
    });

    it("a failed estimate without any fee to fall back on is unavailable, not loading forever", () => {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(100),
        feeToken: USDC_DATA,
        feeTokenAmount: undefined,
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
        isFeeEstimationFailed: true,
      });

      expect(details.isFeeLoading).toBe(false);
      expect(details.isFeeUnavailable).toBe(true);
      expect(details.maxAvailableAmount).toBe(0n);
      expect(details.keepGasAmount).toBeUndefined();
    });

    it("a zero estimate falls back to the lower-bound fee", () => {
      expect(sameSourceFee(0n, usdc(1)).feeHoldbackAmount).toBe(usdc(1.4));
    });

    it("a positive estimate wins over the fallback", () => {
      expect(sameSourceFee(usdc(2), usdc(1)).feeHoldbackAmount).toBe(usdc(2.8));
    });

    it("a known zero fee without a fallback holds back nothing", () => {
      const details = sameSourceFee(0n, undefined);
      expect(details.isFeeLoading).toBe(false);
      expect(details.maxAvailableAmount).toBe(usdc(100));
    });

    it("an unknown fee from another source is not loading and Max is the full balance", () => {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(100),
        feeToken: ETH_DATA,
        feeTokenAmount: undefined,
        fallbackFeeTokenAmount: undefined,
        reserveToken: undefined,
      });

      expect(details.isFeeLoading).toBe(false);
      expect(details.maxAvailableAmount).toBe(usdc(100));
    });
  });

  it("no reserve token or a reserve token other than the field token hides Keep gas", () => {
    for (const reserveToken of [undefined, WETH_DATA]) {
      const details = getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: usdc(10_000),
        feeToken: USDC_DATA,
        feeTokenAmount: usdc(1),
        fallbackFeeTokenAmount: undefined,
        reserveToken,
      });

      expect(details.keepGasAmount).toBeUndefined();
      expect(details.reserveAmount).toBeUndefined();
      expect(details.maxAvailableAmount).toBe(usdc(9_998.6));
    }
  });

  it("an unknown balance yields zeros without loading", () => {
    expect(
      getMaxAvailableTokenAmount({
        chainId: ARBITRUM,
        fromTokenAddress: USDC.address,
        fromTokenBalance: undefined,
        feeToken: USDC_DATA,
        feeTokenAmount: undefined,
        fallbackFeeTokenAmount: undefined,
        reserveToken: USDC_DATA,
      })
    ).toEqual({
      maxAvailableAmount: 0n,
      keepGasAmount: undefined,
      feeHoldbackAmount: 0n,
      reserveAmount: undefined,
      isFeeLoading: false,
      isFeeUnavailable: false,
      isInsufficientForFee: false,
    });
  });
});

describe("getMaxActionSelection", () => {
  const fromTokenBalance = usdc(62.03);
  const maxAvailableAmount = usdc(60.63);
  const keepGasAmount = usdc(40.63);

  it("selects Max on an exact match", () => {
    expect(
      getMaxActionSelection({
        fromTokenAmount: maxAvailableAmount,
        fromTokenBalance,
        maxAvailableAmount,
        keepGasAmount,
      })
    ).toBe("max");
  });

  it("selects Keep gas on an exact match", () => {
    expect(
      getMaxActionSelection({ fromTokenAmount: keepGasAmount, fromTokenBalance, maxAvailableAmount, keepGasAmount })
    ).toBe("keepGas");
  });

  it("selects nothing between the two fills", () => {
    expect(
      getMaxActionSelection({ fromTokenAmount: usdc(50), fromTokenBalance, maxAvailableAmount, keepGasAmount })
    ).toBeUndefined();
  });

  it("selects nothing when Max is zero and the input is empty", () => {
    expect(
      getMaxActionSelection({
        fromTokenAmount: 0n,
        fromTokenBalance: 0n,
        maxAvailableAmount: 0n,
        keepGasAmount: undefined,
      })
    ).toBeUndefined();
  });

  it("selects nothing for an empty input even when a fill is within the re-estimation slack of zero", () => {
    // balance 21.2, fee 0.1: Keep gas fills 1.06, below the 1.43 slack of the 20.14 held back
    const smallKeepGas = usdcFeeCase(usdc(21.2), usdc(0.1));
    // balance 1.45, fee 1: Max fills 0.05, below the 0.1 slack of the 1.4 held back
    const smallMax = usdcFeeCase(usdc(1.45), usdc(1));

    expect(smallKeepGas.keepGasAmount).toBe(usdc(1.06));
    expect(smallMax.maxAvailableAmount).toBe(usdc(0.05));
    expect(
      getMaxActionSelection({ ...smallKeepGas, fromTokenBalance: usdc(21.2), fromTokenAmount: 0n })
    ).toBeUndefined();
    expect(getMaxActionSelection({ ...smallMax, fromTokenBalance: usdc(1.45), fromTokenAmount: 0n })).toBeUndefined();
  });

  it("a Max fill of a fee paid elsewhere is the full balance and needs an exact match", () => {
    const balance = usdc(10);

    expect(
      getMaxActionSelection({
        fromTokenAmount: balance,
        fromTokenBalance: balance,
        maxAvailableAmount: balance,
        keepGasAmount: undefined,
      })
    ).toBe("max");
    expect(
      getMaxActionSelection({
        fromTokenAmount: balance - 1n,
        fromTokenBalance: balance,
        maxAvailableAmount: balance,
        keepGasAmount: undefined,
      })
    ).toBeUndefined();
  });

  describe("a fee re-estimation after the fill keeps the selection while the fill still passes the 1.3x fee check", () => {
    const balance = usdc(62.03);
    const filled = usdcFeeCase(balance, usdc(1));

    it("Max and Keep gas stay selected after the fee moves by 5%, the reserve scaling with it", () => {
      for (const fee of [usdc(0.95), usdc(1.05)]) {
        const next = usdcFeeCase(balance, fee);
        const selectionInputs = { ...next, fromTokenBalance: balance };

        expect(getMaxActionSelection({ ...selectionInputs, fromTokenAmount: filled.maxAvailableAmount })).toBe("max");
        expect(getMaxActionSelection({ ...selectionInputs, fromTokenAmount: filled.keepGasAmount! })).toBe("keepGas");
      }
    });

    it("a fill still selected after the fee grew leaves the 1.3x-buffered fee payable", () => {
      const fee = usdc(1.07);
      const next = usdcFeeCase(balance, fee);

      expect(
        getMaxActionSelection({ ...next, fromTokenBalance: balance, fromTokenAmount: filled.maxAvailableAmount })
      ).toBe("max");
      expect(filled.maxAvailableAmount + (fee * 13n) / 10n).toBeLessThanOrEqual(balance);
    });

    it("the selection clears once the fill would no longer pass the check", () => {
      const next = usdcFeeCase(balance, usdc(1.2));

      expect(
        getMaxActionSelection({ ...next, fromTokenBalance: balance, fromTokenAmount: filled.maxAvailableAmount })
      ).toBeUndefined();
    });
  });
});

describe("shouldShowGasPaymentTokenWarning", () => {
  const balance = 27_797_480_000n;
  const details = usdcFeeCase(balance);

  function warns(
    fromTokenAmount: bigint,
    overrides: Partial<Parameters<typeof shouldShowGasPaymentTokenWarning>[0]> = {}
  ) {
    return shouldShowGasPaymentTokenWarning({
      fromTokenAmount,
      fromTokenBalance: balance,
      maxAvailableAmount: details.maxAvailableAmount,
      keepGasAmount: details.keepGasAmount,
      reserveAmount: details.reserveAmount,
      selected: getMaxActionSelection({
        fromTokenAmount,
        fromTokenBalance: balance,
        maxAvailableAmount: details.maxAvailableAmount,
        keepGasAmount: details.keepGasAmount,
      }),
      ...overrides,
    });
  }

  it("is suppressed in the Max selected state", () => {
    expect(warns(details.maxAvailableAmount)).toBe(false);
  });

  it("is suppressed in the Keep gas selected state", () => {
    expect(warns(details.keepGasAmount!)).toBe(false);
  });

  it("warns for a manual amount between Keep gas and Max", () => {
    expect(warns(27_790n * USDC_UNIT)).toBe(true);
  });

  it("does not warn for a small amount with a large balance (FEDEV-4033)", () => {
    expect(warns(3n * USDC_UNIT)).toBe(false);
  });

  it("warns when a low balance leaves no room for the reserve at all", () => {
    const lowBalance = usdc(1.5);
    const lowDetails = usdcFeeCase(lowBalance);
    expect(lowDetails.keepGasAmount).toBeUndefined();
    expect(
      shouldShowGasPaymentTokenWarning({
        fromTokenAmount: usdc(0.05),
        fromTokenBalance: lowBalance,
        maxAvailableAmount: lowDetails.maxAvailableAmount,
        keepGasAmount: lowDetails.keepGasAmount,
        reserveAmount: lowDetails.reserveAmount,
        selected: undefined,
      })
    ).toBe(true);
  });

  it("never warns without a reserve context (Classic ETH)", () => {
    expect(warns(27_790n * USDC_UNIT, { reserveAmount: undefined })).toBe(false);
  });
});

describe("getInsufficientFeeTooltip", () => {
  const base = { symbol: "USDC", feeHoldbackAmount: usdc(1.4), decimals: 6, isStable: true };

  it("Wallet source names the Wallet and the swap or bridge action (FEDEV-4283 copy)", () => {
    expect(getInsufficientFeeTooltip({ ...base, feeSource: getNetworkFeeSource({ isGmxAccount: false }) })).toBe(
      "Not enough USDC in your Wallet to cover this transaction's fee (~1.40 USDC). Swap or bridge USDC."
    );
  });

  it("GMX Account source names the GMX Account and the deposit action", () => {
    expect(getInsufficientFeeTooltip({ ...base, feeSource: getNetworkFeeSource({ isGmxAccount: true }) })).toBe(
      "Not enough USDC in your GMX Account to cover this transaction's fee (~1.40 USDC). Deposit USDC."
    );
  });

  it("source chain names the chain wallet and the swap or bridge action", () => {
    expect(getInsufficientFeeTooltip({ ...base, feeSource: getSourceChainNetworkFeeSource(SOURCE_BASE_MAINNET) })).toBe(
      "Not enough USDC in your Base wallet to cover this transaction's fee (~1.40 USDC). Swap or bridge USDC."
    );
  });
});

describe("getMaxActionsHint", () => {
  const base = { symbol: "USDC", decimals: 6, isStable: true, sourceLabel: "GMX Account" };

  it("returns nothing without a selection", () => {
    expect(
      getMaxActionsHint({ ...base, selected: undefined, feeHoldbackAmount: usdc(1.4), reserveAmount: usdc(20) })
    ).toBeUndefined();
  });

  it("Max with a holdback and a reserve context names the holdback and the empty reserve", () => {
    expect(getMaxActionsHint({ ...base, selected: "max", feeHoldbackAmount: usdc(1.4), reserveAmount: usdc(20) })).toBe(
      "Reserves ~1.40 USDC for this transaction's fee. Leaves no USDC in your GMX Account for future Express fees."
    );
  });

  it("Max with a holdback only names the holdback", () => {
    expect(
      getMaxActionsHint({ ...base, selected: "max", feeHoldbackAmount: usdc(1.4), reserveAmount: undefined })
    ).toBe("Reserves ~1.40 USDC for this transaction's fee.");
  });

  it("Max with a reserve context only names the empty reserve", () => {
    expect(getMaxActionsHint({ ...base, selected: "max", feeHoldbackAmount: 0n, reserveAmount: usdc(20) })).toBe(
      "Leaves no USDC in your GMX Account for future Express fees."
    );
  });

  it("Max without a holdback or a reserve context has nothing to explain", () => {
    expect(
      getMaxActionsHint({ ...base, selected: "max", feeHoldbackAmount: 0n, reserveAmount: undefined })
    ).toBeUndefined();
  });

  it("Keep gas with a holdback names both amounts", () => {
    expect(
      getMaxActionsHint({ ...base, selected: "keepGas", feeHoldbackAmount: usdc(1.4), reserveAmount: usdc(20) })
    ).toBe("Keeps 20.00 USDC in your GMX Account for future Express fees and ~1.40 USDC for this transaction's fee.");
  });

  it("Keep gas without a holdback names the reserve only", () => {
    expect(getMaxActionsHint({ ...base, selected: "keepGas", feeHoldbackAmount: 0n, reserveAmount: usdc(20) })).toBe(
      "Keeps 20.00 USDC in your GMX Account for future Express fees."
    );
  });
});
