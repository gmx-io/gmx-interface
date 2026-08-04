import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";

import type { ContractsChainId } from "config/chains";
import type { PendingTokenApproval } from "domain/tokens/tokenApproval";
import { useAtomicTokenApproval } from "domain/tokens/useAtomicTokenApproval";
import type { TokenApproveBatchSource } from "lib/userAnalytics/types";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import TokenAbi from "sdk/abis/Token";
import { getContract } from "sdk/configs/contracts";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";
import { MaxUint256 } from "sdk/utils/numbers";

type OneClickTokenApprovalSource = Extract<TokenApproveBatchSource, "OneClickSetup" | "OneClickReauth">;

export type OneClickTokenApprovalState = {
  canBatch: boolean;
  isApproving: boolean;
  pendingTokens: { address: string; symbol: string }[];
};

export function getPendingOneClickTokenApprovals(
  tokenAddresses: string[],
  allowances: bigint[] | undefined
): PendingTokenApproval[] {
  if (!allowances || allowances.length !== tokenAddresses.length) {
    return [];
  }

  return tokenAddresses.flatMap((tokenAddress, index) =>
    allowances[index] < MaxUint256 ? [{ tokenAddress, amount: MaxUint256 }] : []
  );
}

export function useOneClickTokenApproval({
  chainId,
  account,
}: {
  chainId: ContractsChainId;
  account: string | undefined;
}) {
  const queryClient = useQueryClient();
  const spenderAddress = getContract(chainId, "SyntheticsRouter");
  const tokenAddresses = useMemo(() => getGasPaymentTokens(chainId), [chainId]);
  const allowancesQueryKey = useMemo(
    () => ["oneClickTokenAllowances", chainId, account, spenderAddress, tokenAddresses] as const,
    [account, chainId, spenderAddress, tokenAddresses]
  );

  const allowancesQuery = useQuery({
    queryKey: allowancesQueryKey,
    queryFn: async () => {
      if (!account) {
        return [];
      }

      const client = getPublicClientWithRpc(chainId);

      const allowances = await client.multicall({
        allowFailure: false,
        contracts: tokenAddresses.map((tokenAddress) => ({
          address: tokenAddress as Address,
          abi: TokenAbi,
          functionName: "allowance",
          args: [account as Address, spenderAddress as Address],
        })),
      });

      return allowances as bigint[];
    },
    enabled: Boolean(account && tokenAddresses.length),
    retry: false,
  });

  const pendingTokenApprovals = useMemo(
    () => getPendingOneClickTokenApprovals(tokenAddresses, allowancesQuery.data),
    [allowancesQuery.data, tokenAddresses]
  );

  const isAtomicCapabilityEnabled = allowancesQuery.isSuccess && pendingTokenApprovals.length > 0;

  const setupApproval = useAtomicTokenApproval({
    chainId,
    spenderAddress,
    pendingTokenApprovals,
    source: "OneClickSetup",
    enabled: isAtomicCapabilityEnabled,
    minApprovalCount: 1,
  });
  const reauthApproval = useAtomicTokenApproval({
    chainId,
    spenderAddress,
    pendingTokenApprovals,
    source: "OneClickReauth",
    enabled: isAtomicCapabilityEnabled,
    minApprovalCount: 1,
  });

  const [requestedSource, setRequestedSource] = useState<
    { id: number; source: OneClickTokenApprovalSource } | undefined
  >();
  const nextRequestId = useRef(0);
  const processingRequestId = useRef<number>();
  const wasBatchApproving = useRef(false);

  const requestTokenApprovals = useCallback((source: OneClickTokenApprovalSource) => {
    nextRequestId.current += 1;
    setRequestedSource({ id: nextRequestId.current, source });
  }, []);

  useEffect(
    function processRequestedApprovals() {
      if (!requestedSource || processingRequestId.current === requestedSource.id) {
        return;
      }

      if (allowancesQuery.isPending) {
        return;
      }

      if (allowancesQuery.isError || pendingTokenApprovals.length === 0) {
        processingRequestId.current = requestedSource.id;
        setRequestedSource(undefined);
        return;
      }

      const approval = requestedSource.source === "OneClickSetup" ? setupApproval : reauthApproval;

      if (approval.isCapabilityLoading) {
        return;
      }

      processingRequestId.current = requestedSource.id;
      setRequestedSource(undefined);

      if (approval.isAtomicBatchingDisabled) {
        return;
      }

      if (!approval.canBatch) {
        approval.trackFallback(approval.fallbackReason);
        return;
      }

      void approval
        .submitBatch()
        .then((success) => {
          if (success) {
            queryClient.setQueryData(
              allowancesQueryKey,
              tokenAddresses.map(() => MaxUint256)
            );
          }
        })
        .catch(() => undefined);
    },
    [
      allowancesQuery,
      allowancesQueryKey,
      pendingTokenApprovals.length,
      queryClient,
      reauthApproval,
      requestedSource,
      setupApproval,
      tokenAddresses,
    ]
  );

  const isBatchApproving = setupApproval.isBatchApproving || reauthApproval.isBatchApproving;

  useEffect(
    function refreshAllowancesAfterBatchSettles() {
      if (wasBatchApproving.current && !isBatchApproving) {
        void allowancesQuery.refetch();
      }

      wasBatchApproving.current = isBatchApproving;
    },
    [allowancesQuery, isBatchApproving]
  );

  const state = useMemo<OneClickTokenApprovalState>(
    () => ({
      canBatch: setupApproval.canBatch,
      isApproving: isBatchApproving,
      pendingTokens: pendingTokenApprovals.map(({ tokenAddress }) => ({
        address: tokenAddress,
        symbol: getToken(chainId, tokenAddress).symbol,
      })),
    }),
    [pendingTokenApprovals, chainId, isBatchApproving, setupApproval.canBatch]
  );

  return {
    requestTokenApprovals,
    state,
  };
}
