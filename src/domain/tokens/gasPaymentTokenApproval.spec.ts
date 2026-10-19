import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";

import {
  getApproveButtonText,
  getGasPaymentTokenApprovalTooltip,
  getIsGasPaymentTokenApproval,
} from "./gasPaymentTokenApproval";

const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

describe("getIsGasPaymentTokenApproval", () => {
  it("is a gas token approval when the token is the gas token and not the pay token", () => {
    expect(
      getIsGasPaymentTokenApproval({ tokenAddress: USDC, gasPaymentTokenAddress: USDC, payTokenAddress: WETH })
    ).toBe(true);
  });

  it("is a plain approval when the pay token is also the gas token", () => {
    expect(
      getIsGasPaymentTokenApproval({ tokenAddress: USDC, gasPaymentTokenAddress: USDC, payTokenAddress: USDC })
    ).toBe(false);
  });

  it("is a plain approval without Express params", () => {
    expect(
      getIsGasPaymentTokenApproval({ tokenAddress: USDC, gasPaymentTokenAddress: undefined, payTokenAddress: WETH })
    ).toBe(false);
  });

  it("is a gas token approval when nothing is paid from the wallet", () => {
    expect(
      getIsGasPaymentTokenApproval({ tokenAddress: USDC, gasPaymentTokenAddress: USDC, payTokenAddress: undefined })
    ).toBe(true);
  });
});

describe("getApproveButtonText", () => {
  it("names Express fees only for the gas token", () => {
    expect(getApproveButtonText({ tokenSymbol: "USDC", isGasPaymentToken: true })).toBe(
      "Approve USDC for Express fees"
    );
    expect(getApproveButtonText({ tokenSymbol: "USDC", isGasPaymentToken: false })).toBe("Approve USDC");
  });
});

describe("getGasPaymentTokenApprovalTooltip", () => {
  it("names the token twice and points to Settings", () => {
    expect(getGasPaymentTokenApprovalTooltip("USDC")).toBe(
      "USDC is your Wallet gas payment token. One-time approval so Express fees can be paid in USDC. Change it in Settings."
    );
  });
});
