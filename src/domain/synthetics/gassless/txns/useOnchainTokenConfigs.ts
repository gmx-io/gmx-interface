import { getContract } from "config/contracts";
import { priceFeedKey } from "config/dataStore";
import { PermitConfig } from "domain/tokens";
import { useMulticall } from "lib/multicall";
import { getV2Tokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
export function useOnchainTokensConfigs(chainId: number) {
  const tokens = getV2Tokens(chainId);

  const { data, error } = useMulticall(chainId, "useOnchainTokenConfigs", {
    key: [],

    refreshInterval: null,

    request: () =>
      tokens.reduce((acc, token) => {
        acc[`${token.address}-priceFeed`] = {
          contractAddress: getContract(chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            chainlinkPriceFeedAddress: {
              methodName: "getAddress",
              params: [priceFeedKey(token.address)],
            },
          },
        };

        return acc;
      }, {}),

    parseResponse: (response) => {
      const tokens = getV2Tokens(chainId);

      const result: { [tokenAddress: string]: { priceFeedAddress: string; permitConfig: PermitConfig | undefined } } =
        {};

      for (const token of tokens) {
        const priceFeedAddress = response.data[`${token.address}-priceFeed`].chainlinkPriceFeedAddress.returnValues[0];
        // const permitData = !response.errors[`${token.address}-permitData`]
        //   ? response.data[`${token.address}-permitData`]
        //   : undefined;

        // const domainSeparator = permitData?.domainSeparator.returnValues[0];
        // const nonce = permitData?.nonces.returnValues[0];
        // const name = permitData?.name.returnValues[0];
        // const version = permitData.version.returnValues[0];

        result[token.address] = {
          priceFeedAddress,
          permitConfig: undefined,
          //   permitConfig: permitData
          //     ? {
          //         domainSeparator,
          //         nonce,
          //         name,
          //         version,
          //       }
          //     : undefined,
        };
      }

      result[NATIVE_TOKEN_ADDRESS] = result[getWrappedToken(chainId).address];

      return result;
    },
  });

  return {
    data,
    error,
  };
}
