import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { useMultiCall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { BigNumber, ethers } from "ethers";
import { useNativeTokenBalance } from "./useNativeTokenBalance";
import { TokenBalancesData } from "./types";

const { AddressZero } = ethers.constants;

/**
 * TODO
 * - parsing BigNumbers?
 * - Type inference of results
 * - Common patterns of request states
 * - Polling interval
 */
export function useTokenBalances(chainId: number, p: { tokenAddresses: string[] }): TokenBalancesData {
  const { account, active } = useWeb3React();

  const key = active && account ? `${"useTokenBalances"}-${account}-${p.tokenAddresses.join("-")}` : undefined;

  const { result: ERC20MulticallResult } = useMultiCall(
    key,
    p.tokenAddresses
      .filter((address) => address !== AddressZero)
      .map((address) => ({
        reference: address,
        contractAddress: address,
        abi: Token.abi,
        calls: [{ reference: "balance", methodName: "balanceOf", methodParameters: [account] }],
      }))
  );

  const formattedERC20Balances = formatResults(ERC20MulticallResult as any);

  const nativeTokenBalance = useNativeTokenBalance();

  const result = {
    [AddressZero]: nativeTokenBalance || BigNumber.from(0),
    ...formattedERC20Balances,
  };

  return {
    tokenBalances: result,
  };
}

function formatResults(response = {}) {
  const result = {};

  Object.keys(response).forEach((address) => {
    result[address] = bigNumberify(response[address].balance.returnValues[0]) || BigNumber.from(0);
  });

  return result;
}
