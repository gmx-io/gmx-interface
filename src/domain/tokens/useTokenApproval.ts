import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLatest } from "react-use";
import { isAddressEqual, maxUint256, type Address, type Hex } from "viem";

import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { helperToast } from "lib/helperToast";
import type { TokenApprovalMetricParams } from "lib/metrics";
import { EMPTY_ARRAY } from "lib/objects";
import type { WalletCallsBatch } from "lib/transactions/sendWalletCalls";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { AnyChainId } from "sdk/configs/chains";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { buildErc20ApproveTxn } from "sdk/utils/balances/api";

import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";

import { approveTokens } from "./approveTokens";
import { getIsGasPaymentTokenApproval } from "./gasPaymentTokenApproval";
import { getInsufficientApprovalToastContent } from "./insufficientApproval";
import { sendTokenApprovalMetric } from "./tokenApprovalMetric";
import { useWalletBatching } from "./useWalletBatching";

interface TokenToApprove {
  tokenAddress: string;
  amount: bigint | undefined;
}

interface UseTokenApprovalParams {
  chainId: AnyChainId | undefined;
  spenderAddress: string | undefined;
  tokens: TokenToApprove[];
  skip?: boolean;
  approveAmount?: bigint;
  allowPermit?: boolean;
  /** Only for actions the wallet sends itself: the approvals can then go in the same confirmation */
  allowBatch?: boolean;
  metric: TokenApprovalMetricContext;
}

type TokenApprovalMetricContext = Omit<TokenApprovalMetricParams, "isGasPaymentToken"> & {
  gasPaymentTokenAddress?: string;
  payTokenAddress?: string;
};

export interface HandleApproveOptions {
  onApproveFail?: () => void;
}

type MinedApproval = {
  tokenAddress: string;
  allowance: bigint;
};

interface UseTokenApprovalReturn {
  tokensToApprove: string[];
  needsApproval: boolean;
  isAllowanceLoading: boolean;
  isAllowanceLoaded: boolean;
  isApproving: boolean;
  handleApprove: (options?: HandleApproveOptions) => void;
  /** Whether approving the token would sign a permit instead of sending a transaction */
  getIsPermitApproval: (tokenAddress: string) => boolean;
  /** Set when the approvals should go in the same wallet confirmation as the action, instead of the Approve step */
  approvalBatch: WalletCallsBatch | undefined;
}

