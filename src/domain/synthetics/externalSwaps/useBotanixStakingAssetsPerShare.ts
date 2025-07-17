import { BOTANIX } from "config/chains";
import { getContract } from "config/contracts";
import { useMulticall } from "lib/multicall";

export const useBotanixStakingAssetsPerShare = ({ chainId }: { chainId: number }): bigint | undefined => {
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

  return botanixData?.assetsPerShare;
};
