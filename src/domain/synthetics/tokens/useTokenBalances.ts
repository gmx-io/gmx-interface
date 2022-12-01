import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { useMulticall } from "lib/multicall";
import { BigNumber, ethers } from "ethers";
import { useNativeTokenBalance } from "./useNativeTokenBalance";
import { TokenBalancesData } from "./types";
import { isAddressZero } from "lib/legacy";
import { MulticallResult } from "lib/multicall/types";

const { AddressZero } = ethers.constants;

export function useTokenBalances(chainId: number, p: { tokenAddresses: string[] }): TokenBalancesData {
  const { account, active } = useWeb3React();

  const { data: ERC20Data } = useMulticall(
    chainId,
    active && account ? ["useTokenBalances", account, p.tokenAddresses.join("-")] : null,
    p.tokenAddresses
      .filter((address) => !isAddressZero(address))
      .reduce((acc, address) => {
        acc[address] = {
          contractAddress: address,
          abi: Token.abi,
          calls: {
            balance: {
              methodName: "balanceOf",
              params: [account],
            },
          },
        };

        return acc;
      }, {})
  );

  const formattedERC20Balances = formatResults(ERC20Data);

  const nativeTokenBalance = useNativeTokenBalance();

  const result = {
    [AddressZero]: nativeTokenBalance || BigNumber.from(0),
    ...formattedERC20Balances,
  };

  return {
    tokenBalances: result,
  };
}

function formatResults(response: MulticallResult<any> = {}) {
  const result = {};

  Object.keys(response).forEach((address) => {
    result[address] = response[address].balance.returnValues[0] || BigNumber.from(0);
  });

  return result;
}
