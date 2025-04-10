import { useMemo } from "react";

import { getContract } from "config/contracts";
import { useSubaccountContext } from "context/SubaccountContext/SubaccountContextProvider";
import { ethers, Signer } from "ethers";
import { useChainId } from "lib/chains";
import { useMulticall } from "lib/multicall";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

export function useRelayRouterNonce() {
  const { chainId } = useChainId();
  const { account } = useWallet();
  const { subaccount } = useSubaccountContext();

  const { data: nonces, mutate } = useMulticall(chainId, "useRelayRouterNonce", {
    key: account ? [account, subaccount?.address] : null,
    request: {
      relayRouter: {
        contractAddress: getContract(chainId, "GelatoRelayRouter"),
        abiId: "GelatoRelayRouter",
        calls: {
          accountNonce: {
            methodName: "userNonces",
            params: [account],
          },
          subaccountNonce: subaccount?.address
            ? {
                methodName: "userNonces",
                params: [subaccount.address],
              }
            : undefined,
        },
      },
    },
    parseResponse: (result) => {
      return {
        accountNonce: BigInt(result.data.relayRouter.accountNonce.returnValues[0]),
        subaccountNonce: result.data.relayRouter.subaccountNonce?.returnValues[0]
          ? BigInt(result.data.relayRouter.subaccountNonce.returnValues[0])
          : undefined,
      };
    },
  });

  return useMemo(() => {
    return {
      relayRouterNonces: nonces,
      updateRelayRouterNonces: mutate,
    };
  }, [nonces, mutate]);
}

export async function getRelayRouterNonceForSigner(chainId: number, signer: Signer) {
  const contractAddress = getContract(chainId, "GelatoRelayRouter");
  const contract = new ethers.Contract(contractAddress, abis.GelatoRelayRouter, signer);

  return contract.userNonces(await signer.getAddress());
}
