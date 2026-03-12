import { zeroAddress, zeroHash } from "viem";

import { OVERRIDE_ERC20_BYTECODE, RANDOM_ACCOUNT, RANDOM_SLOT, SIMULATED_MULTICHAIN_BALANCE } from "config/multichain";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxFromToken,
  selectTradeboxIsWrapOrUnwrap,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToTokenAmount, convertToUsd, TokensData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { applyGasLimitBuffer } from "lib/gas/estimateGasLimit";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";
import { abis } from "sdk/abis";
import { getIsExecutionFeeHigh, getIsExecutionFeeVeryHigh } from "sdk/utils/fees/executionFee";
import { ExecutionFee } from "sdk/utils/fees/types";
import { expandDecimals, USD_DECIMALS } from "sdk/utils/numbers/utils";

async function estimateWrapExecutionFee({
  chainId,
  tokensData,
}: {
  chainId: number;
  tokensData: TokensData;
}): Promise<bigint> {
  const client = getPublicClientWithRpc(chainId);
  const nativeToken = getByKey(tokensData, zeroAddress);
  if (!nativeToken) {
    throw new Error("Native token not found");
  }

  const amount = convertToTokenAmount(
    expandDecimals(1n, USD_DECIMALS),
    nativeToken.decimals,
    nativeToken.prices.minPrice
  );

  const gasLimit = await client
    .estimateContractGas({
      address: nativeToken.wrappedAddress!,
      abi: abis.WETH,
      functionName: "deposit",
      value: amount,
      account: RANDOM_ACCOUNT,
      stateOverride: [
        {
          address: RANDOM_ACCOUNT.address,
          balance: SIMULATED_MULTICHAIN_BALANCE,
        },
      ],
    })
    .then(applyGasLimitBuffer);

  return gasLimit;
}

async function estimateUnwrapExecutionFee({
  chainId,
  tokensData,
}: {
  chainId: number;
  tokensData: TokensData;
}): Promise<bigint> {
  const client = getPublicClientWithRpc(chainId);

  const nativeToken = getByKey(tokensData, zeroAddress);
  if (!nativeToken) {
    throw new Error("Native token not found");
  }

  const amount = convertToTokenAmount(
    expandDecimals(1n, USD_DECIMALS),
    nativeToken.decimals,
    nativeToken.prices.minPrice
  )!;

  const gasLimit = await client
    .estimateContractGas({
      address: nativeToken.wrappedAddress!,
      abi: abis.WETH,
      functionName: "withdraw",
      args: [amount],
      account: RANDOM_ACCOUNT,
      stateOverride: [
        {
          address: nativeToken.wrappedAddress!,
          code: OVERRIDE_ERC20_BYTECODE,
          state: [
            {
              slot: RANDOM_SLOT,
              value: zeroHash,
            },
          ],
        },
        {
          address: RANDOM_ACCOUNT.address,
          balance: SIMULATED_MULTICHAIN_BALANCE,
        },
      ],
    })
    .then(applyGasLimitBuffer);

  return gasLimit;
}

async function estimateWrapOrUnwrapExecutionFee({
  chainId,
  tokensData,
  gasPrice,
  isWrap,
}: {
  chainId: number;
  tokensData: TokensData;
  gasPrice: bigint;
  isWrap: boolean;
}): Promise<ExecutionFee> {
  let gasLimit = 0n;
  if (isWrap) {
    gasLimit = await estimateWrapExecutionFee({ chainId, tokensData });
  } else {
    gasLimit = await estimateUnwrapExecutionFee({ chainId, tokensData });
  }

  const nativeToken = getByKey(tokensData, zeroAddress)!;
  const feeTokenAmount = gasLimit * gasPrice;
  const feeUsd = convertToUsd(feeTokenAmount, nativeToken.decimals, nativeToken.prices.minPrice)!;

  const executionFee: ExecutionFee = {
    feeToken: nativeToken,
    feeUsd,
    feeTokenAmount,
    gasLimit,
    isFeeHigh: getIsExecutionFeeHigh(chainId, feeUsd),
    isFeeVeryHigh: getIsExecutionFeeVeryHigh(chainId, feeUsd),
  };

  return executionFee;
}

export function useWrapOrUnwrapExecutionFee() {
  const { chainId } = useChainId();
  const tokensData = useTokensData();
  const fromToken = useSelector(selectTradeboxFromToken);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const gasPrice = useSelector(selectGasPrice);
  const isWrap = Boolean(fromToken?.isNative);
  const prevIsWrap = usePrevious(isWrap);
  const forceRecalculate = prevIsWrap !== isWrap;

  const result = useThrottledAsync(async ({ params: p }) => estimateWrapOrUnwrapExecutionFee(p), {
    params:
      isWrapOrUnwrap && tokensData && gasPrice !== undefined && fromToken
        ? { chainId, tokensData, gasPrice, isWrap: Boolean(fromToken.isNative) }
        : undefined,
    forceRecalculate,
  });

  return result;
}
