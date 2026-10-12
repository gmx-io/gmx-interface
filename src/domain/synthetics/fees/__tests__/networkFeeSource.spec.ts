import { i18n } from "@lingui/core";
import { beforeAll, describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, SOURCE_BASE_MAINNET } from "config/chains";
import { TokenBalanceType } from "domain/tokens";

import {
  GMX_ACCOUNT_NETWORK_FEE_SOURCE,
  WALLET_NETWORK_FEE_SOURCE,
  getNetworkFeeSource,
  getNetworkFeeSourceExplanation,
  getNetworkFeeSourceLabel,
  getSourceChainNetworkFeeSource,
} from "../networkFeeSource";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

describe("getNetworkFeeSource", () => {
  it("maps the balance that funds the action to its fee source", () => {
    expect(getNetworkFeeSource({ isGmxAccount: false })).toBe(WALLET_NETWORK_FEE_SOURCE);
    expect(getNetworkFeeSource({ isGmxAccount: true })).toBe(GMX_ACCOUNT_NETWORK_FEE_SOURCE);
  });

  it("carries the chain for a source-chain wallet", () => {
    expect(getSourceChainNetworkFeeSource(SOURCE_BASE_MAINNET)).toEqual({
      balanceType: TokenBalanceType.SourceChain,
      chainId: SOURCE_BASE_MAINNET,
    });
  });
});

describe("getNetworkFeeSourceLabel", () => {
  it("names the wallet and the GMX Account", () => {
    expect(getNetworkFeeSourceLabel(WALLET_NETWORK_FEE_SOURCE)).toBe("Wallet");
    expect(getNetworkFeeSourceLabel(GMX_ACCOUNT_NETWORK_FEE_SOURCE)).toBe("GMX Account");
  });

  it("names the source chain wallet by chain", () => {
    expect(getNetworkFeeSourceLabel(getSourceChainNetworkFeeSource(SOURCE_BASE_MAINNET))).toBe("Base wallet");
  });
});

describe("getNetworkFeeSourceExplanation", () => {
  it("points Express wallet fees to the gas payment token setting", () => {
    expect(
      getNetworkFeeSourceExplanation({ source: WALLET_NETWORK_FEE_SOURCE, isExpress: true, chainId: ARBITRUM })
    ).toBe("Express fees are paid in your Wallet gas payment token. Change it in Settings.");
  });

  it("names the native token for wallet transactions per chain", () => {
    expect(
      getNetworkFeeSourceExplanation({ source: WALLET_NETWORK_FEE_SOURCE, isExpress: false, chainId: ARBITRUM })
    ).toBe("Wallet transactions pay gas in ETH from your Wallet.");
    expect(
      getNetworkFeeSourceExplanation({ source: WALLET_NETWORK_FEE_SOURCE, isExpress: false, chainId: AVALANCHE })
    ).toBe("Wallet transactions pay gas in AVAX from your Wallet.");
  });

  it("explains GMX Account fees regardless of the chain", () => {
    expect(
      getNetworkFeeSourceExplanation({ source: GMX_ACCOUNT_NETWORK_FEE_SOURCE, isExpress: true, chainId: ARBITRUM })
    ).toBe(
      "This action is paid from your GMX Account, so its fee is paid in your GMX Account gas payment token. Change it in Settings."
    );
  });

  it("names the source chain and its native token for bridges", () => {
    expect(
      getNetworkFeeSourceExplanation({
        source: getSourceChainNetworkFeeSource(SOURCE_BASE_MAINNET),
        isExpress: false,
        chainId: ARBITRUM,
      })
    ).toBe("Bridge transactions pay gas in ETH from your Base wallet.");
  });
});
