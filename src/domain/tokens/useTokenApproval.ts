import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { helperToast } from "lib/helperToast";
import { EMPTY_ARRAY } from "lib/objects";
import type { WalletSigner } from "lib/wallets";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import { abis } from "sdk/abis";
import type { AnyChainId } from "sdk/configs/chains";

import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";

import { approveTokens } from "./approveTokens";
import { getInsufficientApprovalToastContent } from "./insufficientApproval";

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
}

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
}

export function useTokenApproval({
  chainId,
  spenderAddress,
  tokens,
  skip,
  approveAmount,
  allowPermit = false,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const [approvingToken, setApprovingToken] = useState<string | undefined>();
  const [minedApproval, setMinedApproval] = useState<MinedApproval | undefined>();
  const { tokenPermits, addTokenPermit, isPermitsDisabled, setIsPermitsDisabled } = useTokenPermitsContext();
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();

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

  const nothingToCheck = skip || tokenAddresses.length === 0;

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

  const permitsOrEmpty = allowPermit && !isPermitsDisabled && tokenPermits ? tokenPermits : EMPTY_ARRAY;

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

  const handleApprove = useCallback(
    async (options?: HandleApproveOptions) => {
      const tokenAddress = tokensToApprove[0];
      if (!chainId || isApproving || !tokenAddress || !spenderAddress) return;

      const permitParams = allowPermit ? { addTokenPermit, setIsPermitsDisabled, isPermitsDisabled } : undefined;

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
      addTokenPermit,
      allowPermit,
      approveAmount,
      chainId,
      isApproving,
      isPermitsDisabled,
      setIsPermitsDisabled,
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
  };
}
