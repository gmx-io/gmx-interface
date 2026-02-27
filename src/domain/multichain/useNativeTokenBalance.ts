import { AnyChainId } from "config/chains";
import { MULTICALLS_MAP } from "config/multichain";
import { useMulticall } from "lib/multicall";

export function useNativeTokenBalance(chainId: AnyChainId | undefined, account: string | undefined) {
  const query = useMulticall(chainId, "useNativeTokenBalance", {
    key: account && chainId ? [chainId] : null,
    request: {
      balance: {
        abiId: "Multicall",
        contractAddress: (MULTICALLS_MAP as any)[chainId!],
        calls: {
          balance: {
            methodName: "getEthBalance",
            params: [account!],
          },
        },
      },
    },
    parseResponse: (response) => {
      return response.data.balance.balance.returnValues[0] as bigint;
    },
  });

  return query.data;
}
