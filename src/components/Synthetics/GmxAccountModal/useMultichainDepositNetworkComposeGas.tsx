import useSWR from "swr";
import { Address, StateOverride, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { tryGetContract } from "config/contracts";
import {
  getStargateEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
} from "context/GmxAccountContext/config";
import { useGmxAccountDepositViewTokenAddress, useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { abis } from "sdk/abis";

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

const FALLBACK_COMPOSE_GAS = 200_000n;

export function useMultichainDepositNetworkComposeGas(): {
  composeGas: bigint | undefined;
} {
  const [settlementChainId] = useGmxAccountSettlementChainId();
  const { chainId: walletChainId } = useAccount();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId: settlementChainId });

  const fakeInputAmount = 1n * 10n ** 18n;
  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    walletChainId &&
    depositViewTokenAddress &&
    getStargatePoolAddress(settlementChainId, depositViewTokenAddress) !== undefined &&
    tryGetContract(settlementChainId, "LayerZeroProvider") !== undefined &&
    walletChainId !== settlementChainId;
  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition
      ? ["composeGas", account, settlementChainId, walletChainId, depositViewTokenAddress]
      : null,
    {
      fetcher: async () => {
        if (!composeGasQueryCondition) {
          return undefined;
        }

        const composeFromWithMsg = CodecUiHelper.composeMessage(settlementChainId, account, walletChainId);

        try {
          const settlementChainEndpointId = getStargateEndpointId(settlementChainId);
          const sourceChainEndpointId = getStargateEndpointId(walletChainId);

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
          console.log("Error composing gas for deposit", error);

          return FALLBACK_COMPOSE_GAS;
        }
      },
      refreshInterval: 5000,
    }
  );
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
  };
}
