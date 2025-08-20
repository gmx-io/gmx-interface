import { BOTANIX, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";

const DEFAULT_ASSETS_PER_SHARE = 10n ** 18n;

export const useBotanixStakingAssetsPerShare = ({ chainId }: { chainId: ContractsChainId }): bigint | undefined => {
  const { data: botanixData } = useMulticall(chainId, "useBotanixStakingAssetsPerShare_StBTC", {
    key: chainId === BOTANIX ? [] : null,
    request: () => {
      return {
        stbtc: {
          contractAddress: getContract(chainId, "StBTC"),
          abiId: "StBTC",
          calls: {
            assetsPerShare: {
              methodName: "assetsPerShare",
              params: [],
            },
          },
        },
      };
    },
    parseResponse: (res) => {
      const returnValues = res.data.stbtc.assetsPerShare.returnValues;

      return {
        assetsPerShare: returnValues[0],
      };
    },
  });

  // it's not stable yet, so we return a default value if the data is not available
  return botanixData?.assetsPerShare ?? DEFAULT_ASSETS_PER_SHARE;
};
