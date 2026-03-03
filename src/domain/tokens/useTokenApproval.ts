import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";

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
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const { signer } = useWallet();
  const [isApproving, setIsApproving] = useState(false);

  const tokenAddresses = useMemo(() => tokens.map((t) => t.tokenAddress).filter(Boolean), [tokens]);

  const {
    tokensAllowanceData,
    isLoading: isAllowanceLoading,
    isLoaded: isAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress,
    tokenAddresses,
    skip,
  });

  const tokensToApprove = useMemo(
    () =>
      tokens
        .filter((token) => getNeedTokenApprove(tokensAllowanceData, token.tokenAddress, token.amount, []))
        .map((token) => token.tokenAddress),
    [tokens, tokensAllowanceData]
  );

  const needsApproval = tokensToApprove.length > 0;

  useEffect(() => {
    if (!needsApproval && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needsApproval]);

  const handleApprove = useCallback(
    async (options?: HandleApproveOptions) => {
      const tokenAddress = tokensToApprove[0];
      if (!chainId || isApproving || !tokenAddress || !spenderAddress) return;

      const doApprove = async (signerToUse: WalletSigner) => {
        await approveTokens({
          setIsApproving: noop,
          signer: signerToUse,
          tokenAddress,
          spender: spenderAddress,
          chainId,
          permitParams: undefined,
          approveAmount,
          onApproveSubmitted: () => setIsApproving(true),
          onApproveFail: () => {
            setIsApproving(false);
            options?.onApproveFail?.();
          },
        });
      };

      if (wrapApprove) {
        await wrapApprove(doApprove);
      } else if (signer) {
        setIsApproving(true);
        await doApprove(signer);
      }
    },
    [tokensToApprove, chainId, isApproving, spenderAddress, signer, approveAmount, wrapApprove]
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
