import { t } from "@lingui/macro";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { getMappedTokenId, getMultichainTokenId } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
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
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { adjustForDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { isMarketTokenAddress } from "sdk/configs/markets";
import { getToken, isValidTokenSafe } from "sdk/configs/tokens";

import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";

type TokensToApproveResult = {
  tokensToApproveSymbols: string[];
  isAllowanceLoading: boolean;
  isAllowanceLoaded: boolean;
  approve: () => void;
  isApproving: boolean;
};

const useSettlementChainTokensToApprove = (): TokensToApproveResult => {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const { isDeposit, isWithdrawal } = useSelector(selectPoolsDetailsFlags);

  const [isApproving, setIsApproving] = useState(false);

  const paySource = useSelector(selectPoolsDetailsPaySource);

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const marketOrGlvTokenAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);

  const payTokenAddresses: { address: string; amount: bigint }[] = useMemo(
    function getPayTokenAddresses() {
      const addresses: { address: string; amount: bigint }[] = [];

      if (isDeposit) {
        if (firstTokenAddress !== undefined && isMarketTokenDeposit) {
          addresses.push({ address: firstTokenAddress, amount: firstTokenAmount });
        } else {
          if (firstTokenAddress !== undefined) {
            addresses.push({ address: firstTokenAddress, amount: firstTokenAmount });
          }
          if (secondTokenAddress !== undefined) {
            addresses.push({ address: secondTokenAddress, amount: secondTokenAmount });
          }
        }
      } else if (isWithdrawal && marketOrGlvTokenAddress !== undefined) {
        addresses.push({ address: marketOrGlvTokenAddress, amount: marketOrGlvTokenAmount });
      }

      return addresses;
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

  const {
    tokensAllowanceData: settlementChainTokensAllowanceData,
    isLoading: isSettlementChainAllowanceLoading,
    isLoaded: isSettlementChainAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses.map((token) => token.address),
    skip: paySource !== "settlementChain",
  });

  const settlementChainTokensToApprove = useMemo(
    function getTokensToApprove() {
      return payTokenAddresses
        .filter((token) => {
          const shouldApprove = getNeedTokenApprove(
            settlementChainTokensAllowanceData,
            token.address,
            token.amount,
            []
          );
          return shouldApprove;
        })
        .map((token) => token.address);
    },
    [payTokenAddresses, settlementChainTokensAllowanceData]
  );

  const settlementChainTokensToApproveSymbols = settlementChainTokensToApprove.map((tokenAddress) => {
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

  const onApproveSettlementChain = () => {
    const tokenAddress = settlementChainTokensToApprove[0];

    if (!chainId || isApproving || !tokenAddress) return;

    userAnalytics.pushEvent<TokenApproveClickEvent>({
      event: "TokenApproveAction",
      data: {
        action: "ApproveClick",
      },
    });

    setIsApproving(true);

    approveTokens({
      setIsApproving: noop,
      signer,
      tokenAddress,
      spender: routerAddress,
      pendingTxns: [],
      setPendingTxns: () => null,
      infoTokens: {},
      chainId,
      approveAmount: undefined,
      onApproveFail: () => {
        setIsApproving(false);
        userAnalytics.pushEvent<TokenApproveResultEvent>({
          event: "TokenApproveAction",
          data: {
            action: "ApproveFail",
          },
        });
      },
      permitParams: undefined,
    });
  };

  useEffect(() => {
    if (!settlementChainTokensToApprove.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, settlementChainTokensToApprove.length]);

  return {
    isApproving,
    approve: onApproveSettlementChain,
    isAllowanceLoaded: isSettlementChainAllowanceLoaded,
    isAllowanceLoading: isSettlementChainAllowanceLoading,
    tokensToApproveSymbols: settlementChainTokensToApproveSymbols,
  };
};

const useSourceChainTokensToApprove = (): TokensToApproveResult => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const { isDeposit } = useSelector(selectPoolsDetailsFlags);

  const [isApproving, setIsApproving] = useState(false);

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

  const multichainTokensAllowanceResult = useTokensAllowanceData(srcChainId, {
    spenderAddress: multichainSpenderAddress,
    tokenAddresses: sourceChainSpendTokenId ? [sourceChainSpendTokenId.address] : [],
    skip: srcChainId === undefined || sourceChainSpendTokenId === undefined,
  });
  const multichainTokensAllowanceData =
    srcChainId !== undefined ? multichainTokensAllowanceResult.tokensAllowanceData : undefined;

  const multichainNeedTokenApprove = getNeedTokenApprove(
    multichainTokensAllowanceData,
    sourceChainSpendTokenId?.address,
    sourceChainSpendTokenAmountLD,
    EMPTY_ARRAY
  );

  const multichainTokensToApproveSymbols = useMemo(() => {
    if (!settlementChainSpendTokenAddress || !settlementChainSpendTokenId || !multichainNeedTokenApprove) {
      return EMPTY_ARRAY;
    }

    if (isGlvAddress(chainId, settlementChainSpendTokenAddress)) {
      return ["GLV"];
    }

    if (isMarketTokenAddress(chainId, settlementChainSpendTokenAddress)) {
      return ["GM"];
    }

    return [settlementChainSpendTokenId.symbol];
  }, [chainId, multichainNeedTokenApprove, settlementChainSpendTokenAddress, settlementChainSpendTokenId]);

  const handleApproveSourceChain = useCallback(async () => {
    if (
      !settlementChainSpendTokenAddress ||
      sourceChainSpendTokenAmountLD === undefined ||
      !multichainSpenderAddress ||
      !srcChainId
    ) {
      helperToast.error(t`Approval failed`);
      return;
    }

    const isNative = settlementChainSpendTokenAddress === zeroAddress;

    if (isNative) {
      helperToast.error(t`Native token cannot be approved`);
      return;
    }

    if (!sourceChainSpendTokenId) {
      helperToast.error(t`Approval failed`);
      return;
    }

    await wrapChainAction(srcChainId, setSettlementChainId, async (signer) => {
      await approveTokens({
        chainId: srcChainId,
        tokenAddress: sourceChainSpendTokenId.address,
        signer: signer,
        spender: multichainSpenderAddress,
        onApproveSubmitted: () => setIsApproving(true),
        setIsApproving: noop,
        permitParams: undefined,
        approveAmount: sourceChainSpendTokenAmountLD,
      });
    });
  }, [
    settlementChainSpendTokenAddress,
    sourceChainSpendTokenAmountLD,
    multichainSpenderAddress,
    srcChainId,
    sourceChainSpendTokenId,
    setSettlementChainId,
  ]);

  useEffect(() => {
    if (!multichainTokensToApproveSymbols.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, multichainTokensToApproveSymbols.length]);

  return {
    isApproving,
    approve: handleApproveSourceChain,
    isAllowanceLoaded: multichainTokensAllowanceResult.isLoaded,
    isAllowanceLoading: multichainTokensAllowanceResult.isLoading,
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
