import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { SELECTED_NETWORK_LOCAL_STORAGE_KEY } from "config/localStorage";

import { fallBackFromDisabledSolanaNetwork, getIsSolanaNetworkSelected } from "./solana";

describe("solana network selection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    setAbFlagEnabled("solanaNetwork", false);
  });

  it.each([
    { isFlagEnabled: true, stored: SOLANA_NETWORK_ID, isSelected: true, storedAfterFallback: SOLANA_NETWORK_ID },
    { isFlagEnabled: false, stored: SOLANA_NETWORK_ID, isSelected: false, storedAfterFallback: ARBITRUM },
    { isFlagEnabled: true, stored: ARBITRUM, isSelected: false, storedAfterFallback: ARBITRUM },
  ])(
    "flag $isFlagEnabled, stored $stored: selected $isSelected, stored after fallback $storedAfterFallback",
    ({ isFlagEnabled, stored, isSelected, storedAfterFallback }) => {
      setAbFlagEnabled("solanaNetwork", isFlagEnabled);
      localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, String(stored));

      expect(getIsSolanaNetworkSelected()).toBe(isSelected);

      fallBackFromDisabledSolanaNetwork();

      expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBe(String(storedAfterFallback));
    }
  );
});
