import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { getWrappedToken } from "config/tokens";
import { isAddressZero } from "lib/legacy";
import { useMulticall } from "lib/multicall";
import { MulticallRequestConfig } from "lib/multicall/types";
import { useMemo } from "react";
import { TokenAllowanceData } from "./types";

export function useTokenAllowance(
  chainId: number,
  p: { spenderAddress?: string; tokenAddresses: string[] }
): TokenAllowanceData {
  const { account } = useWeb3React();

  const wrappedToken = getWrappedToken(chainId);

  const reqKey =
    p.spenderAddress && p.tokenAddresses.length > 0 && account
      ? ["useTokenAllowance", account, p.spenderAddress, p.tokenAddresses.join("-")]
      : null;

  const { data } = useMulticall(
    chainId,
    reqKey,
    p.tokenAddresses.reduce((acc, address) => {
      acc[address] = {
        contractAddress: isAddressZero(address) ? wrappedToken.address : address,
        abi: Token.abi,
        calls: {
          allowance: {
            methodName: "allowance",
            params: [account, p.spenderAddress],
          },
        },
      };

      return acc;
    }, {} as MulticallRequestConfig<any>)
  );

  const result: TokenAllowanceData = useMemo(() => {
    if (!data || Object.keys(data).length === 0) {
      return {
        tokenAllowance: {},
      };
    }

    const tokenAllowance = Object.keys(data).reduce((acc, address) => {
      acc[address] = data[address].allowance.returnValues[0];

      return acc;
    }, {});

    return {
      tokenAllowance,
    };
  }, [data]);

  return result;
}
