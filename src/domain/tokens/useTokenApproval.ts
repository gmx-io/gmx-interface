import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import type { WalletSigner } from "lib/wallets";
import useWallet from "lib/wallets/useWallet";
import type { AnyChainId } from "sdk/configs/chains";

import { approveTokens } from "./approveTokens";

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
  wrapApprove?: (fn: (signer: WalletSigner) => Promise<void>) => Promise<void>;
  allowPermit?: boolean;
}

export interface HandleApproveOptions {
  onApproveFail?: () => void;
}

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
  wrapApprove,
  allowPermit = false,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const { signer } = useWallet();
  const [approvingToken, setApprovingToken] = useState<string | undefined>();
  const { tokenPermits, addTokenPermit, isPermitsDisabled, setIsPermitsDisabled } = useTokenPermitsContext();

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

  const permitsOrEmpty = allowPermit && tokenPermits ? tokenPermits : EMPTY_PERMITS;

  const tokensToApprove = useMemo(
    () =>
      skip
        ? EMPTY_STRING_ARRAY
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

  const handleApprove = useCallback(
    async (options?: HandleApproveOptions) => {
      const tokenAddress = tokensToApprove[0];
      if (!chainId || isApproving || !tokenAddress || !spenderAddress) return;

      const permitParams =
        allowPermit && !wrapApprove ? { addTokenPermit, setIsPermitsDisabled, isPermitsDisabled } : undefined;

      const doApprove = async (signerToUse: WalletSigner) => {
        setApprovingToken(tokenAddress);
        await approveTokens({
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
      };

      if (wrapApprove) {
        await wrapApprove(doApprove);
      } else if (signer) {
        await doApprove(signer);
      }
    },
    [
      tokensToApprove,
      chainId,
      isApproving,
      spenderAddress,
      signer,
      approveAmount,
      wrapApprove,
      allowPermit,
      addTokenPermit,
      isPermitsDisabled,
      setIsPermitsDisabled,
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

const EMPTY_PERMITS: NonNullable<ReturnType<typeof useTokenPermitsContext>["tokenPermits"]> = [];
const EMPTY_STRING_ARRAY: string[] = [];
