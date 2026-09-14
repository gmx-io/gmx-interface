import { render } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE } from "config/chains";
import { useIncentivesConfig } from "domain/synthetics/incentives/v2/useIncentivesConfig";
import { useChainId } from "lib/chains";

import { IncentivesV2ContextProvider, useIncentivesV2State } from "../IncentivesV2Context";

vi.mock("lib/chains", () => ({ useChainId: vi.fn() }));
vi.mock("domain/synthetics/incentives/v2/useIncentivesConfig", () => ({ useIncentivesConfig: vi.fn() }));

const mockUseChainId = vi.mocked(useChainId);
const mockUseIncentivesConfig = vi.mocked(useIncentivesConfig);
const refreshConfig = vi.fn();

function readContext() {
  let value: ReturnType<typeof useIncentivesV2State> | undefined;

  function Probe() {
    value = useIncentivesV2State();
    return null;
  }

  render(createElement(IncentivesV2ContextProvider, null, createElement(Probe)));

  return value!;
}

describe("IncentivesV2ContextProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIncentivesConfig.mockReturnValue({
      data: undefined,
      error: undefined,
      loading: true,
      isValidating: false,
      mutate: refreshConfig,
      endpoint: "https://example.com/graphql",
    } as ReturnType<typeof useIncentivesConfig>);
  });

  it("loads V2 by default on Arbitrum", () => {
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);

    const value = readContext();

    expect(value.availability.status).toBe("loading");
    expect(mockUseIncentivesConfig).toHaveBeenCalledWith(ARBITRUM, { enabled: true });
  });

  it("does not load V2 outside Arbitrum", () => {
    mockUseChainId.mockReturnValue({ chainId: AVALANCHE } as ReturnType<typeof useChainId>);

    const value = readContext();

    expect(value.availability.status).toBe("unsupported-chain");
    expect(mockUseIncentivesConfig).toHaveBeenCalledWith(AVALANCHE, { enabled: false });
  });
});
