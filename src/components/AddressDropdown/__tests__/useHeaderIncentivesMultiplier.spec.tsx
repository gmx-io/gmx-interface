import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { useIncentivesV2State } from "context/IncentivesV2Context/IncentivesV2Context";
import type { AccountIncentiveStatus, IncentivesConfig } from "domain/synthetics/incentives/v2/types";
import { useAccountIncentiveStatus } from "domain/synthetics/incentives/v2/useAccountIncentiveStatus";

import { useHeaderIncentivesMultiplier } from "../useHeaderIncentivesMultiplier";

vi.mock("context/IncentivesV2Context/IncentivesV2Context", () => ({
  useIncentivesV2State: vi.fn(),
}));

vi.mock("domain/synthetics/incentives/v2/useAccountIncentiveStatus", () => ({
  useAccountIncentiveStatus: vi.fn(),
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const CONFIG = { epochTimestamp: 1_000, multiplierDecimals: 100n } as IncentivesConfig;
const mockUseIncentivesV2State = vi.mocked(useIncentivesV2State);
const mockUseAccountIncentiveStatus = vi.mocked(useAccountIncentiveStatus);

function Probe() {
  const formattedMultiplier = useHeaderIncentivesMultiplier({ account: ACCOUNT, chainId: ARBITRUM });

  return <div data-testid="result">{formattedMultiplier ?? "none"}</div>;
}

describe("useHeaderIncentivesMultiplier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "active", config: CONFIG, isStale: false },
      isActive: true,
      refreshConfig: vi.fn(),
    });
    mockUseAccountIncentiveStatus.mockReturnValue({ data: undefined } as ReturnType<typeof useAccountIncentiveStatus>);
  });

  afterEach(cleanup);

  it("formats the current V2 epoch multiplier with the config denominator", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { epochTimestamp: CONFIG.epochTimestamp, multiplier: 250n } as AccountIncentiveStatus,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    render(<Probe />);

    expect(screen.getByTestId("result").textContent).toBe("2.5x");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: true,
    });
  });

  it("withholds a multiplier from the previous epoch", () => {
    mockUseAccountIncentiveStatus.mockReturnValue({
      data: { epochTimestamp: CONFIG.epochTimestamp - 1, multiplier: 250n } as AccountIncentiveStatus,
    } as ReturnType<typeof useAccountIncentiveStatus>);

    render(<Probe />);

    expect(screen.getByTestId("result").textContent).toBe("none");
  });

  it("does not request account status until the V2 config is active", () => {
    mockUseIncentivesV2State.mockReturnValue({
      availability: { status: "loading" },
      isActive: false,
      refreshConfig: vi.fn(),
    });

    render(<Probe />);

    expect(screen.getByTestId("result").textContent).toBe("none");
    expect(mockUseAccountIncentiveStatus).toHaveBeenCalledWith(ARBITRUM, {
      account: ACCOUNT,
      enabled: false,
    });
  });
});
