import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useMulticall } from "lib/multicall";

import GlpManager from "abis/GlpManager.json";
import ReaderV2 from "abis/ReaderV2.json";
import RewardReader from "abis/RewardReader.json";
import Token from "abis/Token.json";
import Vault from "abis/Vault.json";
import { getRawDexGmxRequest, parseGmxPriceFromRawDexData } from "pages/Dashboard/useDashboardV2InfoRequest";

export function useStakeV2InfoRequest() {
  const chainId = useSelector(selectChainId);
  const { address: account } = useAccount();

  const rewardReaderAddress = getContract(chainId, "RewardReader");
  const readerAddress = getContract(chainId, "Reader");

  const vaultAddress = getContract(chainId, "Vault");
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const gmxAddress = getContract(chainId, "GMX");
  const esGmxAddress = getContract(chainId, "ES_GMX");
  const bnGmxAddress = getContract(chainId, "BN_GMX");
  const glpAddress = getContract(chainId, "GLP");

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");

  const glpManagerAddress = getContract(chainId, "GlpManager");

  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor");
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor");

  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress];

  const walletTokens = [gmxAddress, esGmxAddress, glpAddress, stakedGmxTrackerAddress];
  const depositTokens = [
    gmxAddress,
    esGmxAddress,
    stakedGmxTrackerAddress,
    bonusGmxTrackerAddress,
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
  ];

  const data = useMulticall(chainId, "useStakeV2InfoRequest", {
    key: account && [account],
    request: {
      readerV2: {
        abi: ReaderV2.abi,
        contractAddress: readerAddress,
        calls: {
          tokenBalancesWithSupplies: {
            methodName: "getTokenBalancesWithSupplies",
            params: [account, walletTokens],
          },
          esGmxSupply: {
            methodName: "getTokenSupply",
            params: [esGmxAddress, excludedEsGmxAccounts],
          },
        },
      },
      rewardReader: {
        abi: RewardReader.abi,
        contractAddress: rewardReaderAddress,
        calls: {
          depositBalances: {
            methodName: "getDepositBalances",
            params: [account, depositTokens, rewardTrackersForDepositBalances],
          },
          stakingInfo: {
            methodName: "getStakingInfo",
            params: [account, rewardTrackersForStakingInfo],
          },
        },
      },
      stakedGmxSupply: {
        abi: Token.abi,
        contractAddress: gmxAddress,
        calls: {
          balanceOf: {
            methodName: "balanceOf",
            params: [stakedGmxTrackerAddress],
          },
        },
      },
      aums: {
        abi: GlpManager.abi,
        contractAddress: glpManagerAddress,
        calls: {
          aums: {
            methodName: "getAums",
            params: [],
          },
        },
      },
      vault: {
        abi: Vault.abi,
        contractAddress: vaultAddress,
        calls: {
          minPrice: {
            methodName: "getMinPrice",
            params: [nativeTokenAddress],
          },
        },
      },
      ...getRawDexGmxRequest(chainId),
    },
    parseResponse: (result) => {
      return {
        walletBalances: result.data.readerV2.tokenBalancesWithSupplies.returnValues as bigint[],
        depositBalances: result.data.rewardReader.depositBalances.returnValues as bigint[],
        stakingInfo: result.data.rewardReader.stakingInfo.returnValues as bigint[],
        stakedGmxSupply: result.data.stakedGmxSupply.balanceOf.returnValues[0] as bigint,
        aums: result.data.aums.aums.returnValues as bigint[],
        nativeTokenPrice: result.data.vault.minPrice.returnValues[0] as bigint,
        esGmxSupply: result.data.readerV2.esGmxSupply.returnValues[0] as bigint,
        gmxPrice: parseGmxPriceFromRawDexData(chainId, result.data.vault.minPrice.returnValues[0] as bigint, result),
      };
    },
    refreshInterval: null,
  });

  return data;
}
