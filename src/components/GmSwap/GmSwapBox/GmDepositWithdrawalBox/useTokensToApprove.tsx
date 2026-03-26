import { t } from "@lingui/macro";
import noop from "lodash/noop";
import { useCallback, useMemo } from "react";
import { zeroAddress } from "viem";

import { SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, getMultichainTokenId } from "config/multichain";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenAmount,
} from "context/PoolsDetailsContext/selectors";
import { useMultichainApprovalsActiveListener } from "context/SyntheticsEvents/useMultichainEvents";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlvAddress } from "domain/synthetics/markets/glv";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { helperToast } from "lib/helperToast";
import { adjustForDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { getToken, isValidTokenSafe } from "sdk/configs/tokens";

type TokensToApproveResult = {
  tokensToApproveSymbols: string[];
  isAllowanceLoading: boolean;
  isAllowanceLoaded: boolean;
  approve: () => void;
  isApproving: boolean;
};

const useSettlementChainTokensToApprove = (): TokensToApproveResult => {
  const chainId = useSelector(selectChainId);
  const { isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);

  const paySource = useSelector(selectPoolsDetailsPaySource);

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const marketOrGlvTokenAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);

  const tokens = useMemo(
    function getPayTokens() {
      const result: { tokenAddress: string; amount: bigint }[] = [];

      if (isDeposit) {
        if (firstTokenAddress !== undefined && isMarketTokenDeposit) {
          result.push({ tokenAddress: firstTokenAddress, amount: firstTokenAmount });
        } else {
          if (firstTokenAddress !== undefined) {
            result.push({ tokenAddress: firstTokenAddress, amount: firstTokenAmount });
          }
          if (secondTokenAddress !== undefined) {
            result.push({ tokenAddress: secondTokenAddress, amount: secondTokenAmount });
          }
        }
      } else if (isWithdrawal && marketOrGlvTokenAddress !== undefined) {
        result.push({ tokenAddress: marketOrGlvTokenAddress, amount: marketOrGlvTokenAmount });
      }

      return result;
    },
    [
      isDeposit,
      isWithdrawal,
      marketOrGlvTokenAddress,
      firstTokenAddress,
      isMarketTokenDeposit,
      firstTokenAmount,
      secondTokenAddress,
      secondTokenAmount,
      marketOrGlvTokenAmount,
    ]
  );

  const { tokensToApprove, isApproving, isAllowanceLoading, isAllowanceLoaded, handleApprove } = useTokenApproval({
    chainId,
    spenderAddress: routerAddress,
    tokens,
    skip: paySource !== "settlementChain",
  });

  const approve = useCallback(() => {
    userAnalytics.pushEvent<TokenApproveClickEvent>({ event: "TokenApproveAction", data: { action: "ApproveClick" } });
    handleApprove({
      onApproveFail: () =>
        userAnalytics.pushEvent<TokenApproveResultEvent>({
          event: "TokenApproveAction",
          data: { action: "ApproveFail" },
        }),
    });
  }, [handleApprove]);

  const tokensToApproveSymbols = tokensToApprove.map((tokenAddress) => {
    if (isGlvAddress(chainId, tokenAddress)) {
      return "GLV";
    }
    if (isMarketTokenAddress(chainId, tokenAddress)) {
      return "GM";
    }

    if (isValidTokenSafe(chainId, tokenAddress)) {
      return getToken(chainId, tokenAddress).symbol;
    }

    return "";
  });

  return {
    isApproving,
    approve,
    isAllowanceLoaded,
    isAllowanceLoading,
    tokensToApproveSymbols,
  };
};

