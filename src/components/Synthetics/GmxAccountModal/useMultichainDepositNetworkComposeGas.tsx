// import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/dataEntities/constants";
// import { NODE_INTERFACE_ADDRESS } from "@arbitrum/sdk/dist/lib/abi/factories/NodeInterface__factory";
import { useEffect } from "react";
import useSWR from "swr";
import { Address, StateOverride, toHex, zeroAddress } from "viem";
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

  const fakeInputAmount = 1n * 10n ** 18n;
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

      try {
        const settlementChainEndpointId = getStargateEndpointId(settlementChainId);
        const sourceChainEndpointId = getStargateEndpointId(depositViewChain);

        if (!settlementChainEndpointId) {
          throw new Error("Stargate endpoint ID not found");
        }

        if (!sourceChainEndpointId) {
          throw new Error("Stargate endpoint ID not found");
        }

        const message = OFTComposeMsgCodec.encode(0, settlementChainEndpointId, fakeInputAmount, composeFromWithMsg);

        const stargatePool = getStargatePoolAddress(settlementChainId, depositViewTokenAddress);

        if (!stargatePool) {
          throw new Error("Stargate pool not found");
        }

        const address = tryGetContract(settlementChainId, "LayerZeroProvider")!;

        if (!address) {
          throw new Error("LayerZero provider not found");
        }

        const stateOverride: StateOverride = [];

        if (depositViewTokenAddress !== zeroAddress) {
          const stateOverrideForErc20: StateOverride[number] = {
            address: depositViewTokenAddress as Address,
            code: "0x608060405234801561001057600080fd5b50600436106100835760003560e01c806306fdde0314610088578063095ea7b3146100ca57806318160ddd146100ed57806323b872dd14610103578063313ce5671461011657806370a082311461012557806395d89b4114610138578063a9059cbb14610157578063dd62ed3e1461016a575b600080fd5b60408051808201909152601481527326b7b1b5902ab73634b6b4ba32b2102a37b5b2b760611b60208201525b6040516100c191906103ae565b60405180910390f35b6100dd6100d8366004610418565b61017d565b60405190151581526020016100c1565b6100f56101ea565b6040519081526020016100c1565b6100dd610111366004610442565b6101fe565b604051601281526020016100c1565b6100f561013336600461047e565b6102c6565b60408051808201909152600381526213555560ea1b60208201526100b4565b6100dd610165366004610418565b6102fa565b6100f5610178366004610499565b610374565b3360008181526001602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906101d89086815260200190565b60405180910390a35060015b92915050565b60006101f960026000196104e2565b905090565b60008161020b8533610374565b6102159190610504565b6001600160a01b038516600090815260016020908152604080832033845290915290205581610243856102c6565b61024d9190610504565b6001600160a01b03851660009081526020819052604090205581610270846102c6565b61027a9190610517565b6001600160a01b0384811660008181526020818152604091829020949094555185815290929187169160008051602061052b833981519152910160405180910390a35060019392505050565b6001600160a01b0381166000908152602081905260408120548082036101e4576102f360026000196104e2565b9392505050565b600081610306336102c6565b6103109190610504565b33600081815260208190526040902091909155829061032e906102c6565b6103389190610517565b6001600160a01b0384166000818152602081815260409182902093909355518481529091339160008051602061052b83398151915291016101d8565b6001600160a01b0380831660009081526001602090815260408083209385168352929052908120548082036102f3576000199150506101e4565b600060208083528351808285015260005b818110156103db578581018301518582016040015282016103bf565b506000604082860101526040601f19601f8301168501019250505092915050565b80356001600160a01b038116811461041357600080fd5b919050565b6000806040838503121561042b57600080fd5b610434836103fc565b946020939093013593505050565b60008060006060848603121561045757600080fd5b610460846103fc565b925061046e602085016103fc565b9150604084013590509250925092565b60006020828403121561049057600080fd5b6102f3826103fc565b600080604083850312156104ac57600080fd5b6104b5836103fc565b91506104c3602084016103fc565b90509250929050565b634e487b7160e01b600052601160045260246000fd5b6000826104ff57634e487b7160e01b600052601260045260246000fd5b500490565b818103818111156101e4576101e46104cc565b808201808211156101e4576101e46104cc56feddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa2646970667358221220aa82e9605a01c10c7889cf6596bfde251ec3112e04b47e947ce9abd7e144de0964736f6c63430008120033",
          };
          stateOverride.push(stateOverrideForErc20);
        } else {
          const stateOverrideForNative: StateOverride[number] = {
            address,
            balance: fakeInputAmount * 10n,
          };
          stateOverride.push(stateOverrideForNative);
        }

        const gas = await settlementChainPublicClient.estimateContractGas({
          address,
          abi: abis.LayerZeroProviderArbitrumSepolia,
          functionName: "lzCompose",
          args: [
            // From
            stargatePool,
            // Guid
            toHex(0, { size: 32 }),
            // Message
            message,
            // Executor
            zeroAddress,
            // Extra Data
            "0x",
          ],
          account: CodecUiHelper.getLzEndpoint(settlementChainId),
          stateOverride,
        });

        return (gas * 11n) / 10n; // +10%
      } catch (error) {
        return FALLBACK_COMPOSE_GAS;
      }
    },
    refreshInterval: 5000,
  });
  const composeGas = composeGasQuery.data;

  useEffect(() => {
    console.log("composeGas", composeGas);
  }, [composeGas]);

  return {
    composeGas,
  };
}
