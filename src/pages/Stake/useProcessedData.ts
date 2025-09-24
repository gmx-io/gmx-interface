import { useMemo } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { getServerUrl } from "config/backend";
import { ARBITRUM, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useGmxPrice } from "domain/legacy";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import {
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getProcessedData,
  getStakingData,
} from "lib/legacy";
import { useMulticall } from "lib/multicall";
import type { MulticallRequestConfig, MulticallResult } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";

export function useProcessedData(targetChainId?: ContractsChainId) {
  const { active, signer, account } = useWallet();
  const { chainId: currentChainId } = useChainId();
  const chainId = targetChainId ?? currentChainId;

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply");

  const vestingData = useVestingData(account, chainId);

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const accountForQuery = account || PLACEHOLDER_ACCOUNT;

  const { data: contractsData } = useMulticall<
    MulticallRequestConfig<any>,
    StakeProcessedDataMulticallResult | undefined
  >(chainId, "Stake:useProcessedData", {
    key: chainId ? [accountForQuery, active ? "1" : "0"] : null,
    request: () =>
      buildStakeProcessedDataRequest({
        account: accountForQuery,
        chainId,
      }),
    parseResponse: parseStakeProcessedDataResponse,
  });

  const balanceData = contractsData?.balanceData;
  const supplyData = contractsData?.supplyData;
  const depositBalanceData = contractsData?.depositBalanceData;
  const stakingData = contractsData?.stakingData;
  const aum = contractsData?.aum;
  const nativeTokenPrice = contractsData?.nativeTokenPrice;
  const stakedGmxSupply = contractsData?.stakedGmxSupply;

  const { data: gmxSupply } = useSWR<string>([gmxSupplyUrl], {
    fetcher: (args: [string]) => fetch(...args).then((res) => res.text()),
  });

  const processedData = useMemo(
    () =>
      getProcessedData(
        balanceData,
        supplyData,
        depositBalanceData,
        stakingData,
        vestingData,
        aum,
        nativeTokenPrice,
        stakedGmxSupply,
        gmxPrice,
        gmxSupply
      ),
    [
      balanceData,
      supplyData,
      depositBalanceData,
      stakingData,
      vestingData,
      aum,
      nativeTokenPrice,
      stakedGmxSupply,
      gmxPrice,
      gmxSupply,
    ]
  );

  return processedData;
}

type StakeProcessedDataMulticallResult = {
  balanceData?: ReturnType<typeof getBalanceAndSupplyData>["balanceData"];
  supplyData?: ReturnType<typeof getBalanceAndSupplyData>["supplyData"];
  depositBalanceData?: ReturnType<typeof getDepositBalanceData>;
  stakingData?: ReturnType<typeof getStakingData>;
  aum?: bigint;
  nativeTokenPrice?: bigint;
  stakedGmxSupply?: bigint;
};

function buildStakeProcessedDataRequest({ chainId, account }: { chainId: ContractsChainId; account: string }) {
  const glpManagerAddress = getContract(chainId, "GlpManager");
  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const glpAddress = getContract(chainId, "GLP");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const extendedGmxTrackerAddress = getContract(chainId, "ExtendedGmxTracker");

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];
  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    extendedGmxTrackerAddress,
    bnGmxAddress,
    glpAddress,
  ];
  const rewardTrackersForDepositBalances = [
    stakedGmxTrackerAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGmxTrackerAddress,
    feeGlpTrackerAddress,
  ];
  const rewardTrackersForStakingInfo = [
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
    feeGmxTrackerAddress,
    stakedGlpTrackerAddress,
    feeGlpTrackerAddress,
    extendedGmxTrackerAddress,
  ];

  return {
    token: {
      contractAddress: gmxAddress,
      abiId: "Token",
      calls: {
        balanceOf:
          gmxAddress === zeroAddress || stakedGmxTrackerAddress === zeroAddress
            ? undefined
            : {
                methodName: "balanceOf",
                params: [stakedGmxTrackerAddress],
              },
      },
    },
    glpManager: {
      contractAddress: glpManagerAddress,
      abiId: "GlpManager",
      calls: {
        getAums:
          glpManagerAddress === zeroAddress
            ? undefined
            : {
                methodName: "getAums",
                params: [],
              },
      },
    },
    vault: {
      contractAddress: vaultAddress,
      abiId: "Vault",
      calls: {
        getMinPrice:
          vaultAddress === zeroAddress || nativeTokenAddress === zeroAddress
            ? undefined
            : {
                methodName: "getMinPrice",
                params: [nativeTokenAddress],
              },
      },
    },
    reader: {
      contractAddress: readerAddress,
      abiId: "ReaderV2",
      calls: {
        getTokenBalancesWithSupplies:
          readerAddress === zeroAddress
            ? undefined
            : {
                methodName: "getTokenBalancesWithSupplies",
                params: [account, walletTokens],
              },
      },
    },
    rewardReader: {
      contractAddress: rewardReaderAddress,
      abiId: "RewardReader",
      calls: {
        getDepositBalances:
          rewardReaderAddress === zeroAddress
            ? undefined
            : {
                methodName: "getDepositBalances",
                params: [account, depositTokens, rewardTrackersForDepositBalances],
              },
        getStakingInfo:
          rewardReaderAddress === zeroAddress
            ? undefined
            : {
                methodName: "getStakingInfo",
                params: [account, rewardTrackersForStakingInfo],
              },
      },
    },
  } satisfies MulticallRequestConfig<any>;
}

function parseStakeProcessedDataResponse(
  result: MulticallResult<MulticallRequestConfig<any>>
): StakeProcessedDataMulticallResult | undefined {
  const balanceOfReturnValues = result.data.token?.balanceOf?.returnValues;
  const aumsReturnValues = result.data.glpManager?.getAums?.returnValues as bigint[] | undefined;
  const nativeTokenPriceReturnValues = result.data.vault?.getMinPrice?.returnValues;
  const walletBalances = result.data.reader?.getTokenBalancesWithSupplies?.returnValues as bigint[] | undefined;
  const depositBalances = result.data.rewardReader?.getDepositBalances?.returnValues as bigint[] | undefined;
  const stakingInfo = result.data.rewardReader?.getStakingInfo?.returnValues as bigint[] | undefined;

  let stakedGmxSupply: bigint | undefined;
  if (balanceOfReturnValues) {
    stakedGmxSupply = balanceOfReturnValues[0] as bigint | undefined;
  }

  let aum: bigint | undefined;
  if (aumsReturnValues && aumsReturnValues.length >= 2) {
    aum = (aumsReturnValues[0] + aumsReturnValues[1]) / 2n;
  }

  const nativeTokenPrice = nativeTokenPriceReturnValues?.[0] as bigint | undefined;

  const balanceAndSupplyData = walletBalances ? getBalanceAndSupplyData(walletBalances) : undefined;
  const depositBalanceData = depositBalances ? getDepositBalanceData(depositBalances) : undefined;
  const stakingData = stakingInfo ? getStakingData(stakingInfo) : undefined;

  return {
    balanceData: balanceAndSupplyData?.balanceData,
    supplyData: balanceAndSupplyData?.supplyData,
    depositBalanceData,
    stakingData,
    aum,
    nativeTokenPrice,
    stakedGmxSupply,
  };
}
