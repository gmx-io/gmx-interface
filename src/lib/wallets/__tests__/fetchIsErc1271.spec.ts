import { describe, expect, it } from "vitest";

import { ARBITRUM, ARBITRUM_SEPOLIA, SOURCE_SEPOLIA } from "sdk/configs/chains";

import { getPublicClientWithRpc } from "../rainbowKitConfig";
import { fetchIsErc1271 } from "../useAccountType";

const EOA_ARB_SEP_ADDRESS = "0x196A492f60696930D6eE0551D3f4eD56b668Aa00";
const SAFE_SEPOLIA_ADDRESS = "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2";
const GEMINI_ARBITRUM_ADDRESS = "0x03b3ec670e296D8d4eA0198d3d72df9464017cce";
const CUSTOM_SAFE_ARB_SEP_ADDRESS = "0x641326e966B4B201206eb2432D11CBAb421329d0";

describe.concurrent("fetchIsErc1271", () => {
  it("returns false for EOA", { timeout: 10_000 }, async () => {
    const client = getPublicClientWithRpc(SOURCE_SEPOLIA);
    const result = await fetchIsErc1271(client, EOA_ARB_SEP_ADDRESS);
    expect(result).toBe(false);
  });

  it("returns true for ERC-1271 compatible smart account on Sepolia", { timeout: 10_000 }, async () => {
    const client = getPublicClientWithRpc(SOURCE_SEPOLIA);
    const result = await fetchIsErc1271(client, SAFE_SEPOLIA_ADDRESS);
    expect(result).toBe(true);
  });

  it("returns true for ERC-1271 compatible smart account on Arbitrum", { timeout: 10_000 }, async () => {
    const client = getPublicClientWithRpc(ARBITRUM);
    const result = await fetchIsErc1271(client, GEMINI_ARBITRUM_ADDRESS);
    expect(result).toBe(true);
  });

  it("returns true for ERC-1271 compatible smart account on Arbitrum Sepolia", { timeout: 10_000 }, async () => {
    const client = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
    const result = await fetchIsErc1271(client, CUSTOM_SAFE_ARB_SEP_ADDRESS);
    expect(result).toBe(true);
  });
});
