import { zeroAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import type { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { Mode, Operation } from "domain/synthetics/markets/types";
import type { RawCreateGlvDepositParams } from "domain/synthetics/markets/types";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { selectPoolsDetailsIsMarketClosed } from "../poolsDetailsDerivedSelectors";
import { selectPoolsDetailsParams } from "../selectPoolsDetailsParams";

// the swap quote needs full markets and tokens data, a GM-paid GLV buy has no swap
vi.mock("../selectDepositWithdrawalAmounts", () => ({ selectDepositWithdrawalAmounts: () => undefined }));

const GLV_WETH_USDC = "0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9";
const GM_ETH_USD = "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336";
const GM_DOGE_USD = "0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4";
const GM_GOLD_USD = "0x0Df2BE76F517BCF0000AbfFcB6344B3b2aC4Cc4f";
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;

function makeState({
  firstTokenAddress,
  selectedMarketAddressForGlv,
  operation = Operation.Deposit,
  closedMarketAddress,
}: {
  firstTokenAddress: string;
  selectedMarketAddressForGlv: string;
  operation?: Operation;
  closedMarketAddress?: string;
}): SyntheticsState {
  return {
    globals: {
      chainId: ARBITRUM,
      closedMarkets: closedMarketAddress ? { [closedMarketAddress]: true } : {},
      srcChainId: undefined,
      account: "0x1111111111111111111111111111111111111111",
      marketsInfo: { marketsInfoData: {} },
      glvInfo: {
        glvData: {
          [GLV_WETH_USDC]: {
            isGlv: true,
            glvTokenAddress: GLV_WETH_USDC,
            longTokenAddress: getTokenBySymbol(ARBITRUM, "WETH").address,
            shortTokenAddress: USDC,
            glvToken: { address: GLV_WETH_USDC, decimals: 18, totalSupply: 10n ** 24n },
            markets: [{ address: GM_ETH_USD }, { address: GM_DOGE_USD }, { address: GM_GOLD_USD }],
          },
        },
      },
    },
    poolsDetails: {
      glvOrMarketAddress: GLV_WETH_USDC,
      operation,
      mode: Mode.Single,
      paySource: "gmxAccount",
      firstTokenAddress,
      firstTokenInputValue: "100",
      marketOrGlvTokenInputValue: "60",
      selectedMarketAddressForGlv,
    },
  } as unknown as SyntheticsState;
}

describe("selectPoolsDetailsParams", () => {
  it("names the paid GM as the GLV deposit market after the Sell tab moved the pool selection PRO-4537", () => {
    const params = selectPoolsDetailsParams(
      makeState({ firstTokenAddress: GM_ETH_USD, selectedMarketAddressForGlv: GM_DOGE_USD })
    ) as RawCreateGlvDepositParams;

    expect(params.isMarketTokenDeposit).toBe(true);
    expect(params.addresses.market).toBe(GM_ETH_USD);
    expect(params.addresses.initialLongToken).toBe(zeroAddress);
    expect(params.addresses.initialShortToken).toBe(zeroAddress);
  });

  it("keeps the selected pool as the GLV deposit market when paying with a collateral token", () => {
    const params = selectPoolsDetailsParams(
      makeState({ firstTokenAddress: USDC, selectedMarketAddressForGlv: GM_DOGE_USD })
    ) as RawCreateGlvDepositParams;

    expect(params.isMarketTokenDeposit).toBe(false);
    expect(params.addresses.market).toBe(GM_DOGE_USD);
    expect(params.addresses.initialShortToken).toBe(USDC);
  });
});

describe("selectPoolsDetailsIsMarketClosed", () => {
  it.each([
    [Operation.Deposit, GM_GOLD_USD, GM_ETH_USD, true],
    [Operation.Deposit, GM_ETH_USD, GM_GOLD_USD, false],
    [Operation.Deposit, USDC, GM_GOLD_USD, true],
    [Operation.Deposit, USDC, GM_ETH_USD, false],
    [Operation.Withdrawal, GM_GOLD_USD, GM_ETH_USD, false],
    [Operation.Withdrawal, GM_ETH_USD, GM_GOLD_USD, true],
  ] as const)(
    "checks the execution market for %s with first token %s and selected GM %s",
    (operation, firstTokenAddress, selectedMarketAddressForGlv, expected) => {
      const state = makeState({
        operation,
        firstTokenAddress,
        selectedMarketAddressForGlv,
        closedMarketAddress: GM_GOLD_USD,
      });
      expect(selectPoolsDetailsIsMarketClosed(state)).toBe(expected);
    }
  );
});
