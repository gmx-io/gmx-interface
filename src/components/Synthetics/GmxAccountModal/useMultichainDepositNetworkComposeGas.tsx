import useSWR from "swr";
import { AbiItemArgs, Address, PublicClient, StateOverride, toHex, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import type { UiContractsChain, UiSettlementChain, UiSourceChain } from "config/chains";
import { tryGetContract } from "config/contracts";
import {
  getLayerZeroEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
} from "context/GmxAccountContext/config";
import { useGmxAccountDepositViewTokenAddress } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { abis } from "sdk/abis";
import { layerZeroProviderAbi } from "wagmi-generated";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OFTComposeMsgCodec } from "./codecs/OFTComposeMsgCodec";

const FAKE_INPUT_AMOUNT = 1n * 10n ** 18n;

export function useMultichainDepositNetworkComposeGas(opts?: { enabled?: boolean; action?: MultichainAction }): {
  composeGas: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();
  const [depositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId });

  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    srcChainId &&
    depositViewTokenAddress &&
    getStargatePoolAddress(chainId, depositViewTokenAddress) !== undefined &&
    tryGetContract(chainId, "LayerZeroProvider") !== undefined &&
    srcChainId !== (chainId as UiSourceChain) &&
    opts?.enabled !== false;

  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition ? ["composeGas", account, chainId, srcChainId, depositViewTokenAddress] : null,
    {
      fetcher: async () => {
        if (!composeGasQueryCondition) {
          return undefined;
        }

        return estimateMultichainDepositNetworkComposeGas({
          action: opts?.action,
          chainId,
          account,
          srcChainId,
          depositViewTokenAddress,
          settlementChainPublicClient,
        });
      },
      refreshInterval: 5000,
    }
  );
  const composeGas = composeGasQuery.data;

  return {
    composeGas,
  };
}

export async function estimateMultichainDepositNetworkComposeGas({
  action,
  chainId,
  account,
  srcChainId,
  depositViewTokenAddress,
  settlementChainPublicClient,
}: {
  action?: MultichainAction;
  chainId: UiContractsChain;
  account: Address;
  srcChainId: UiSourceChain;
  depositViewTokenAddress: string;
  settlementChainPublicClient: PublicClient;
}) {
  const data = action ? CodecUiHelper.encodeMultichainActionData(action) : undefined;
  const composeFromWithMsg = CodecUiHelper.composeDepositMessage(chainId as UiSettlementChain, account, data);

  const settlementChainEndpointId = getLayerZeroEndpointId(chainId);
  const sourceChainEndpointId = getLayerZeroEndpointId(srcChainId);

  if (!settlementChainEndpointId) {
    throw new Error("Stargate endpoint ID not found");
  }

  if (!sourceChainEndpointId) {
    throw new Error("Stargate endpoint ID not found");
  }

  const message = OFTComposeMsgCodec.encode(0, settlementChainEndpointId, FAKE_INPUT_AMOUNT, composeFromWithMsg);

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
      balance: FAKE_INPUT_AMOUNT * 10n,
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
}