const useSourceChainTokensToApprove = (): TokensToApproveResult => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const glvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);

  const settlementChainSpendTokenAddress = isDeposit ? firstTokenAddress : glvOrMarketAddress;

  const settlementChainSpendTokenId =
    settlementChainSpendTokenAddress !== undefined
      ? getMultichainTokenId(chainId, settlementChainSpendTokenAddress)
      : undefined;
  const settlementChainSpendTokenDecimals = settlementChainSpendTokenId?.decimals;
  const sourceChainSpendTokenId =
    settlementChainSpendTokenAddress !== undefined && srcChainId !== undefined
      ? getMappedTokenId(chainId as SourceChainId, settlementChainSpendTokenAddress, srcChainId)
      : undefined;
  const sourceChainSpendTokenDecimals = sourceChainSpendTokenId?.decimals;

  const amount = isDeposit ? firstTokenAmount : marketOrGlvTokenAmount;

  const sourceChainSpendTokenAmountLD =
    settlementChainSpendTokenDecimals !== undefined && sourceChainSpendTokenDecimals !== undefined
      ? adjustForDecimals(amount, settlementChainSpendTokenDecimals, sourceChainSpendTokenDecimals)
      : undefined;

  const multichainSpenderAddress = sourceChainSpendTokenId?.stargate;

  useMultichainApprovalsActiveListener(srcChainId, "multichain-gm-swap-box");

  const tokens = useMemo(
    () =>
      sourceChainSpendTokenId
        ? [{ tokenAddress: sourceChainSpendTokenId.address, amount: sourceChainSpendTokenAmountLD }]
        : [],
    [sourceChainSpendTokenId, sourceChainSpendTokenAmountLD]
  );

  const { needsApproval, isApproving, isAllowanceLoading, isAllowanceLoaded, handleApprove } = useTokenApproval({
    chainId: srcChainId,
    spenderAddress: multichainSpenderAddress,
    tokens,
    approveAmount: sourceChainSpendTokenAmountLD,
    skip: srcChainId === undefined || sourceChainSpendTokenId === undefined,
  });

  const multichainTokensToApproveSymbols = useMemo(() => {
    if (!settlementChainSpendTokenAddress || !settlementChainSpendTokenId || !needsApproval) {
      return EMPTY_ARRAY;
    }

    if (isGlvAddress(chainId, settlementChainSpendTokenAddress)) {
      return ["GLV"];
    }

    if (isMarketTokenAddress(chainId, settlementChainSpendTokenAddress)) {
      return ["GM"];
    }

    return [settlementChainSpendTokenId.symbol];
  }, [chainId, needsApproval, settlementChainSpendTokenAddress, settlementChainSpendTokenId]);

  const approve = useCallback(() => {
    if (!settlementChainSpendTokenAddress || sourceChainSpendTokenAmountLD === undefined || !srcChainId) {
      helperToast.error(t`Approval failed`);
      return;
    }

    if (settlementChainSpendTokenAddress === zeroAddress) {
      helperToast.error(t`Native token cannot be approved`);
      return;
    }

    if (!sourceChainSpendTokenId) {
      helperToast.error(t`Approval failed`);
      return;
    }

    if (!multichainSpenderAddress) {
      helperToast.error(t`Approval failed`);
      return;
    }

    handleApprove();
  }, [
    handleApprove,
    multichainSpenderAddress,
    settlementChainSpendTokenAddress,
    sourceChainSpendTokenAmountLD,
    srcChainId,
    sourceChainSpendTokenId,
  ]);

  return {
    isApproving,
    approve,
    isAllowanceLoaded,
    isAllowanceLoading,
    tokensToApproveSymbols: multichainTokensToApproveSymbols,
  };
};

export const useTokensToApprove = (): TokensToApproveResult => {
  const paySource = useSelector(selectPoolsDetailsPaySource);

  const settlementChainResult = useSettlementChainTokensToApprove();

  const sourceChainResult = useSourceChainTokensToApprove();

  if (paySource === "settlementChain") {
    return settlementChainResult;
  }

  if (paySource === "sourceChain") {
    return sourceChainResult;
  }

  return {
    tokensToApproveSymbols: EMPTY_ARRAY,
    isAllowanceLoading: false,
    isAllowanceLoaded: false,
    approve: noop,
    isApproving: false,
  };
};
