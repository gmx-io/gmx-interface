import { useCallback, useMemo } from "react";
import { zeroAddress } from "viem";

import { ARBITRUM, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { MulticallRequestConfig, MulticallResult, useMulticall } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";

export type VestingInfo = {
  pairAmount: bigint;
  vestedAmount: bigint;
  escrowedBalance: bigint;
  claimedAmounts: bigint;
  claimable: bigint;
  maxVestableAmount: bigint;
  averageStakedAmount: bigint;
};

export type RewardsVestingData = {
  walletGmxBalance: bigint;
  walletEsGmxBalance: bigint;
  stakedGmxBalance: bigint;
  freePairAmount: bigint;
  vestingInfo: VestingInfo;
  vestingDuration: bigint;
  gmxPrice?: bigint;
};

type RewardsVestingContractsData = Omit<RewardsVestingData, "gmxPrice">;

type RewardsVestingAddresses = {
  gmx: string;
  esGmx: string;
  stakedGmxTracker: string;
  feeGmxTracker: string;
  reader: string;
  gmxVester: string;
};

export function useRewardsVestingData(account?: string, targetChainId?: ContractsChainId) {
  const { chainId: currentChainId } = useChainId();
  const { active, chainId: walletChainId, signer } = useWallet();
  const chainId = targetChainId ?? currentChainId;
  const addresses = getRewardsVestingAddresses(chainId);
  const isSupported = Object.values(addresses).every((address) => address !== zeroAddress);

  const {
    data: contractsData,
    isLoading,
    error,
    mutate: mutateContractsData,
  } = useMulticall<MulticallRequestConfig<any>, RewardsVestingContractsData>(chainId, "Rewards:useRewardsVestingData", {
    key: account && isSupported ? [account] : null,
    request: () => buildRewardsVestingRequest(account!, addresses),
    parseResponse: parseRewardsVestingResponse,
  });

  const { gmxPrice, mutate: mutateGmxPrice } = useGmxPrice(
    chainId,
    { arbitrum: chainId === ARBITRUM && walletChainId === ARBITRUM ? signer : undefined },
    active
  );

  const data = useMemo<RewardsVestingData | undefined>(() => {
    if (!contractsData) {
      return undefined;
    }

    return {
      ...contractsData,
      gmxPrice,
    };
  }, [contractsData, gmxPrice]);

  const mutate = useCallback(async (): Promise<RewardsVestingData | undefined> => {
    const latestContractsData = await mutateContractsData();
    mutateGmxPrice();

    if (!latestContractsData) {
      return undefined;
    }

    return {
      ...latestContractsData,
      gmxPrice,
    };
  }, [gmxPrice, mutateContractsData, mutateGmxPrice]);

  return {
    data,
    isLoading,
    error,
    mutate,
  };
}

function getRewardsVestingAddresses(chainId: ContractsChainId): RewardsVestingAddresses {
  return {
    gmx: getContract(chainId, "GMX"),
    esGmx: getContract(chainId, "ES_GMX"),
    stakedGmxTracker: getContract(chainId, "StakedGmxTracker"),
    feeGmxTracker: getContract(chainId, "FeeGmxTracker"),
    reader: getContract(chainId, "Reader"),
    gmxVester: getContract(chainId, "GmxVester"),
  };
}

function buildRewardsVestingRequest(account: string, addresses: RewardsVestingAddresses) {
  return {
    gmx: {
      contractAddress: addresses.gmx,
      abiId: "Token",
      calls: {
        balanceOf: {
          methodName: "balanceOf",
          params: [account],
        },
      },
    },
    esGmx: {
      contractAddress: addresses.esGmx,
      abiId: "Token",
      calls: {
        balanceOf: {
          methodName: "balanceOf",
          params: [account],
        },
      },
    },
    stakedGmxTracker: {
      contractAddress: addresses.stakedGmxTracker,
      abiId: "RewardTracker",
      calls: {
        gmxDepositBalance: {
          methodName: "depositBalances",
          params: [account, addresses.gmx],
        },
      },
    },
    feeGmxTracker: {
      contractAddress: addresses.feeGmxTracker,
      abiId: "RewardTracker",
      calls: {
        balanceOf: {
          methodName: "balanceOf",
          params: [account],
        },
      },
    },
    reader: {
      contractAddress: addresses.reader,
      abiId: "ReaderV2",
      calls: {
        getVestingInfo: {
          methodName: "getVestingInfo",
          params: [account, [addresses.gmxVester]],
        },
      },
    },
    gmxVester: {
      contractAddress: addresses.gmxVester,
      abiId: "Vester",
      calls: {
        vestingDuration: {
          methodName: "vestingDuration",
          params: [],
        },
      },
    },
  } satisfies MulticallRequestConfig<any>;
}

function parseRewardsVestingResponse(
  result: MulticallResult<MulticallRequestConfig<any>>
): RewardsVestingContractsData {
  const walletGmxBalance = getFirstReturnValue(result.data.gmx?.balanceOf?.returnValues);
  const walletEsGmxBalance = getFirstReturnValue(result.data.esGmx?.balanceOf?.returnValues);
  const stakedGmxBalance = getFirstReturnValue(result.data.stakedGmxTracker?.gmxDepositBalance?.returnValues);
  const freePairAmount = getFirstReturnValue(result.data.feeGmxTracker?.balanceOf?.returnValues);
  const vestingDuration = getFirstReturnValue(result.data.gmxVester?.vestingDuration?.returnValues);
  const vestingInfo = parseVestingInfo(result.data.reader?.getVestingInfo?.returnValues);

  if (
    walletGmxBalance === undefined ||
    walletEsGmxBalance === undefined ||
    stakedGmxBalance === undefined ||
    freePairAmount === undefined ||
    vestingDuration === undefined ||
    vestingInfo === undefined
  ) {
    throw new Error("Incomplete rewards vesting response");
  }

  return {
    walletGmxBalance,
    walletEsGmxBalance,
    stakedGmxBalance,
    freePairAmount,
    vestingInfo,
    vestingDuration,
  };
}

function parseVestingInfo(returnValues: unknown): VestingInfo | undefined {
  if (!Array.isArray(returnValues) || returnValues.length < 7) {
    return undefined;
  }

  const [pairAmount, vestedAmount, escrowedBalance, claimedAmounts, claimable, maxVestableAmount, averageStakedAmount] =
    returnValues;

  if (
    typeof pairAmount !== "bigint" ||
    typeof vestedAmount !== "bigint" ||
    typeof escrowedBalance !== "bigint" ||
    typeof claimedAmounts !== "bigint" ||
    typeof claimable !== "bigint" ||
    typeof maxVestableAmount !== "bigint" ||
    typeof averageStakedAmount !== "bigint"
  ) {
    return undefined;
  }

  return {
    pairAmount,
    vestedAmount,
    escrowedBalance,
    claimedAmounts,
    claimable,
    maxVestableAmount,
    averageStakedAmount,
  };
}

function getFirstReturnValue(returnValues: unknown): bigint | undefined {
  if (!Array.isArray(returnValues) || typeof returnValues[0] !== "bigint") {
    return undefined;
  }

  return returnValues[0];
}
