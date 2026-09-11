import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import { getIncentivesIndexerUrl } from "../client";
import { useIncentivesIndexerUrl } from "../useIncentivesIndexerUrl";

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: vi.fn(),
}));

vi.mock("../client", () => ({
  getIncentivesIndexerUrl: vi.fn(),
}));

const mockUseSettings = vi.mocked(useSettings);
const mockGetIncentivesIndexerUrl = vi.mocked(getIncentivesIndexerUrl);

function EndpointProbe() {
  return <span>{useIncentivesIndexerUrl(ARBITRUM)}</span>;
}

describe("useIncentivesIndexerUrl", () => {
  beforeEach(() => {
    mockUseSettings.mockReset();
    mockGetIncentivesIndexerUrl.mockReset();
  });

  afterEach(cleanup);

  it("resolves the endpoint using the selected test squid", () => {
    mockUseSettings.mockReturnValue({ incentivesTestSquid: "ivtest" } as unknown as ReturnType<typeof useSettings>);
    mockGetIncentivesIndexerUrl.mockReturnValue("https://example.com/ivtest/graphql");

    render(<EndpointProbe />);

    expect(mockGetIncentivesIndexerUrl).toHaveBeenCalledWith(ARBITRUM, "ivtest");
    expect(screen.getByText("https://example.com/ivtest/graphql")).toBeDefined();
  });
});
