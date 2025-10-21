import { t } from "@lingui/macro";
import noop from "lodash/noop";
import uniq from "lodash/uniq";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import { SourceChainId } from "config/chains";
import { getMappedTokenId } from "config/multichain";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import {
  selectPoolsDetailsFirstToken,
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSecondTokenAmount,
} from "context/PoolsDetailsContext/PoolsDetailsContext";
import { useMultichainApprovalsActiveListener } from "context/SyntheticsEvents/useMultichainEvents";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { GlvInfo } from "domain/synthetics/markets";
import { getNeedTokenApprove, TokenData, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { adjustForDecimals } from "lib/numbers";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import { getContract } from "sdk/configs/contracts";
import { getToken } from "sdk/configs/tokens";

import { wrapChainAction } from "components/GmxAccountModal/wrapChainAction";

import { Operation } from "../types";

interface Props {
  routerAddress: string;
  glvInfo: GlvInfo | undefined;
  operation: Operation;

  marketToken: TokenData | undefined;
  longTokenAddress: string | undefined;
  shortTokenAddress: string | undefined;
  glvTokenAddress: string | undefined;

  marketTokenAmount: bigint | undefined;
  longTokenAmount: bigint | undefined;
  shortTokenAmount: bigint | undefined;
  glvTokenAmount: bigint | undefined;

  isMarketTokenDeposit?: boolean;
}

export const useTokensToApprove = ({
  routerAddress,
  glvInfo,
  operation,
  marketToken,
  marketTokenAmount,
  longTokenAddress,
  longTokenAmount,
  shortTokenAddress,
  shortTokenAmount,
  glvTokenAddress,
  glvTokenAmount,
  isMarketTokenDeposit,
}: Props): {
  tokensToApproveSymbols: string[];
  isAllowanceLoading: boolean;
  isAllowanceLoaded: boolean;
  approve: () => void;
  isApproving: boolean;
} => {
  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const signer = useEthersSigner();

  const [isApproving, setIsApproving] = useState(false);

  const firstTokenAddress = useSelector(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = useSelector(selectPoolsDetailsSecondTokenAddress);
  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);

  const firstToken = useSelector(selectPoolsDetailsFirstToken);
  const firstTokenSourceChainTokenId =
    firstTokenAddress !== undefined && srcChainId !== undefined
      ? getMappedTokenId(chainId as SourceChainId, firstTokenAddress, srcChainId)
      : undefined;
  // const secondTokenSourceChainTokenId =
  //   secondTokenAddress !== undefined && srcChainId !== undefined
  //     ? getMappedTokenId(chainId as SourceChainId, secondTokenAddress, srcChainId)
  //     : undefined;

  const multichainSpenderAddress = firstTokenSourceChainTokenId?.stargate;

  useMultichainApprovalsActiveListener(paySource === "sourceChain" ? srcChainId : undefined, "multichain-gm-swap-box");

  const multichainTokensAllowanceResult = useTokensAllowanceData(paySource === "sourceChain" ? srcChainId : undefined, {
    spenderAddress: multichainSpenderAddress,
    tokenAddresses: firstTokenSourceChainTokenId ? [firstTokenSourceChainTokenId.address] : [],
    skip: srcChainId === undefined,
  });
  const multichainTokensAllowanceData =
    srcChainId !== undefined ? multichainTokensAllowanceResult.tokensAllowanceData : undefined;

  const firstTokenAmountLD =
    firstTokenAmount !== undefined &&
    firstTokenAddress !== undefined &&
    firstTokenSourceChainTokenId !== undefined &&
    firstToken
      ? adjustForDecimals(firstTokenAmount, firstToken.decimals, firstTokenSourceChainTokenId.decimals)
      : undefined;
  const fistToken = useSelector(selectPoolsDetailsFirstToken);
  const multichainNeedTokenApprove =
    paySource === "sourceChain"
      ? getNeedTokenApprove(
          multichainTokensAllowanceData,
          firstTokenAddress === zeroAddress ? zeroAddress : firstTokenSourceChainTokenId?.address,
          firstTokenAmountLD,
          EMPTY_ARRAY
        )
      : false;
  const multichainTokensToApproveSymbols = useMemo(() => {
    return fistToken?.symbol && multichainNeedTokenApprove ? [fistToken.symbol] : EMPTY_ARRAY;
  }, [fistToken, multichainNeedTokenApprove]);

  const handleApproveSourceChain = useCallback(async () => {
    if (!firstTokenAddress || firstTokenAmountLD === undefined || !multichainSpenderAddress || !srcChainId) {
      helperToast.error(t`Approval failed`);
      return;
    }

    const isNative = firstTokenAddress === zeroAddress;

    if (isNative) {
      helperToast.error(t`Native token cannot be approved`);
      return;
    }

    if (!firstTokenSourceChainTokenId) {
      helperToast.error(t`Approval failed`);
      return;
    }

    await wrapChainAction(srcChainId, setSettlementChainId, async (signer) => {
      await approveTokens({
        chainId: srcChainId,
        tokenAddress: firstTokenSourceChainTokenId.address,
        signer: signer,
        spender: multichainSpenderAddress,
        onApproveSubmitted: () => setIsApproving(true),
        setIsApproving: noop,
        permitParams: undefined,
        approveAmount: firstTokenAmountLD,
      });
    });
  }, [
    firstTokenAddress,
    firstTokenAmountLD,
    multichainSpenderAddress,
    srcChainId,
    firstTokenSourceChainTokenId,
    setSettlementChainId,
  ]);

  const payTokenAddresses = useMemo(
    function getPayTokenAddresses() {
      if (!marketToken) {
        return [];
      }

      const addresses: string[] = [];

      if (operation === Operation.Deposit) {
        if (firstTokenAmount !== undefined && firstTokenAmount > 0 && firstTokenAddress) {
          addresses.push(firstTokenAddress);
        }
        if (secondTokenAmount !== undefined && secondTokenAmount > 0 && secondTokenAddress) {
          addresses.push(secondTokenAddress);
        }
        if (glvInfo && isMarketTokenDeposit) {
          if (marketTokenAmount !== undefined && marketTokenAmount > 0) {
            addresses.push(marketToken.address);
          }
        }
      } else if (operation === Operation.Withdrawal) {
        addresses.push(glvTokenAddress ? glvTokenAddress : marketToken.address);
      }

      return uniq(addresses);
    },
    [
      marketToken,
      operation,
      firstTokenAmount,
      firstTokenAddress,
      secondTokenAmount,
      secondTokenAddress,
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
  } = useTokensAllowanceData(paySource === "settlementChain" ? chainId : undefined, {
    spenderAddress: routerAddress,
    tokenAddresses: payTokenAddresses,
    skip: paySource === "settlementChain" ? true : false,
  });

  const settlementChainTokensToApprove = useMemo(
    function getTokensToApprove() {
      if (paySource !== "settlementChain") {
        return EMPTY_ARRAY;
      }

      const addresses: string[] = [];

      const shouldApproveMarketToken = getNeedTokenApprove(
        settlementChainTokensAllowanceData,
        marketToken?.address,
        marketTokenAmount,
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

      if (operation === Operation.Deposit) {
        if (shouldApproveLongToken && longTokenAddress) {
          addresses.push(longTokenAddress);
        }

        if (shouldApproveShortToken && shortTokenAddress) {
          addresses.push(shortTokenAddress);
        }

        if (glvInfo && isMarketTokenDeposit && shouldApproveMarketToken && marketToken) {
          addresses.push(marketToken.address);
        }
      } else if (operation === Operation.Withdrawal) {
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
      operation,
      paySource,
      settlementChainTokensAllowanceData,
      shortTokenAddress,
      shortTokenAmount,
    ]
  );

  const settlementChainTokensToApproveSymbols = settlementChainTokensToApprove.map(
    (tokenAddress) => getToken(chainId, tokenAddress).symbol
  );

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
      spender: getContract(chainId, "SyntheticsRouter"),
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

  // useEffect(() => {
  //   if (!multichainNeedTokenApprove && isApproving) {
  //     setIsApproving(false);
  //   }
  // }, [isApproving, multichainNeedTokenApprove]);
  useEffect(() => {
    // if (!settlementChainTokensToApprove.length && isApproving) {
    //   setIsApproving(false);
    // }
    if (paySource === "settlementChain" && !settlementChainTokensToApprove.length && isApproving) {
      setIsApproving(false);
    } else if (paySource === "sourceChain" && !multichainTokensToApproveSymbols.length && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, multichainTokensToApproveSymbols.length, paySource, settlementChainTokensToApprove.length]);

  return {
    // tokensToApprove,
    // payTokenAddresses,
    // isAllowanceLoading,
    // isAllowanceLoaded,
    isApproving,
    approve:
      paySource === "settlementChain"
        ? onApproveSettlementChain
        : paySource === "sourceChain"
          ? handleApproveSourceChain
          : noop,
    isAllowanceLoaded:
      paySource === "settlementChain"
        ? isSettlementChainAllowanceLoaded
        : paySource === "sourceChain"
          ? multichainTokensAllowanceResult.isLoaded
          : false,
    isAllowanceLoading:
      paySource === "settlementChain"
        ? isSettlementChainAllowanceLoading
        : paySource === "sourceChain"
          ? multichainTokensAllowanceResult.isLoading
          : false,
    tokensToApproveSymbols:
      paySource === "settlementChain"
        ? settlementChainTokensToApproveSymbols
        : paySource === "sourceChain"
          ? multichainTokensToApproveSymbols
          : EMPTY_ARRAY,
  };
};
