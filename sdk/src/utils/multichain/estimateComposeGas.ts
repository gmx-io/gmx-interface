import { encodeFunctionData, toHex, zeroAddress, zeroHash } from "viem";

import { abis } from "abis";
import type { ContractsChainId, SettlementChainId, SourceChainId } from "configs/chains";
import { getContract } from "configs/contracts";
import { getLayerZeroEndpointId } from "configs/multichain";
import { convertTokenAddress, getToken, isValidTokenSafe } from "configs/tokens";
import { applyGasLimitBuffer } from "utils/gas/applyBuffer";
import { expandDecimals } from "utils/numbers";
import type { IRpc, StateOverrideEntry } from "utils/rpc";

import { composeDepositMessage, encodeOftComposeMsg, getLzEndpoint } from "./codecs";
import { OVERRIDE_ERC20_BYTECODE, RANDOM_SLOT } from "./stateOverrides";

const DEFAULT_FAKE_AMOUNT = 10n ** 18n;

export type EstimateComposeGasParams = {
  chainId: ContractsChainId;
  account: string;
  srcChainId: SourceChainId;
  /** Settlement-chain token address (wrapped or native). */
  tokenAddress: string;
  /**
   * Destination-chain Stargate pool address (the OApp delivering `lzCompose` on settlement chain).
   * On Arbitrum mainnet for USDC this is `StargatePoolUSDC` on Arbitrum, NOT the source-chain pool.
   */
  destinationStargatePoolAddress: string;
  /** Optional override for the lzCompose amount used during estimation. Defaults to a sane per-token value. */
  fakeAmount?: bigint;
  /** Optional encoded payload appended to the deposit message (`abi.encode(account, data)`). */
  innerData?: string;
};

export async function estimateMultichainDepositComposeGas(
  rpc: IRpc,
  {
    chainId,
    account,
    srcChainId,
    tokenAddress,
    destinationStargatePoolAddress,
    fakeAmount: fakeAmountOverride,
    innerData,
  }: EstimateComposeGasParams
): Promise<bigint> {
  const unwrappedTokenAddress = convertTokenAddress(chainId, tokenAddress, "native");

  const composeFromWithMsg = composeDepositMessage(chainId as SettlementChainId, account, innerData);

  const sourceChainEndpointId = getLayerZeroEndpointId(srcChainId);
  if (sourceChainEndpointId === undefined) {
    throw new Error(`No LayerZero endpoint id for source chain ${srcChainId}`);
  }

  const fakeAmount =
    fakeAmountOverride ??
    (isValidTokenSafe(chainId, unwrappedTokenAddress)
      ? expandDecimals(10n, getToken(chainId, unwrappedTokenAddress).decimals)
      : DEFAULT_FAKE_AMOUNT);

  const message = encodeOftComposeMsg(0n, sourceChainEndpointId, fakeAmount, composeFromWithMsg);

  const layerZeroProvider = getContract(chainId, "LayerZeroProvider");

  const callData = encodeFunctionData({
    abi: abis.LayerZeroProvider,
    functionName: "lzCompose",
    args: [destinationStargatePoolAddress, toHex(0, { size: 32 }), message, zeroAddress, "0x"],
  });

  const stateOverride: StateOverrideEntry[] = [];

  if (unwrappedTokenAddress !== zeroAddress) {
    stateOverride.push({
      address: unwrappedTokenAddress,
      code: OVERRIDE_ERC20_BYTECODE,
      stateDiff: [{ slot: RANDOM_SLOT, value: zeroHash }],
    });
  } else {
    stateOverride.push({ address: layerZeroProvider, balance: fakeAmount * 2n });
  }

  const gas = await rpc.estimateGas({
    from: getLzEndpoint(chainId),
    to: layerZeroProvider,
    data: callData,
    stateOverride,
  });

  return applyGasLimitBuffer(gas);
}
