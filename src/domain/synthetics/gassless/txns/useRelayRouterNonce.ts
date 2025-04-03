import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";

export function useRelayRouterNonce() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccount } = useSubaccountContext();

  const { data: nonce } = useMulticall(chainId, "useRelayRouterNonce", {
    key: account ? [account, subaccount?.address] : null,
    request: {
      relayRouter: {
        contractAddress: getContract(
          chainId,
          subaccount?.address ? "SubaccountGelatoRelayRouter" : "GelatoRelayRouter"
        ),
        abiId: "GelatoRelayRouter",
        calls: {
          nonce: {
            methodName: "userNonces",
            params: [account],
          },
        },
      },
    },
    parseResponse: (result) => {
      return BigInt(result.data.relayRouter.nonce.returnValues[0]);
    },
  });

  return useMemo(() => {
    return {
      relayRouterNonce: nonce,
    };
  }, [nonce]);
}
