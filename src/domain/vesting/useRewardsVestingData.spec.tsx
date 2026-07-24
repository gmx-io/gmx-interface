import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";

import { RewardsVestingData, useRewardsVestingData } from "./useRewardsVestingData";

vi.mock("domain/legacy", () => ({
  useGmxPrice: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: vi.fn(),
}));

vi.mock("lib/multicall", () => ({
  useMulticall: vi.fn(),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: vi.fn(),
}));

const ACCOUNT = "0x52908400098527886E0F7030069857D2E4169EE7";
const GMX_PRICE = 42n * 10n ** 30n;
const SIGNER = { name: "signer" };

type RewardsVestingContractsData = Omit<RewardsVestingData, "gmxPrice">;

type CapturedMulticallParams = {
  key: unknown;
  request: () => unknown;
  parseResponse: (result: unknown) => RewardsVestingContractsData;
};

const contractsData: RewardsVestingContractsData = {
  walletGmxBalance: 11n,
  walletEsGmxBalance: 22n,
  stakedGmxBalance: 33n,
  freePairAmount: 44n,
  vestingInfo: {
    pairAmount: 55n,
    vestedAmount: 66n,
    escrowedBalance: 77n,
    claimedAmounts: 88n,
    claimable: 99n,
    maxVestableAmount: 111n,
    averageStakedAmount: 222n,
  },
  vestingDuration: 333n,
};

const mockUseGmxPrice = vi.mocked(useGmxPrice);
const mockUseChainId = vi.mocked(useChainId);
const mockUseMulticall = vi.mocked(useMulticall);
const mockUseWallet = vi.mocked(useWallet);
const mockMutateContractsData = vi.fn();
const mockMutateGmxPrice = vi.fn();

let hookResult: ReturnType<typeof useRewardsVestingData> | undefined;

function Harness({
  account = ACCOUNT,
  targetChainId = ARBITRUM,
}: {
  account?: string;
  targetChainId?: ContractsChainId;
}) {
  hookResult = useRewardsVestingData(account, targetChainId);
  return null;
}

function getCapturedMulticallParams(): CapturedMulticallParams {
  const latestCall = mockUseMulticall.mock.calls.at(-1);
  if (!latestCall) throw new Error("useMulticall was not called");

  return latestCall[2] as unknown as CapturedMulticallParams;
}

function makeMulticallResult(vestingInfo: bigint[] = [55n, 66n, 77n, 88n, 99n, 111n, 222n]) {
  return {
    data: {
      gmx: { balanceOf: { returnValues: [11n] } },
      esGmx: { balanceOf: { returnValues: [22n] } },
      stakedGmxTracker: { gmxDepositBalance: { returnValues: [33n] } },
      feeGmxTracker: { balanceOf: { returnValues: [44n] } },
      reader: { getVestingInfo: { returnValues: vestingInfo } },
      gmxVester: { vestingDuration: { returnValues: [333n] } },
    },
  };
}

