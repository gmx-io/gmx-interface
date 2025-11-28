import { Address } from "abitype";
import { EstimateContractGasParameters, PublicClient, StateOverride, toHex, zeroAddress, zeroHash } from "viem";

import type { ContractsChainId, SettlementChainId, SourceChainId } from "config/chains";
import { tryGetContract } from "config/contracts";
import {
  FAKE_INPUT_AMOUNT_MAP,
  getLayerZeroEndpointId,
  getStargatePoolAddress,
  OVERRIDE_ERC20_BYTECODE,
  RANDOM_SLOT,
} from "config/multichain";
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { expandDecimals } from "lib/numbers";
import { abis } from "sdk/abis";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { convertTokenAddress, getToken, isValidTokenSafe } from "sdk/configs/tokens";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";
import { OFTComposeMsgCodec } from "./codecs/OFTComposeMsgCodec";

export type EstimateMultichainDepositNetworkComposeGasParameters = {
  action?: MultichainAction;
  chainId: ContractsChainId;
  account: string;
  srcChainId: SourceChainId;
  tokenAddress: string;
};

export function getEstimateMultichainDepositNetworkComposeGasParameters({
  action,
  chainId,
  account,
  srcChainId,
  tokenAddress: maybeWrappedTokenAddress,
}: EstimateMultichainDepositNetworkComposeGasParameters): EstimateContractGasParameters<
  typeof abis.LayerZeroProvider,
  "lzCompose"
> {
  const unwrappedTokenAddress = convertTokenAddress(chainId, maybeWrappedTokenAddress, "native");

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

  let fakeAmount = 10n ** 18n;
  if (isValidTokenSafe(chainId, unwrappedTokenAddress)) {
    const token = getToken(chainId, unwrappedTokenAddress);
    fakeAmount = FAKE_INPUT_AMOUNT_MAP[token.symbol] ?? expandDecimals(10, token.decimals);
  } else if (isMarketTokenAddress(chainId, unwrappedTokenAddress) || isGlvAddress(chainId, unwrappedTokenAddress)) {
    fakeAmount = expandDecimals(10, PLATFORM_TOKEN_DECIMALS);
  }

  const message = OFTComposeMsgCodec.encode(0n, sourceChainEndpointId, fakeAmount, composeFromWithMsg);

  const stargatePool = getStargatePoolAddress(chainId, unwrappedTokenAddress);

  if (!stargatePool) {
    throw new Error(`Stargate pool not found for token: ${unwrappedTokenAddress} on chain: ${chainId}`);
  }

  const address = tryGetContract(chainId, "LayerZeroProvider")!;

  if (!address) {
    throw new Error("LayerZero provider not found");
  }

  const stateOverride: StateOverride = [];

  if (unwrappedTokenAddress !== zeroAddress) {
    const stateOverrideForErc20: StateOverride[number] = {
      address: unwrappedTokenAddress as Address,
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

  return {
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
  const parameters = getEstimateMultichainDepositNetworkComposeGasParameters({
    action,
    chainId,
    account,
    srcChainId,
    tokenAddress,
  });

  const gas = await settlementChainPublicClient.estimateContractGas(parameters);

  return applyGasLimitBuffer(gas);
}