export function useTokenApproval({
  chainId,
  spenderAddress,
  tokens,
  skip,
  approveAmount,
  allowPermit = false,
  allowBatch = false,
  metric,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const [approvingToken, setApprovingToken] = useState<string | undefined>();
  const [minedApproval, setMinedApproval] = useState<MinedApproval | undefined>();
  const { tokenPermits, addTokenPermit, disableTokenPermits, getIsPermitAvailable, accountType } =
    useTokenPermitsContext();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const latestMetric = useLatest(metric);

  const mergedTokens = useMemo(() => {
    const map = new Map<string, bigint>();
    for (const token of tokens) {
      if (!token.tokenAddress) continue;
      const prev = map.get(token.tokenAddress) ?? 0n;
      map.set(token.tokenAddress, prev + (token.amount ?? 0n));
    }
    return Array.from(map, ([tokenAddress, amount]) => ({ tokenAddress, amount }));
  }, [tokens]);

  const tokenAddresses = useMemo(() => mergedTokens.map((t) => t.tokenAddress), [mergedTokens]);

  const nothingToCheck = skip || tokenAddresses.every((address) => address === NATIVE_TOKEN_ADDRESS);

  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoadingRaw,
    isLoaded: isAllowanceLoadedRaw,
  } = useTokensAllowanceData(chainId, {
    spenderAddress,
    tokenAddresses,
    skip,
  });

  const isAllowanceLoading = nothingToCheck ? false : isAllowanceLoadingRaw;
  const isAllowanceLoaded = nothingToCheck ? true : isAllowanceLoadedRaw;

  const permitsOrEmpty = useMemo(
    () =>
      allowPermit && spenderAddress && tokenPermits.length > 0
        ? tokenPermits.filter((permit) => isAddressEqual(permit.spender as Address, spenderAddress as Address))
        : EMPTY_ARRAY,
    [allowPermit, spenderAddress, tokenPermits]
  );

  const tokensToApprove = useMemo(
    () =>
      skip
        ? EMPTY_ARRAY
        : mergedTokens
            .filter((token) =>
              getNeedTokenApprove(tokensAllowanceData, token.tokenAddress, token.amount, permitsOrEmpty)
            )
            .map((token) => token.tokenAddress),
    [skip, mergedTokens, tokensAllowanceData, permitsOrEmpty]
  );

  const needsApproval = tokensToApprove.length > 0;

  const { isAvailable: isBatchAvailable, atomicStatus } = useWalletBatching({
    chainId,
    enabled: allowBatch && needsApproval,
  });

  const approvalBatch = useMemo((): WalletCallsBatch | undefined => {
    if (!isBatchAvailable || !isAllowanceLoaded || !needsApproval || !spenderAddress || chainId === undefined) {
      return undefined;
    }

    const amount = approveAmount ?? maxUint256;
    const { gasPaymentTokenAddress, payTokenAddress, ...metricParams } = latestMetric.current;

    return {
      calls: tokensToApprove.map((tokenAddress) => {
        const call = buildErc20ApproveTxn({ tokenAddress, spender: spenderAddress, amount });
        return { to: call.to as Address, data: call.data as Hex, value: call.value };
      }),
      flow: metricParams.flow,
      atomicStatus,
      onOutcome: (outcome, error) => {
        if (outcome === "sent") {
          return;
        }

        tokensToApprove.forEach((tokenAddress) =>
          sendTokenApprovalMetric({
            metric: {
              ...metricParams,
              isGasPaymentToken:
                gasPaymentTokenAddress !== undefined
                  ? getIsGasPaymentTokenApproval({ tokenAddress, gasPaymentTokenAddress, payTokenAddress })
                  : undefined,
            },
            method: "batch",
            outcome:
              outcome === "confirmed"
                ? "accepted"
                : outcome === "rejected" || outcome === "upgradeRejected"
                  ? "rejected"
                  : "failed",
            chainId,
            tokenAddress,
            spender: spenderAddress,
            isUnlimited: amount === maxUint256,
            error,
          })
        );
      },
    };
  }, [
    approveAmount,
    atomicStatus,
    chainId,
    isAllowanceLoaded,
    isBatchAvailable,
    latestMetric,
    needsApproval,
    spenderAddress,
    tokensToApprove,
  ]);
  const isApproving = approvingToken !== undefined && tokensToApprove[0] === approvingToken;

  useEffect(() => {
    if (approvingToken !== undefined && !tokensToApprove.includes(approvingToken)) {
      setApprovingToken(undefined);
    }
  }, [approvingToken, tokensToApprove]);

  useEffect(() => {
    if (minedApproval === undefined || chainId === undefined) {
      return;
    }

    setMinedApproval(undefined);

    const { tokenAddress, allowance } = minedApproval;
    const requiredAmount = mergedTokens.find((token) => token.tokenAddress === tokenAddress)?.amount;

    if (
      requiredAmount === undefined ||
      !getNeedTokenApprove({ [tokenAddress]: allowance }, tokenAddress, requiredAmount, permitsOrEmpty)
    ) {
      return;
    }

    setApprovingToken((current) => (current === tokenAddress ? undefined : current));
    helperToast.error(
      getInsufficientApprovalToastContent({ chainId, tokenAddress, approvedAmount: allowance, requiredAmount })
    );
  }, [chainId, mergedTokens, minedApproval, permitsOrEmpty]);

  const watchApprovalReceipt = useCallback(
    async (approvalChainId: AnyChainId, tokenAddress: string, spender: string, hash: `0x${string}`) => {
      const client = getPublicClientWithRpc(approvalChainId);
      const receipt = await client.waitForTransactionReceipt({ hash }).catch(() => undefined);
      const allowance =
        receipt?.status === "success"
          ? await client
              .readContract({
                address: tokenAddress as Address,
                abi: abis.ERC20,
                functionName: "allowance",
                args: [receipt.from, spender as Address],
                blockNumber: receipt.blockNumber,
              })
              .catch(() => undefined)
          : undefined;

      if (allowance === undefined) {
        setApprovingToken((current) => (current === tokenAddress ? undefined : current));
        return;
      }

      setMinedApproval({ tokenAddress, allowance });
    },
    []
  );

  // the same choice handleApprove makes, so callers can tell a free signature from a paid transaction
  const getIsPermitApproval = useCallback(
    (tokenAddress: string) => allowPermit && getIsPermitAvailable(tokenAddress),
    [allowPermit, getIsPermitAvailable]
  );

  const handleApprove = useCallback(
    async (options?: HandleApproveOptions) => {
      const tokenAddress = tokensToApprove[0];
      if (!chainId || isApproving || !tokenAddress || !spenderAddress) return;

      const permitParams = getIsPermitApproval(tokenAddress)
        ? { addTokenPermit, disableTokenPermits, accountType }
        : undefined;
      const { gasPaymentTokenAddress, payTokenAddress, ...metricParams } = latestMetric.current;

      const doApprove = async (signerToUse: WalletSigner) => {
        setApprovingToken(tokenAddress);
        const result = await approveTokens({
          setIsApproving: noop,
          signer: signerToUse,
          tokenAddress,
          spender: spenderAddress,
          chainId,
          permitParams,
          approveAmount,
          metric: {
            ...metricParams,
            isGasPaymentToken:
              gasPaymentTokenAddress !== undefined
                ? getIsGasPaymentTokenApproval({ tokenAddress, gasPaymentTokenAddress, payTokenAddress })
                : undefined,
          },
          onApproveFail: () => {
            setApprovingToken(undefined);
            options?.onApproveFail?.();
          },
        });

        if (result) {
          watchApprovalReceipt(chainId, tokenAddress, spenderAddress, result.hash);
        }
      };

      try {
        await wrapChainAction(chainId, setSettlementChainId, doApprove);
      } catch {
        setApprovingToken(undefined);
        options?.onApproveFail?.();
      }
    },
    [
      accountType,
      addTokenPermit,
      approveAmount,
      chainId,
      disableTokenPermits,
      getIsPermitApproval,
      isApproving,
      latestMetric,
      setSettlementChainId,
      spenderAddress,
      tokensToApprove,
      watchApprovalReceipt,
    ]
  );

  return {
    tokensToApprove,
    needsApproval,
    isAllowanceLoading,
    isAllowanceLoaded,
    isApproving,
    handleApprove,
    getIsPermitApproval,
    approvalBatch,
  };
}
