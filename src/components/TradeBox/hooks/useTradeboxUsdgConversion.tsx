import { t, Trans } from "@lingui/macro";
import { ReactNode, useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { getUsdgConversionTokenAddress } from "config/usdgPools";
import {
  selectChainId,
  selectMarketsInfoData,
  selectTokensData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExternalSwapIsLoading,
  selectTradeboxCollateralTokenAddress,
  selectTradeboxFormState,
  selectTradeboxFromToken,
  selectTradeboxFromTokenAmount,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { makeSelectFindSwapPath } from "context/SyntheticsStateContext/selectors/tradeSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsSwapPathFillable, getMaxInstantSwapAmount } from "domain/synthetics/usdgPools/usdcConversion";
import { formatAmountFree, formatBalanceAmount } from "lib/numbers";

import { EmbeddedActionButton } from "components/Button/EmbeddedActionButton";

const ALERT_LINK_CLASSNAME = "text-blue-300 decoration-blue-300 hover:text-blue-300";

type ButtonStateOverride = {
  text: ReactNode;
  disabled: boolean;
  onSubmit: () => Promise<void>;
};

export type TradeboxUsdgConversion = ReturnType<typeof useTradeboxUsdgConversion>;

/**
 * USDG pools take only USDG: a USDC margin converts inside the order through our pool or the aggregator,
 * and when neither can fill the trader needs the instant limit instead of a bare "No swap path found"
 */
export function useTradeboxUsdgConversion() {
  const chainId = useSelector(selectChainId);
  const history = useHistory();
  const tokensData = useSelector(selectTokensData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const collateralTokenAddress = useSelector(selectTradeboxCollateralTokenAddress);
  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = useSelector(selectTradeboxFromTokenAmount);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const isExternalSwapLoading = useSelector(selectExternalSwapIsLoading);
  const { setFromTokenInputValue, setFocusedInput } = useSelector(selectTradeboxFormState);

  const usdcAddress = getUsdgConversionTokenAddress(chainId, collateralTokenAddress);
  const usdgToken = collateralTokenAddress ? tokensData?.[collateralTokenAddress] : undefined;
  const isPayingUsdc =
    tradeFlags.isIncrease &&
    usdcAddress !== undefined &&
    fromToken?.address === usdcAddress &&
    fromTokenAmount !== undefined &&
    fromTokenAmount > 0n;

  const findSwapPath = useSelector(makeSelectFindSwapPath(usdcAddress, collateralTokenAddress));

  // without market data the route finder returns nothing, which isn't the same as the pool being short
  const isTooLarge =
    isPayingUsdc &&
    marketsInfoData !== undefined &&
    tradeFlags.isMarket &&
    increaseAmounts !== undefined &&
    increaseAmounts.swapStrategy.type !== "externalSwap" &&
    !isExternalSwapLoading &&
    !getIsSwapPathFillable(increaseAmounts.swapStrategy.swapPathStats);

  const maxInstantAmount = useMemo(() => {
    if (!isTooLarge || !fromToken || fromTokenAmount === undefined) {
      return undefined;
    }

    return getMaxInstantSwapAmount({ tokenIn: fromToken, maxAmountIn: fromTokenAmount, findSwapPath });
  }, [findSwapPath, fromToken, fromTokenAmount, isTooLarge]);

  const onUseMaxInstant = useCallback(() => {
    if (maxInstantAmount === undefined || !fromToken) return;

    setFocusedInput("from");
    setFromTokenInputValue(formatAmountFree(maxInstantAmount, fromToken.decimals));
  }, [fromToken, maxInstantAmount, setFocusedInput, setFromTokenInputValue]);

  const onConvertWithPaxos = useCallback(() => {
    if (!fromToken || !usdgToken || fromTokenAmount === undefined) return;

    history.push(
      `/trade/swap?mode=market&from=${fromToken.symbol}&to=${usdgToken.symbol}&amount=${formatAmountFree(
        fromTokenAmount,
        fromToken.decimals
      )}`
    );
  }, [fromToken, fromTokenAmount, history, usdgToken]);

  const maxInstantText =
    maxInstantAmount !== undefined && fromToken
      ? formatBalanceAmount(maxInstantAmount, fromToken.decimals, fromToken.symbol, { isStable: fromToken.isStable })
      : undefined;

  let tooLargeAlert: ReactNode = undefined;

  if (isTooLarge && maxInstantAmount !== undefined && maxInstantAmount > 0n) {
    tooLargeAlert = (
      <Trans>
        Up to {maxInstantText} can be converted instantly.{" "}
        <EmbeddedActionButton className={ALERT_LINK_CLASSNAME} onClick={onUseMaxInstant}>
          Use max instant
        </EmbeddedActionButton>
        , or{" "}
        <EmbeddedActionButton className={ALERT_LINK_CLASSNAME} onClick={onConvertWithPaxos}>
          convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  } else if (isTooLarge && maxInstantAmount !== undefined) {
    tooLargeAlert = (
      <Trans>
        Nothing can be converted instantly right now.{" "}
        <EmbeddedActionButton className={ALERT_LINK_CLASSNAME} onClick={onConvertWithPaxos}>
          Convert with Paxos first
        </EmbeddedActionButton>{" "}
        in the Swap tab: a one-time conversion, 2 to 10 min or longer. Trades paid in USDG need no conversion.
      </Trans>
    );
  }

  const buttonState = useMemo((): ButtonStateOverride | undefined => {
    if (!isTooLarge) {
      return undefined;
    }

    return {
      text:
        maxInstantAmount !== undefined && maxInstantAmount > 0n
          ? t`Max instant margin: ${maxInstantText}`
          : t`Too large to convert instantly`,
      disabled: true,
      onSubmit: async () => undefined,
    };
  }, [isTooLarge, maxInstantAmount, maxInstantText]);

  return {
    isTooLarge,
    buttonState,
    tooLargeAlert,
  };
}
