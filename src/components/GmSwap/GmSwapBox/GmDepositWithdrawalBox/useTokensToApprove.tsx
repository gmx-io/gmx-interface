import { t } from "@lingui/macro";
import noop from "lodash/noop";
import uniq from "lodash/uniq";
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
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvTokenAddress,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsLongTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsShortTokenAmount,
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
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);
  const glvTokenAddress = useSelector(selectPoolsDetailsGlvTokenAddress);
  const longTokenAmount = useSelector(selectPoolsDetailsLongTokenAmount);
  const shortTokenAmount = useSelector(selectPoolsDetailsShortTokenAmount);
  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const marketTokenAmount = useMemo(() => {
    if (isDeposit && isMarketTokenDeposit) {
      return marketOrGlvTokenAmount;
    }
    return undefined;
  }, [isDeposit, isMarketTokenDeposit, marketOrGlvTokenAmount]);

  const glvTokenAmount = useMemo(() => {
    if (isWithdrawal && glvInfo) {
      return marketOrGlvTokenAmount;
    }
    return undefined;
  }, [isWithdrawal, glvInfo, marketOrGlvTokenAmount]);

  const payTokenAddresses = useMemo(
    function getPayTokenAddresses() {
      if (!marketToken) {
        return [];
      }

      const addresses: string[] = [];

      if (isDeposit) {
        if (longTokenAmount !== undefined && longTokenAmount > 0 && longTokenAddress) {
          addresses.push(longTokenAddress);
        }
        if (shortTokenAmount !== undefined && shortTokenAmount > 0 && shortTokenAddress) {
          addresses.push(shortTokenAddress);
        }
        if (glvInfo && isMarketTokenDeposit) {
          if (marketTokenAmount !== undefined && marketTokenAmount > 0) {
            addresses.push(marketToken.address);
          }
        }
      } else if (isWithdrawal) {
        addresses.push(glvTokenAddress ? glvTokenAddress : marketToken.address);
      }

      return uniq(addresses);
    },
    [
      marketToken,
      isDeposit,
      isWithdrawal,
      longTokenAmount,
      longTokenAddress,
      shortTokenAmount,
      shortTokenAddress,
      glvInfo,
      isMarketTokenDeposit,
      marketTokenAmount,
      glvTokenAddress,
    ]
  );

  const {
    tokensAllowanceData: settlementChainTokensAllowanceData,
    isLoading: isSettlementChainAllowanceLoading,
    isLoaded: isSettlementChainAllowanceLoaded,
  } = useTokensAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
    skip: paySource !== "settlementChain",
  });

  const settlementChainTokensToApprove = useMemo(
    function getTokensToApprove() {
      const addresses: string[] = [];

      const marketTokenAmountForApproval = isWithdrawal ? marketOrGlvTokenAmount : marketTokenAmount;

      const shouldApproveMarketToken = getNeedTokenApprove(
        settlementChainTokensAllowanceData,
        marketToken?.address,
        marketTokenAmountForApproval,
        []
      );

      const shouldApproveGlvToken = getNeedTokenApprove(
        settlementChainTokensAllowanceData,
        glvTokenAddress,
        glvTokenAmount,
        []
      );

      const shouldApproveLongToken = getNeedTokenApprove(
        settlementChainTokensAllowanceData,
        longTokenAddress,
        longTokenAmount,
        []
      );

      const shouldApproveShortToken = getNeedTokenApprove(
        settlementChainTokensAllowanceData,
        shortTokenAddress,
        shortTokenAmount,
        []
      );

      if (isDeposit) {
        if (shouldApproveLongToken && longTokenAddress) {
          addresses.push(longTokenAddress);
        }

        if (shouldApproveShortToken && shortTokenAddress) {
          addresses.push(shortTokenAddress);
        }

        if (glvInfo && isMarketTokenDeposit && shouldApproveMarketToken && marketToken) {
          addresses.push(marketToken.address);
        }
      } else if (isWithdrawal) {
        if (glvInfo && shouldApproveGlvToken && glvTokenAddress) {
          addresses.push(glvTokenAddress);
        } else if (!glvInfo && shouldApproveMarketToken && marketToken?.address) {
          addresses.push(marketToken.address);
        }
      }

      return uniq(addresses);
    },
    [
      glvInfo,
      glvTokenAddress,
      glvTokenAmount,
      isMarketTokenDeposit,
      longTokenAddress,
      longTokenAmount,
      marketToken,
      marketTokenAmount,
      isDeposit,
      isWithdrawal,
      settlementChainTokensAllowanceData,
      shortTokenAddress,
      shortTokenAmount,
      marketOrGlvTokenAmount,
    ]
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

    approveTokens({
      setIsApproving,
      signer,
      tokenAddress,
      spender: routerAddress,
      pendingTxns: [],
      setPendingTxns: () => null,
      infoTokens: {},
      chainId,
      approveAmount: undefined,
      onApproveFail: () => {
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
