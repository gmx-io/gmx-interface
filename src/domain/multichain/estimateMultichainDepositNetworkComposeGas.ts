import { Address } from "abitype";
import { EstimateContractGasParameters, PublicClient, StateOverride, toHex, zeroAddress, zeroHash } from "viem";

import type { ContractsChainId, SettlementChainId, SourceChainId } from "config/chains";
import { tryGetContract } from "config/contracts";
import { FAKE_INPUT_AMOUNT_MAP, getLayerZeroEndpointId, getStargatePoolAddress } from "config/multichain";
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { expandDecimals } from "lib/numbers";
import { abis } from "sdk/abis";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { convertTokenAddress, getToken, isValidTokenSafe } from "sdk/configs/tokens";
import { composeDepositMessage, encodeOftComposeMsg, getLzEndpoint } from "sdk/utils/multichain/codecs";
import { estimateMultichainDepositComposeGas as estimateSdk } from "sdk/utils/multichain/estimateComposeGas";
import { OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT } from "sdk/utils/multichain/stateOverrides";
import { createViemRpc } from "sdk/utils/rpc/createViemRpc";

import { CodecUiHelper, MultichainAction } from "./codecs/CodecUiHelper";

export type EstimateMultichainDepositNetworkComposeGasParameters = {
  action?: MultichainAction;
  chainId: ContractsChainId;
  account: string;
  srcChainId: SourceChainId;
  tokenAddress: string;
};

function resolveFakeAmount(chainId: ContractsChainId, unwrappedTokenAddress: string): bigint {
  if (isValidTokenSafe(chainId, unwrappedTokenAddress)) {
    const token = getToken(chainId, unwrappedTokenAddress);
    return FAKE_INPUT_AMOUNT_MAP[token.symbol] ?? expandDecimals(10, token.decimals);
  }
  if (isMarketTokenAddress(chainId, unwrappedTokenAddress) || isGlvAddress(chainId, unwrappedTokenAddress)) {
    return expandDecimals(10, PLATFORM_TOKEN_DECIMALS);
  }
  return 10n ** 18n;
}

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

  const innerData = action ? CodecUiHelper.encodeMultichainComposeActionData(action) : undefined;
  const composeFromWithMsg = composeDepositMessage(chainId as SettlementChainId, account, innerData);

  const sourceChainEndpointId = getLayerZeroEndpointId(srcChainId);
  if (!getLayerZeroEndpointId(chainId)) {
    throw new Error("Stargate endpoint ID not found");
  }
  if (!sourceChainEndpointId) {
    throw new Error("Stargate endpoint ID not found");
  }

  const fakeAmount = resolveFakeAmount(chainId, unwrappedTokenAddress);

  const message = encodeOftComposeMsg(0n, sourceChainEndpointId, fakeAmount, composeFromWithMsg);

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
    stateOverride.push({
      address: unwrappedTokenAddress as Address,
      code: OVERRIDE_ERC20_BYTECODE,
      stateDiff: [{ slot: RANDOM_SLOT, value: zeroHash }],
    });
  } else {
    stateOverride.push({ address, balance: fakeAmount * 2n });
  }

  return {
    address,
    abi: abis.LayerZeroProvider,
    functionName: "lzCompose",
    args: [stargatePool, toHex(0, { size: 32 }), message, zeroAddress, "0x"],
    account: getLzEndpoint(chainId),
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
  const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");
  const stargatePool = getStargatePoolAddress(chainId, unwrappedTokenAddress);
  if (!stargatePool) {
    throw new Error(`Stargate pool not found for token: ${unwrappedTokenAddress} on chain: ${chainId}`);
  }

  const innerData = action ? CodecUiHelper.encodeMultichainComposeActionData(action) : undefined;
  const fakeAmount = resolveFakeAmount(chainId, unwrappedTokenAddress);

  return estimateSdk(createViemRpc(settlementChainPublicClient), {
    chainId,
    account,
    srcChainId,
    tokenAddress,
    destinationStargatePoolAddress: stargatePool,
    fakeAmount,
    innerData,
  });
}
