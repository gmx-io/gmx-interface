// import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
// import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import useSWR from "swr";
import { Address, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { tryGetContract } from "config/contracts";
import { getStargateEndpointId, getStargatePoolAddress } from "context/GmxAccountContext/config";
import {
  useGmxAccountDepositViewChain,
  useGmxAccountDepositViewTokenAddress,
  useGmxAccountSettlementChainId,
} from "context/GmxAccountContext/hooks";
import { CodecUiHelper, OFTComposeMsgCodec } from "pages/DebugStargate/OFTComposeMsgCodec";
import { abis } from "sdk/abis";
// const { NODE_INTERFACE_ADDRESS } = require("@arbitrum/sdk/dist/lib/dataEntities/constants");
// i gave gas | was given                     | was spent
// 10m        | 27.2m                         | 208k
// 174k       | 3.2m (from estimated)         | 208k
// 1          | failed                        |
// 1k         | failed                        |
// 100k       | failed                        |
// 174k       | 3.2m (from estimated)         | 208k
// 157k       | 3.2m (from estimated - 10%)   | 208k
// 139k       | failed (from estimated - 20%) |
// 122k       | failed (from estimated - 30%) |

const FALLBACK_COMPOSE_GAS = 200_000n;

export function useMultichainDepositNetworkComposeGas(): {
  composeGas: bigint | undefined;
} {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const [depositViewChain] = useGmxAccountDepositViewChain();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { address: account } = useAccount();

  const fakeInputAmount = 10n * 10n ** 18n;
  const settlementChainPublicClient = usePublicClient({ chainId: settlementChainId });
  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    depositViewChain &&
    depositViewTokenAddress &&
    getStargatePoolAddress(settlementChainId, depositViewTokenAddress) !== undefined &&
    tryGetContract(settlementChainId, "LayerZeroProvider") !== undefined;
  const composeGasQuery = useSWR<bigint>(composeGasQueryCondition ? ["composeGas", account, settlementChainId] : null, {
    fetcher: async () => {
      if (!composeGasQueryCondition) {
        return 0n;
      }

      const composeFromWithMsg = CodecUiHelper.composeMessage(settlementChainId, account, depositViewChain);
      const message = OFTComposeMsgCodec.encode(
        0,
        getStargateEndpointId(settlementChainId)!,
        fakeInputAmount,
        composeFromWithMsg
      );

      try {
        const gas = await settlementChainPublicClient.estimateContractGas({
          address: tryGetContract(settlementChainId, "LayerZeroProvider")!,
          abi: abis.LayerZeroProviderArbitrumSepolia,
          functionName: "lzCompose",
          args: [
            getStargatePoolAddress(settlementChainId, depositViewTokenAddress),
            toHex(0, { size: 32 }),
            message,
            zeroAddress,
            "0x",
          ],
          account: CodecUiHelper.getLzEndpoint(settlementChainId),
          stateOverride: [
            {
              address: depositViewTokenAddress as Address,
              code: "0x608060405234801561001057600080fd5b50600436106100835760003560e01c806306fdde0314610088578063095ea7b3146100ca57806318160ddd146100ed57806323b872dd146100ff578063313ce5671461011257806370a082311461012157806395d89b4114610134578063a9059cbb14610153578063dd62ed3e14610166575b600080fd5b60408051808201909152601481527326b7b1b5902ab73634b6b4ba32b2102a37b5b2b760611b60208201525b6040516100c19190610319565b60405180910390f35b6100dd6100d8366004610383565b610179565b60405190151581526020016100c1565b6000195b6040519081526020016100c1565b6100dd61010d3660046103ad565b6101a7565b604051601281526020016100c1565b6100f161012f3660046103e9565b610249565b60408051808201909152600381526213555560ea1b60208201526100b4565b6100dd610161366004610383565b610273565b6100f1610174366004610404565b6102d8565b3360009081526001602081815260408084206001600160a01b03871685529091529091208290555b92915050565b6000816101b485336102d8565b6101be919061044d565b6001600160a01b0385166000908152600160209081526040808320338452909152902055816101ec85610249565b6101f6919061044d565b6001600160a01b038086166000908152602081905260408082209390935590851681522054610226908390610460565b6001600160a01b0384166000908152602081905260409020555060019392505050565b6001600160a01b0381166000908152602081905260408120548082036101a1575060001992915050565b60008161027f33610249565b610289919061044d565b33600090815260208190526040808220929092556001600160a01b038516815220546102b6908390610460565b6001600160a01b03841660009081526020819052604090205550600192915050565b6001600160a01b038083166000908152600160209081526040808320938516835292905290812054808203610312576000199150506101a1565b9392505050565b600060208083528351808285015260005b818110156103465785810183015185820160400152820161032a565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461037e57600080fd5b919050565b6000806040838503121561039657600080fd5b61039f83610367565b946020939093013593505050565b6000806000606084860312156103c257600080fd5b6103cb84610367565b92506103d960208501610367565b9150604084013590509250925092565b6000602082840312156103fb57600080fd5b61031282610367565b6000806040838503121561041757600080fd5b61042083610367565b915061042e60208401610367565b90509250929050565b634e487b7160e01b600052601160045260246000fd5b818103818111156101a1576101a1610437565b808201808211156101a1576101a161043756fea2646970667358221220c9db4923c5bc67d81c32141679fcc6f218100083720e9b5c41a2ab396e68f42264736f6c63430008140033",
            },
          ],
        });

        return gas;
      } catch (error) {
        return FALLBACK_COMPOSE_GAS;
      }
    },
    refreshInterval: 5000,
  });
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
  };
}
