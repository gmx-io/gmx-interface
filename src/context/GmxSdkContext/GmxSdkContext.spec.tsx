import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, AVALANCHE, SOLANA_NETWORK_ID } from "config/chains";
import type { GmxApiSdk } from "sdk/clients/v2";
import { getApiUrl } from "sdk/configs/api";

import { GmxSdkProvider, useGmxSdk } from "./GmxSdkContext";

afterEach(() => {
  cleanup();
  setAbFlagEnabled("useTestApi", false);
});

it("keeps Solana on its cached production SDK while the EVM test API flag switches EVM hosts", () => {
  const sdks = {} as Record<"arbitrum" | "avalanche" | "solana", GmxApiSdk | undefined>;
  function Probe() {
    sdks.arbitrum = useGmxSdk(ARBITRUM);
    sdks.avalanche = useGmxSdk(AVALANCHE);
    sdks.solana = useGmxSdk(SOLANA_NETWORK_ID);
    return null;
  }
  const tree = () => (
    <GmxSdkProvider>
      <Probe />
    </GmxSdkProvider>
  );
  const hosts = () => ({
    arbitrum: sdks.arbitrum?.ctx.api.url,
    avalanche: sdks.avalanche?.ctx.api.url,
    solana: sdks.solana?.ctx.api.url,
  });

  const { rerender } = render(tree());
  const solana = sdks.solana;
  expect(hosts()).toEqual({
    arbitrum: getApiUrl(ARBITRUM),
    avalanche: getApiUrl(AVALANCHE),
    solana: getApiUrl(SOLANA_NETWORK_ID),
  });

  setAbFlagEnabled("useTestApi", true);
  rerender(tree());

  expect(hosts()).toEqual({
    arbitrum: getApiUrl(ARBITRUM, "test"),
    avalanche: undefined,
    solana: getApiUrl(SOLANA_NETWORK_ID),
  });
  expect(sdks.solana).toBe(solana);
});
