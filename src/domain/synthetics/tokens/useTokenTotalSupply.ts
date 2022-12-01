import Token from "abis/Token.json";
import { useMulticall } from "lib/multicall";
import { BigNumber } from "ethers";
import { TokenTotalSupplyData } from "./types";
import { isAddressZero } from "lib/legacy";
import { useMemo } from "react";

export function useTokenTotalSupply(chainId: number, p: { tokenAddresses: string[] }): TokenTotalSupplyData {
  const { data } = useMulticall(
    chainId,
    p.tokenAddresses.length > 0 ? ["useTokenTotalSupply", p.tokenAddresses.join("-")] : null,
    p.tokenAddresses
      .filter((address) => !isAddressZero(address))
      .reduce((acc, address) => {
        acc[address] = {
          contractAddress: address,
          abi: Token.abi,
          calls: {
            totalSupply: {
              methodName: "totalSupply",
              params: [],
            },
          },
        };

        return acc;
      }, {})
  );

  const result: TokenTotalSupplyData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return {
        totalSupply: {},
      };
    }

    const totalSupply: { [address: string]: BigNumber } = {};

    Object.keys(data).forEach((address) => {
      totalSupply[address] = data[address].totalSupply.returnValues[0];
    });

    return {
      totalSupply,
    };
  }, [data]);

  return result;
}
