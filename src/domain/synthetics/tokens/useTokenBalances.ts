import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { useMultiCall } from "lib/multicall";
import { bigNumberify } from "lib/numbers";
import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";

const { AddressZero } = ethers.constants;

/**
 * TODO
 * - parsing BigNumbers?
 * - Type inference of results
 * - Common patterns of request states
 * - Polling interval
 */
function formatResults(response = {}) {
  const result = {};

  Object.keys(response).forEach((address) => {
    result[address] = bigNumberify(response[address].balance.returnValues[0]) || BigNumber.from(0);
  });

  return result;
}

export function useMcTokenBalances(chainId: number, p: { tokenAddresses: string[] }) {
  const { account, active } = useWeb3React();

  const key = active && account ? `${"useMcTokenBalances"}-${account}-${p.tokenAddresses.join("-")}` : undefined;

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
    [AddressZero]: nativeTokenBalance,
    ...formattedERC20Balances,
  };

  return result;
}

export function useNativeTokenBalance() {
  const { library, active } = useWeb3React();

  const [balance, setBalance] = useState<BigNumber>();

  useEffect(() => {
    async function getBalance() {
      if (active && library && !balance) {
        const signer = library.getSigner();

        const result = await signer.getBalance("latest");

        setBalance(result);
      }
    }

    getBalance();
  }, [active, balance, library]);

  return balance;
}
