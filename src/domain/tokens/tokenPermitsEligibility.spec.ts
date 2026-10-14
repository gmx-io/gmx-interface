import type { PublicClient } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG,
  IS_TOKEN_PERMITS_METAMASK_7702_ENABLED_UI_FLAG,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import { ARBITRUM, ARBITRUM_SEPOLIA, AVALANCHE } from "sdk/configs/chains";

import {
  getIsTokenPermitAllowed,
  getIsTokenPermitsEnabled,
  getTokenPermitAccountType,
  METAMASK_EIP7702_DELEGATOR_ADDRESS,
  TokenPermitAccountType,
} from "./tokenPermitsEligibility";

const mocks = vi.hoisted(() => ({ getAccountType: vi.fn() }));

vi.mock("lib/wallets/useAccountType", () => ({
  AccountType: { PostEip7702EOA: 0, SmartAccount: 1, EOA: 2 },
  getAccountType: mocks.getAccountType,
}));

const ACCOUNT = "0x0000000000000000000000000000000000000001";

const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const ARBITRUM_USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const ARBITRUM_WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const ARBITRUM_ARB = "0x912CE59144191C1204E64559FE8253a0e49E6548";
const AVALANCHE_USDC = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
const AVALANCHE_USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
const AVALANCHE_MIM = "0x130966628846BFd36ff31a822705796e8cb8C18D";

function flags(values: { eoa?: boolean; metaMask7702?: boolean }): UiFlags {
  const result: UiFlags = {};

  if (values.eoa !== undefined) {
    result[IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG] = { enabled: values.eoa, createdAt: "", updatedAt: "" };
  }

  if (values.metaMask7702 !== undefined) {
    result[IS_TOKEN_PERMITS_METAMASK_7702_ENABLED_UI_FLAG] = {
      enabled: values.metaMask7702,
      createdAt: "",
      updatedAt: "",
    };
  }

  return result;
}

describe("getIsTokenPermitAllowed", () => {
  it("allows USDC, USDT and WETH on Arbitrum", () => {
    expect(getIsTokenPermitAllowed(ARBITRUM, ARBITRUM_USDC)).toBe(true);
    expect(getIsTokenPermitAllowed(ARBITRUM, ARBITRUM_USDT)).toBe(true);
    expect(getIsTokenPermitAllowed(ARBITRUM, ARBITRUM_WETH)).toBe(true);
  });

  it("allows USDC and USDT on Avalanche", () => {
    expect(getIsTokenPermitAllowed(AVALANCHE, AVALANCHE_USDC)).toBe(true);
    expect(getIsTokenPermitAllowed(AVALANCHE, AVALANCHE_USDT)).toBe(true);
  });

  it("keeps other tokens the SDK marks as permit-capable on approvals", () => {
    expect(getIsTokenPermitAllowed(ARBITRUM, ARBITRUM_ARB)).toBe(false);
    expect(getIsTokenPermitAllowed(AVALANCHE, AVALANCHE_MIM)).toBe(false);
  });

  it("does not carry an address over to another chain", () => {
    expect(getIsTokenPermitAllowed(AVALANCHE, ARBITRUM_USDC)).toBe(false);
    expect(getIsTokenPermitAllowed(ARBITRUM_SEPOLIA, ARBITRUM_USDC)).toBe(false);
  });
});

describe("getTokenPermitAccountType", () => {
  const getDelegation = vi.fn();
  const client = { getDelegation } as unknown as PublicClient;

  beforeEach(() => {
    mocks.getAccountType.mockReset();
    getDelegation.mockReset();
  });

  it("treats a plain EOA as eligible without reading the delegation", async () => {
    mocks.getAccountType.mockResolvedValue(2);

    await expect(getTokenPermitAccountType(ACCOUNT, client)).resolves.toBe("eoa");
    expect(getDelegation).not.toHaveBeenCalled();
  });

  it("accepts an EIP-7702 account delegated to the MetaMask delegator", async () => {
    mocks.getAccountType.mockResolvedValue(0);
    getDelegation.mockResolvedValue(METAMASK_EIP7702_DELEGATOR_ADDRESS);

    await expect(getTokenPermitAccountType(ACCOUNT, client)).resolves.toBe("metaMask7702");
    expect(getDelegation).toHaveBeenCalledWith({ address: ACCOUNT });
  });

  it("rejects an EIP-7702 account delegated elsewhere", async () => {
    mocks.getAccountType.mockResolvedValue(0);
    getDelegation.mockResolvedValue("0x0000000000000000000000000000000000000bad");

    await expect(getTokenPermitAccountType(ACCOUNT, client)).resolves.toBe("unsupported");
  });

  it("rejects smart contract accounts", async () => {
    mocks.getAccountType.mockResolvedValue(1);

    await expect(getTokenPermitAccountType(ACCOUNT, client)).resolves.toBe("unsupported");
  });
});

describe("getIsTokenPermitsEnabled", () => {
  const cases: {
    accountType: TokenPermitAccountType | undefined;
    uiFlags: UiFlags | undefined;
    isQaOverrideEnabled: boolean;
    expected: boolean;
  }[] = [
    { accountType: "eoa", uiFlags: undefined, isQaOverrideEnabled: false, expected: false },
    { accountType: "eoa", uiFlags: flags({}), isQaOverrideEnabled: false, expected: false },
    { accountType: "eoa", uiFlags: flags({ eoa: false }), isQaOverrideEnabled: false, expected: false },
    { accountType: "eoa", uiFlags: flags({ eoa: true }), isQaOverrideEnabled: false, expected: true },
    { accountType: "eoa", uiFlags: flags({ metaMask7702: true }), isQaOverrideEnabled: false, expected: false },
    { accountType: "metaMask7702", uiFlags: flags({ eoa: true }), isQaOverrideEnabled: false, expected: false },
    { accountType: "metaMask7702", uiFlags: flags({ metaMask7702: true }), isQaOverrideEnabled: false, expected: true },
    { accountType: "eoa", uiFlags: undefined, isQaOverrideEnabled: true, expected: true },
    { accountType: "metaMask7702", uiFlags: flags({ metaMask7702: false }), isQaOverrideEnabled: true, expected: true },
    {
      accountType: "unsupported",
      uiFlags: flags({ eoa: true, metaMask7702: true }),
      isQaOverrideEnabled: true,
      expected: false,
    },
    { accountType: undefined, uiFlags: flags({ eoa: true }), isQaOverrideEnabled: true, expected: false },
  ];

  it.each(cases)(
    "$accountType account, flags $uiFlags, QA override $isQaOverrideEnabled -> $expected",
    ({ accountType, uiFlags, isQaOverrideEnabled, expected }) => {
      expect(getIsTokenPermitsEnabled({ uiFlags, accountType, isQaOverrideEnabled })).toBe(expected);
    }
  );
});
