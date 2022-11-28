import { useWeb3React } from "@web3-react/core";
import { getNativeToken } from "config/tokens";
import Token from "abis/Token.json";
import { isAddressZero } from "lib/legacy";
import { contractFetcher } from "lib/contracts";
import useSWR from "swr";
import { BigNumber } from "ethers";

export function useTokenAllowance(chainId: number, tokenAddress?: string, spenderAddress?: string) {
  const { active, account, library } = useWeb3React();

  const nativeToken = getNativeToken(chainId);

  const tokenAllowanceAddress = isAddressZero(tokenAddress) ? nativeToken.address : tokenAddress;

  const { data: tokenAllowance } = useSWR<BigNumber>(
    active && tokenAllowanceAddress && spenderAddress
      ? [active, chainId, tokenAllowanceAddress, "allowance", account, spenderAddress]
      : null,
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  return tokenAllowance;
}
