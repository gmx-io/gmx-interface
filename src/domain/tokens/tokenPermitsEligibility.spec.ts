import type { PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";

import {
  IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG,
  IS_TOKEN_PERMITS_EIP7702_ENABLED_UI_FLAG,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";

import { getIsTokenPermitsEnabled, getTokenPermitAccountType, TokenPermitAccountType } from "./tokenPermitsEligibility";

const mocks = vi.hoisted(() => ({ getAccountType: vi.fn() }));

vi.mock("lib/wallets/useAccountType", () => ({
  AccountType: { PostEip7702EOA: 0, SmartAccount: 1, EOA: 2 },
  getAccountType: mocks.getAccountType,
}));

const ACCOUNT = "0x0000000000000000000000000000000000000001";

function flags(values: { eoa?: boolean; eip7702?: boolean }): UiFlags {
  const result: UiFlags = {};

  if (values.eoa !== undefined) {
    result[IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG] = { enabled: values.eoa, createdAt: "", updatedAt: "" };
  }

  if (values.eip7702 !== undefined) {
    result[IS_TOKEN_PERMITS_EIP7702_ENABLED_UI_FLAG] = {
      enabled: values.eip7702,
      createdAt: "",
      updatedAt: "",
    };
  }

  return result;
}

describe("getTokenPermitAccountType", () => {
  const getDelegation = vi.fn();
  const client = { getDelegation } as unknown as PublicClient;

  it.each([
    { name: "plain EOA", accountType: 2, delegation: undefined, expected: "eoa" },
    {
      name: "EIP-7702 with a tested delegate",
      accountType: 0,
      delegation: "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
      expected: "eip7702",
    },
    {
      // this delegate rejects USDC/USDT permits
      name: "EIP-7702 with another delegate",
      accountType: 0,
      delegation: "0x36d3CBD83961868398d056EfBf50f5CE15528c0D",
      expected: "unsupported",
    },
    {
      // accepts permits in simulation, but no real wallet has been checked with it yet
      name: "EIP-7702 with a delegate verified only by simulation",
      accountType: 0,
      delegation: "0x7702cb554e6bFb442cb743A7dF23154544a7176C",
      expected: "unsupported",
    },
    { name: "smart account", accountType: 1, delegation: undefined, expected: "unsupported" },
  ])("$name -> $expected", async ({ accountType, delegation, expected }) => {
    mocks.getAccountType.mockResolvedValue(accountType);
    getDelegation.mockResolvedValue(delegation);

    await expect(getTokenPermitAccountType(ACCOUNT, client)).resolves.toBe(expected);
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
    { accountType: "eoa", uiFlags: flags({ eip7702: true }), isQaOverrideEnabled: false, expected: false },
    { accountType: "eip7702", uiFlags: flags({ eoa: true }), isQaOverrideEnabled: false, expected: false },
    { accountType: "eip7702", uiFlags: flags({ eip7702: true }), isQaOverrideEnabled: false, expected: true },
    { accountType: "eoa", uiFlags: undefined, isQaOverrideEnabled: true, expected: true },
    { accountType: "eip7702", uiFlags: flags({ eip7702: false }), isQaOverrideEnabled: true, expected: true },
    {
      accountType: "unsupported",
      uiFlags: flags({ eoa: true, eip7702: true }),
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
