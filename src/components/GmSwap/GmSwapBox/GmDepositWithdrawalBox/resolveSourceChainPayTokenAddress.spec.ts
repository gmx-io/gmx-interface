import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, GMX_ACCOUNT_PSEUDO_CHAIN_ID, SOURCE_BASE_MAINNET } from "sdk/configs/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

import { resolveSourceChainPayTokenAddress } from "./resolveSourceChainPayTokenAddress";

const WETH = getTokenBySymbol(ARBITRUM, "WETH").address;
const USDC = getTokenBySymbol(ARBITRUM, "USDC").address;
const WBTC = getTokenBySymbol(ARBITRUM, "BTC").address;
const GM_BTC_USDC = "0x47c031236e19d024b42f8AE6780E44A573170703";

function resolve({
  firstTokenAddress,
  tokenOptions = [],
  collateralTokenAddresses = [WETH, USDC],
}: {
  firstTokenAddress: string | undefined;
  tokenOptions?: Parameters<typeof resolveSourceChainPayTokenAddress>[0]["tokenOptions"];
  collateralTokenAddresses?: string[];
}) {
  return resolveSourceChainPayTokenAddress({
    chainId: ARBITRUM,
    srcChainId: SOURCE_BASE_MAINNET,
    firstTokenAddress,
    tokenOptions,
    collateralTokenAddresses,
  });
}

describe("resolveSourceChainPayTokenAddress", () => {
  it("replaces WETH, which Base cannot pay with, by the source chain option with the highest balance", () => {
    expect(
      resolve({
        firstTokenAddress: WETH,
        tokenOptions: [
          { address: WETH, chainId: GMX_ACCOUNT_PSEUDO_CHAIN_ID },
          { address: USDC, chainId: SOURCE_BASE_MAINNET },
          { address: zeroAddress, chainId: SOURCE_BASE_MAINNET },
          { address: WETH, chainId: ARBITRUM },
        ],
      })
    ).toBe(USDC);
  });

  it("falls back to native ETH for a WETH market when there is nothing on the source chain", () => {
    expect(
      resolve({
        firstTokenAddress: WETH,
        tokenOptions: [
          { address: WETH, chainId: GMX_ACCOUNT_PSEUDO_CHAIN_ID },
          { address: WETH, chainId: ARBITRUM },
        ],
      })
    ).toBe(zeroAddress);
  });

  it("falls back to the first collateral the source chain supports", () => {
    expect(resolve({ firstTokenAddress: WBTC, collateralTokenAddresses: [WBTC, USDC] })).toBe(USDC);
  });

  it("picks a token when none is selected yet", () => {
    expect(resolve({ firstTokenAddress: undefined })).toBe(zeroAddress);
  });

  it("keeps a selected collateral the source chain supports, even with a zero balance", () => {
    expect(
      resolve({
        firstTokenAddress: USDC,
        tokenOptions: [{ address: zeroAddress, chainId: SOURCE_BASE_MAINNET }],
      })
    ).toBe(USDC);
  });

  it("keeps a GM token held on the source chain as the GLV pay token", () => {
    expect(
      resolve({
        firstTokenAddress: GM_BTC_USDC,
        tokenOptions: [
          { address: zeroAddress, chainId: SOURCE_BASE_MAINNET },
          { address: GM_BTC_USDC, chainId: SOURCE_BASE_MAINNET },
        ],
      })
    ).toBe(GM_BTC_USDC);
  });

  it("returns undefined when the market cannot be paid from the source chain", () => {
    expect(resolve({ firstTokenAddress: WBTC, collateralTokenAddresses: [WBTC] })).toBeUndefined();
  });
});
