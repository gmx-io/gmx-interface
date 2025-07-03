import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { priceFeedKey } from "config/dataStore";
import { useMulticall } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getV2Tokens, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

export function useOnchainTokenConfigs(chainId: ContractsChainId) {
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

      const result: { [tokenAddress: string]: { hasPriceFeedProvider: boolean } } = {};

      for (const token of tokens) {
        const priceFeedAddress = response.data[`${token.address}-priceFeed`].chainlinkPriceFeedAddress.returnValues[0];

        result[token.address] = {
          hasPriceFeedProvider: priceFeedAddress !== zeroAddress,
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
