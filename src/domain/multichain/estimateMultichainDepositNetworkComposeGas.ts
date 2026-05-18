import { PublicClient } from "viem";

import type { ContractsChainId, SourceChainId } from "config/chains";
import { FAKE_INPUT_AMOUNT_MAP, getStargatePoolAddress } from "config/multichain";
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { expandDecimals } from "lib/numbers";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { convertTokenAddress, getToken, isValidTokenSafe } from "sdk/configs/tokens";
import { estimateMultichainDepositComposeGas as estimateSdk } from "sdk/utils/multichain/estimateComposeGas";
import { createViemRpc } from "sdk/utils/rpc/createViemRpc";

import { encodeMultichainComposeActionData, MultichainAction } from "./codecs/CodecUiHelper";

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

  const innerData = action ? encodeMultichainComposeActionData(action) : undefined;
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