describe("useRewardsVestingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookResult = undefined;
    mockMutateContractsData.mockResolvedValue(contractsData);
    mockUseChainId.mockReturnValue({ chainId: ARBITRUM } as ReturnType<typeof useChainId>);
    mockUseWallet.mockReturnValue({
      active: true,
      chainId: ARBITRUM,
      signer: SIGNER,
    } as unknown as ReturnType<typeof useWallet>);
    mockUseGmxPrice.mockReturnValue({
      gmxPrice: GMX_PRICE,
      mutate: mockMutateGmxPrice,
    } as unknown as ReturnType<typeof useGmxPrice>);
    mockUseMulticall.mockReturnValue({
      data: contractsData,
      isLoading: false,
      error: undefined,
      mutate: mockMutateContractsData,
    } as never);
  });

  afterEach(cleanup);

  it("builds the exact Arbitrum request and parses the Reader seven-field response", () => {
    render(<Harness />);

    expect(mockUseMulticall).toHaveBeenCalledWith(
      ARBITRUM,
      "Rewards:useRewardsVestingData",
      expect.objectContaining({ key: [ACCOUNT] })
    );
    expect(mockUseGmxPrice).toHaveBeenCalledWith(ARBITRUM, { arbitrum: SIGNER }, true);

    const params = getCapturedMulticallParams();
    expect(params.request()).toEqual({
      gmx: {
        contractAddress: getContract(ARBITRUM, "GMX"),
        abiId: "Token",
        calls: { balanceOf: { methodName: "balanceOf", params: [ACCOUNT] } },
      },
      esGmx: {
        contractAddress: getContract(ARBITRUM, "ES_GMX"),
        abiId: "Token",
        calls: { balanceOf: { methodName: "balanceOf", params: [ACCOUNT] } },
      },
      stakedGmxTracker: {
        contractAddress: getContract(ARBITRUM, "StakedGmxTracker"),
        abiId: "RewardTracker",
        calls: {
          gmxDepositBalance: {
            methodName: "depositBalances",
            params: [ACCOUNT, getContract(ARBITRUM, "GMX")],
          },
        },
      },
      feeGmxTracker: {
        contractAddress: getContract(ARBITRUM, "FeeGmxTracker"),
        abiId: "RewardTracker",
        calls: { balanceOf: { methodName: "balanceOf", params: [ACCOUNT] } },
      },
      reader: {
        contractAddress: getContract(ARBITRUM, "Reader"),
        abiId: "ReaderV2",
        calls: {
          getVestingInfo: {
            methodName: "getVestingInfo",
            params: [ACCOUNT, [getContract(ARBITRUM, "GmxVester")]],
          },
        },
      },
      gmxVester: {
        contractAddress: getContract(ARBITRUM, "GmxVester"),
        abiId: "Vester",
        calls: { vestingDuration: { methodName: "vestingDuration", params: [] } },
      },
    });
    expect(params.parseResponse(makeMulticallResult())).toEqual(contractsData);
    expect(hookResult?.data).toEqual({ ...contractsData, gmxPrice: GMX_PRICE });
    expect(hookResult?.vestableEsGmx).toBe(22n);
    expect(hookResult?.vestableEsGmxUsd).toBe(924_000_000_000_000n);
  });

  it("throws when any required return value is missing", () => {
    render(<Harness />);

    const params = getCapturedMulticallParams();
    expect(() => params.parseResponse(makeMulticallResult([55n, 66n, 77n, 88n, 99n, 111n]))).toThrow(
      "Incomplete rewards vesting response"
    );
  });

  it("merges refreshed contract data with the current GMX price", async () => {
    const refreshedContractsData: RewardsVestingContractsData = {
      ...contractsData,
      walletGmxBalance: 444n,
      freePairAmount: 555n,
    };
    mockMutateContractsData.mockResolvedValue(refreshedContractsData);
    render(<Harness />);

    let refreshedData: RewardsVestingData | undefined;
    await act(async () => {
      refreshedData = await hookResult?.mutate();
    });

    expect(mockMutateContractsData).toHaveBeenCalledTimes(1);
    expect(mockMutateGmxPrice).toHaveBeenCalledTimes(1);
    expect(refreshedData).toEqual({ ...refreshedContractsData, gmxPrice: GMX_PRICE });
  });

  it("does not pass the wallet signer to Arbitrum pricing for a non-Arbitrum target", () => {
    render(<Harness targetChainId={AVALANCHE} />);

    expect(mockUseGmxPrice).toHaveBeenCalledWith(AVALANCHE, { arbitrum: undefined }, true);
  });

  it("does not pass a wrong-chain wallet signer to Arbitrum pricing", () => {
    mockUseWallet.mockReturnValue({
      active: true,
      chainId: AVALANCHE,
      signer: SIGNER,
    } as unknown as ReturnType<typeof useWallet>);

    render(<Harness />);

    expect(mockUseGmxPrice).toHaveBeenCalledWith(ARBITRUM, { arbitrum: undefined }, true);
  });
});
