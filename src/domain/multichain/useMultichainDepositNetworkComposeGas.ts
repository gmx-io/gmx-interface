import useSWR from "swr";
import { Address, PublicClient, StateOverride, toHex, zeroAddress, zeroHash } from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { type ContractsChainId, type SettlementChainId, type SourceChainId } from "config/chains";
import { tryGetContract } from "config/contracts";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  FAKE_INPUT_AMOUNT_MAP,
  getLayerZeroEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
  RANDOM_SLOT,
} from "config/multichain";
import { useGmxAccountDepositViewChain } from "context/GmxAccountContext/hooks";
import { useChainId } from "lib/chains";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { abis } from "sdk/abis";
import { getToken, isValidTokenSafe } from "sdk/configs/tokens";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OFTComposeMsgCodec } from "./codecs/OFTComposeMsgCodec";

const MULTICHAIN_DEPOSIT_NETWORK_COMPOSE_GAS_REFRESH_INTERVAL = 5000;

export function useMultichainDepositNetworkComposeGas(opts?: {
  enabled?: boolean;
  action?: MultichainAction;
  tokenAddress?: string;
}): {
  composeGas: bigint | undefined;
} {
  const { chainId } = useChainId();
  const [depositViewChain] = useGmxAccountDepositViewChain();

  const tokenAddress: string | undefined = opts?.tokenAddress ?? CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId];

  const { address: account } = useAccount();
  const settlementChainPublicClient = usePublicClient({ chainId });

  const composeGasQueryCondition =
    settlementChainPublicClient &&
    account &&
    depositViewChain &&
    tokenAddress !== undefined &&
    getStargatePoolAddress(chainId, tokenAddress) !== undefined &&
    tryGetContract(chainId, "LayerZeroProvider") !== undefined &&
    depositViewChain !== (chainId as SourceChainId) &&
    opts?.enabled !== false;

  const composeGasQuery = useSWR<bigint | undefined>(
    composeGasQueryCondition ? ["composeGas", account, chainId, depositViewChain, tokenAddress] : null,
    {
      fetcher: async () => {
        if (!composeGasQueryCondition) {
          return undefined;
        }

        return estimateMultichainDepositNetworkComposeGas({
          action: opts?.action,
          chainId,
          account,
          srcChainId: depositViewChain,
          tokenAddress,
          settlementChainPublicClient,
        });
      },
      refreshInterval: MULTICHAIN_DEPOSIT_NETWORK_COMPOSE_GAS_REFRESH_INTERVAL,
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
  tokenAddress,
  settlementChainPublicClient,
}: {
  action?: MultichainAction;
  chainId: ContractsChainId;
  account: string;
  srcChainId: SourceChainId;
  tokenAddress: string;
  settlementChainPublicClient: PublicClient;
}): Promise<bigint> {
  const data = action ? CodecUiHelper.encodeMultichainActionData(action) : undefined;
  const composeFromWithMsg = CodecUiHelper.composeDepositMessage(chainId as SettlementChainId, account, data);

  const settlementChainEndpointId = getLayerZeroEndpointId(chainId);
  const sourceChainEndpointId = getLayerZeroEndpointId(srcChainId);

  if (!settlementChainEndpointId) {
    throw new Error("Stargate endpoint ID not found");
  }

  if (!sourceChainEndpointId) {
    throw new Error("Stargate endpoint ID not found");
  }

  // TODO get decimals from token config
  const fakeAmount = isValidTokenSafe(chainId, tokenAddress)
    ? FAKE_INPUT_AMOUNT_MAP[getToken(chainId, tokenAddress).symbol] ?? 10n ** 18n
    : 10n ** 18n;

  const message = OFTComposeMsgCodec.encode(0n, sourceChainEndpointId, fakeAmount, composeFromWithMsg);

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
    const stateOverrideForErc20: StateOverride[number] = {
      address: tokenAddress as Address,
      code: OVERRIDE_ERC20_BYTECODE,
      state: [
        {
          slot: RANDOM_SLOT,
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

  const gas = await settlementChainPublicClient.estimateContractGas({
    address,
    abi: abis.LayerZeroProvider,
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
    account: CodecUiHelper.getLzEndpoint(chainId),
    stateOverride,
  });

  return applyGasLimitBuffer(gas);
}
