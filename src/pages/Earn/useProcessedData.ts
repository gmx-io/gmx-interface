import { useMemo } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM } from "config/chains";
import { getContract } from "config/contracts";
import { useGmxPrice } from "domain/legacy";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import {
  PLACEHOLDER_ACCOUNT,
  getBalanceAndSupplyData,
  getDepositBalanceData,
  getProcessedData,
  getStakingData,
} from "lib/legacy";
import useWallet from "lib/wallets/useWallet";

import GlpManager from "sdk/abis/GlpManager.json";
import ReaderV2 from "sdk/abis/ReaderV2.json";
import RewardReader from "sdk/abis/RewardReader.json";
import Token from "sdk/abis/Token.json";
import Vault from "sdk/abis/Vault.json";

export function useProcessedData() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();

  const gmxSupplyUrl = getServerUrl(chainId, "/gmx_supply");

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

  const vestingData = useVestingData(account);

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  const { data: stakedGmxSupply } = useSWR<bigint>(
    [`StakeV2:stakedGmxSupply:${active}`, chainId, gmxAddress, "balanceOf", stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher<bigint>(signer, Token),
    }
  );

  const { data: aum } = useSWR<bigint | undefined>(
    [`processedData:getAums:${active}`, chainId, glpManagerAddress, "getAums"],
    {
      fetcher: async (key: any[]) => {
        const aums = await contractFetcher<bigint[]>(signer, GlpManager)(key);

        let aum: bigint | undefined;
        if (aums && aums.length > 0) {
          aum = (aums[0] + aums[1]) / 2n;
        }
        return aum;
      },
    }
  );

  const { data: nativeTokenPrice } = useSWR<bigint>(
    [`StakeV2:nativeTokenPrice:${active}`, chainId, vaultAddress, "getMinPrice", nativeTokenAddress],
    {
      fetcher: contractFetcher<bigint>(signer, Vault),
    }
  );

  const { data: gmxSupply } = useSWR<string>([gmxSupplyUrl], {
    fetcher: (args: [string]) => fetch(...args).then((res) => res.text()),
  });

  const balanceAndSupplyQuery = useSWR<ReturnType<typeof getBalanceAndSupplyData>>(
    [
      `processedData:walletBalances:${active}`,
      chainId,
      readerAddress,
      "getTokenBalancesWithSupplies",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: async (key: any[]) => {
        const walletBalances = await contractFetcher<bigint[]>(signer, ReaderV2, [walletTokens])(key);
        return getBalanceAndSupplyData(walletBalances);
      },
    }
  );

  const { balanceData, supplyData } = balanceAndSupplyQuery.data ?? {};

  const { data: depositBalanceData } = useSWR<ReturnType<typeof getDepositBalanceData>>(
    [
      `processedData:depositBalances:${active}`,
      chainId,
      rewardReaderAddress,
      "getDepositBalances",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: async (key: any[]) => {
        const depositBalances = await contractFetcher<bigint[]>(signer, RewardReader, [
          depositTokens,
          rewardTrackersForDepositBalances,
        ])(key);
        return getDepositBalanceData(depositBalances);
      },
    }
  );

  const { data: stakingData } = useSWR<ReturnType<typeof getStakingData>>(
    [
      `processedData:stakingInfo:${active}`,
      chainId,
      rewardReaderAddress,
      "getStakingInfo",
      account || PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: async (key: any[]) => {
        const stakingInfo = await contractFetcher<bigint[]>(signer, RewardReader, [rewardTrackersForStakingInfo])(key);
        return getStakingData(stakingInfo);
      },
    }
  );

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
