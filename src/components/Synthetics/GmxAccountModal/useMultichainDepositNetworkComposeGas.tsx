import useSWR from "swr";
import { AbiItemArgs, Address, StateOverride, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import type { UiSettlementChain, UiSourceChain } from "config/chains";
import { tryGetContract } from "config/contracts";
import {
  getStargateEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
} from "context/GmxAccountContext/config";
import { useGmxAccountDepositViewTokenAddress } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { abis } from "sdk/abis";
import { layerZeroProviderAbi } from "wagmi-generated";

import { CodecUiHelper, OFTComposeMsgCodec } from "components/Synthetics/GmxAccountModal/OFTComposeMsgCodec";

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

export function useMultichainDepositNetworkComposeGas(): {
  composeGas: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId });

  const fakeInputAmount = 1n * 10n ** 18n;
  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    srcChainId &&
    depositViewTokenAddress &&
    getStargatePoolAddress(chainId, depositViewTokenAddress) !== undefined &&
    tryGetContract(chainId, "LayerZeroProvider") !== undefined &&
    srcChainId !== (chainId as UiSourceChain);
  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition ? ["composeGas", account, chainId, srcChainId, depositViewTokenAddress] : null,
    {
      fetcher: async () => {
        if (!composeGasQueryCondition) {
          return undefined;
        }

        const composeFromWithMsg = CodecUiHelper.composeMessage(chainId as UiSettlementChain, account, srcChainId);

        const settlementChainEndpointId = getStargateEndpointId(chainId);
        const sourceChainEndpointId = getStargateEndpointId(srcChainId);

        if (!settlementChainEndpointId) {
          throw new Error("Stargate endpoint ID not found");
        }

        if (!sourceChainEndpointId) {
          throw new Error("Stargate endpoint ID not found");
        }

        const message = OFTComposeMsgCodec.encode(0, settlementChainEndpointId, fakeInputAmount, composeFromWithMsg);

        const stargatePool = getStargatePoolAddress(chainId, depositViewTokenAddress);

        if (!stargatePool) {
          throw new Error("Stargate pool not found");
        }

        const address = tryGetContract(chainId, "LayerZeroProvider")!;

        if (!address) {
          throw new Error("LayerZero provider not found");
        }

        const stateOverride: StateOverride = [];

        if (depositViewTokenAddress !== zeroAddress) {
          const stateOverrideForErc20: StateOverride[number] = {
            address: depositViewTokenAddress as Address,
            code: OVERRIDE_ERC20_BYTECODE,
          };
          stateOverride.push(stateOverrideForErc20);
        } else {
          const stateOverrideForNative: StateOverride[number] = {
            address,
            balance: fakeInputAmount * 10n,
          };
          stateOverride.push(stateOverrideForNative);
        }

        const args: AbiItemArgs<typeof layerZeroProviderAbi, "lzCompose"> = [
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
        ];

        const gas = await settlementChainPublicClient.estimateContractGas({
          address,
          abi: abis.LayerZeroProviderArbitrumSepolia,
          functionName: "lzCompose",
          args,
          account: CodecUiHelper.getLzEndpoint(chainId),
          stateOverride,
        });

        return applyGasLimitBuffer(gas);
      },
      refreshInterval: 5000,
    }
  );
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
  };
}
