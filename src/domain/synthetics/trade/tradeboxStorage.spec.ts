import { afterEach, describe, expect, it } from "vitest";

import { getKeepLeverageKey, getLeverageKey, getSortedMarketsAddressesKey } from "config/localStorage";
import { ARBITRUM, type NetworkId, SOLANA_NETWORK_ID } from "sdk/configs/chains";

import {
  INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
  readStoredTradeOptions,
  resolveStoredTradeOptionsSync,
  type StoredTradeOptions,
  type StoredTradeOptionsSyncResult,
  writeStoredTradeOptions,
} from "./tradeboxStorage";

const ETH_INDEX = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const BTC_INDEX = "0x47904963fc8b2340414262125aF798B9655E58Cd";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const ETH_MARKET = {
  indexTokenAddress: ETH_INDEX,
  marketTokenAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  shortTokenAddress: USDC,
};

const ETH_OPTIONS: StoredTradeOptions = {
  ...INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
  tokens: { indexTokenAddress: ETH_INDEX, fromTokenAddress: USDC },
  markets: { [ETH_INDEX]: { long: ETH_MARKET.marketTokenAddress, short: ETH_MARKET.marketTokenAddress } },
};

describe("tradeboxStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("keeps the existing serialized Arbitrum keys so saved preferences stay readable", () => {
    localStorage.setItem('[42161,"synthetics-trade-options"]', JSON.stringify(ETH_OPTIONS));

    expect(readStoredTradeOptions(ARBITRUM)).toEqual(ETH_OPTIONS);
    expect(JSON.stringify(getLeverageKey(ARBITRUM))).toBe('[42161,"leverage-option"]');
    expect(JSON.stringify(getKeepLeverageKey(ARBITRUM))).toBe('[42161,"Exchange-keep-leverage"]');
    expect(getSortedMarketsAddressesKey(ARBITRUM)).toBe("sorted-markets-key:42161");
  });

  it.each<{
    name: string;
    stored: Partial<Record<NetworkId, StoredTradeOptions>>;
    networkId: NetworkId;
    syncedNetworkId: NetworkId | undefined;
    enabled?: boolean;
    availableIndexTokenAddresses?: string[];
    firstMarket?: typeof ETH_MARKET;
    expected: StoredTradeOptionsSyncResult;
  }>([
    {
      name: "already synced network",
      stored: { [SOLANA_NETWORK_ID]: ETH_OPTIONS },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: SOLANA_NETWORK_ID,
      expected: { action: "noop" },
    },
    {
      name: "disabled tradebox",
      stored: {},
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      enabled: false,
      expected: { action: "noop" },
    },
    {
      name: "saved slot before markets load",
      stored: { [SOLANA_NETWORK_ID]: ETH_OPTIONS },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      availableIndexTokenAddresses: [],
      expected: { action: "wait" },
    },
    {
      name: "first mount with a valid saved slot",
      stored: { [SOLANA_NETWORK_ID]: ETH_OPTIONS },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: undefined,
      expected: { action: "markSynced" },
    },
    {
      name: "switch to a network with a valid saved slot",
      stored: {
        [ARBITRUM]: { ...ETH_OPTIONS, tokens: { indexTokenAddress: BTC_INDEX } },
        [SOLANA_NETWORK_ID]: ETH_OPTIONS,
      },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      availableIndexTokenAddresses: [ETH_INDEX, BTC_INDEX],
      expected: { action: "restore", options: ETH_OPTIONS },
    },
    {
      name: "saved slot with an unavailable index token",
      stored: { [SOLANA_NETWORK_ID]: { ...ETH_OPTIONS, tokens: { indexTokenAddress: BTC_INDEX } } },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      expected: { action: "reset", market: ETH_MARKET },
    },
    {
      name: "empty slot does not restore the other network's valid slot",
      stored: { [ARBITRUM]: ETH_OPTIONS },
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      expected: { action: "reset", market: ETH_MARKET },
    },
    {
      name: "empty slot before markets load",
      stored: {},
      networkId: SOLANA_NETWORK_ID,
      syncedNetworkId: ARBITRUM,
      firstMarket: undefined,
      expected: { action: "wait" },
    },
  ])("$name", ({ stored, expected, enabled = true, availableIndexTokenAddresses = [ETH_INDEX], ...p }) => {
    Object.entries(stored).forEach(([networkId, options]) =>
      writeStoredTradeOptions(Number(networkId) as NetworkId, options)
    );

    const firstMarket = "firstMarket" in p ? p.firstMarket : ETH_MARKET;

    expect(
      resolveStoredTradeOptionsSync({
        networkId: p.networkId,
        syncedNetworkId: p.syncedNetworkId,
        enabled,
        availableIndexTokenAddresses,
        firstMarket,
      })
    ).toEqual(expected);
  });
});
