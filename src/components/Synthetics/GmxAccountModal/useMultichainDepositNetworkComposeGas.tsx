import useSWR from "swr";
import { AbiItemArgs, Address, PublicClient, StateOverride, toHex, zeroAddress, zeroHash } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { ARBITRUM_SEPOLIA, type UiContractsChain, type UiSettlementChain, type UiSourceChain } from "config/chains";
import { tryGetContract } from "config/contracts";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getLayerZeroEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
} from "context/GmxAccountContext/config";
import { useChainId } from "lib/chains";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { numberToBigint } from "lib/numbers";
import { getToken, getTokenBySymbol } from "sdk/configs/tokens";
import { layerZeroProviderAbi } from "wagmi-generated";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OFTComposeMsgCodec } from "./codecs/OFTComposeMsgCodec";

export function useMultichainDepositNetworkComposeGas(opts?: {
  enabled?: boolean;
  action?: MultichainAction;
  tokenAddress?: string;
}): {
  composeGas: bigint | undefined;
} {
  const { chainId, srcChainId } = useChainId();

  const tokenAddress: string | undefined = opts?.tokenAddress ?? CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId];

  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId });

  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    srcChainId &&
    tokenAddress !== undefined &&
    getStargatePoolAddress(chainId, tokenAddress) !== undefined &&
    tryGetContract(chainId, "LayerZeroProvider") !== undefined &&
    srcChainId !== (chainId as UiSourceChain) &&
    opts?.enabled !== false;

  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition ? ["composeGas", account, chainId, srcChainId, tokenAddress] : null,
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
          tokenAddress,
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

const FAKE_INPUT_AMOUNT_MAP: Record<string, bigint> = {
  "USDC.SG": numberToBigint(1, getTokenBySymbol(ARBITRUM_SEPOLIA, "USDC.SG").decimals),
  ETH: numberToBigint(0.0015, getTokenBySymbol(ARBITRUM_SEPOLIA, "ETH").decimals),
};

export async function estimateMultichainDepositNetworkComposeGas({
  action,
  chainId,
  account,
  srcChainId,
  tokenAddress,
  settlementChainPublicClient,
}: {
  action?: MultichainAction;
  chainId: UiContractsChain;
  account: Address;
  srcChainId: UiSourceChain;
  tokenAddress: string;
  settlementChainPublicClient: PublicClient;
}): Promise<bigint> {
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

  const fakeAmount = FAKE_INPUT_AMOUNT_MAP[getToken(chainId, tokenAddress).symbol] ?? 10n ** 18n;

  const message = OFTComposeMsgCodec.encode(0, settlementChainEndpointId, fakeAmount, composeFromWithMsg);

  const stargatePool = getStargatePoolAddress(chainId, tokenAddress);

  if (!stargatePool) {
    throw new Error("Stargate pool not found");
  }

  const address = tryGetContract(chainId, "LayerZeroProvider")!;

  if (!address) {
    throw new Error("LayerZero provider not found");
  }

  const stateOverride: StateOverride = [];

  if (tokenAddress !== zeroAddress) {
    const randomSlot = "0x23995301f0ea59f7cace2ae906341fc4662f3f5d23f124431ee3520d1070148c";

    const stateOverrideForErc20: StateOverride[number] = {
      address: tokenAddress as Address,
      code: OVERRIDE_ERC20_BYTECODE,
      state: [
        {
          slot: randomSlot,
          value: zeroHash,
        },
      ],
    };
    stateOverride.push(stateOverrideForErc20);
  } else {
    const stateOverrideForNative: StateOverride[number] = {
      address,
      balance: fakeAmount * 2n,
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
    abi: layerZeroProviderAbi,
    functionName: "lzCompose",
    args,
    account: CodecUiHelper.getLzEndpoint(chainId),
    stateOverride,
  });

  return applyGasLimitBuffer(gas);
}
