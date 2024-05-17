import { useCallback, useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Tooltip from "components/Tooltip/Tooltip";

import {
  USD_DECIMALS,
  LIQUIDATION_FEE,
  TRADES_PAGE_SIZE,
  deserialize,
  getExchangeRateDisplay,
  INCREASE,
} from "lib/legacy";
import { MAX_LEVERAGE, BASIS_POINTS_DIVISOR_BIGINT } from "config/factors";
import { useTrades, useLiquidationsData } from "domain/legacy";
import { getContract } from "config/contracts";

import "./TradeHistory.css";
import { getExplorerUrl } from "config/chains";
import { bigNumberify, formatAmount } from "lib/numbers";
import { formatDateTime } from "lib/dates";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { getPriceDecimals } from "config/tokens";
import Pagination from "components/Pagination/Pagination";
import usePagination from "components/Referrals/usePagination";
import { TRADE_HISTORY_PER_PAGE } from "config/ui";
import { bigMath } from "lib/bigmath";

const { ZeroAddress } = ethers;

function getPositionDisplay(increase, indexToken, isLong, sizeDelta) {
  const symbol = indexToken ? (indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol) : "";
  const positionTypeText = increase ? t`Increase` : t`Decrease`;
  const longOrShortText = isLong ? t`Long` : t`Short`;
  return (
    <>
      {positionTypeText} {symbol} {longOrShortText} {increase ? "+" : "-"}
      {formatAmount(sizeDelta, USD_DECIMALS, 2, true)} USD
    </>
  );
}

function getOrderActionTitle(action) {
  let actionDisplay;

  if (action.startsWith("Create")) {
    actionDisplay = t`Create`;
  } else if (action.startsWith("Cancel")) {
    actionDisplay = t`Cancel`;
  } else {
    actionDisplay = t`Update`;
  }

  return t`${actionDisplay} Order`;
}

function renderLiquidationTooltip(liquidationData, label) {
  const minCollateral = bigMath.mulDiv(liquidationData.size, BASIS_POINTS_DIVISOR_BIGINT, BigInt(MAX_LEVERAGE));
  const text =
    liquidationData.type === "full"
      ? t`This position was liquidated as the max leverage of 100x was exceeded.`
      : t`Max leverage of 100x was exceeded, the remaining collateral after deducting losses and fees have been sent back to your account:`;
  return (
    <Tooltip
      position="top-start"
      handle={label}
      renderContent={() => (
        <>
          {text}
          <br />
          <br />
          <StatsTooltipRow
            label={t`Initial collateral`}
            showDollar
            value={formatAmount(liquidationData.collateral, USD_DECIMALS, 2, true)}
          />
          <StatsTooltipRow
            label={t`Min required collateral`}
            showDollar
            value={formatAmount(minCollateral, USD_DECIMALS, 2, true)}
          />
          <StatsTooltipRow
            label={t`Borrow Fee`}
            showDollar
            value={formatAmount(liquidationData.borrowFee, USD_DECIMALS, 2, true)}
            textClassName="text-red-500"
          />
          <StatsTooltipRow
            label={t`PnL`}
            showDollar={false}
            textClassName="text-red-500"
            value={`-$${formatAmount(liquidationData.loss, USD_DECIMALS, 2, true)}`}
          />
          {liquidationData.type === "full" && (
            <StatsTooltipRow label={t`Liquidation Fee`} showDollar value={formatAmount(LIQUIDATION_FEE, 30, 2, true)} />
          )}
        </>
      )}
    />
  );
}

function getLiquidationData(liquidationsDataMap, key, timestamp) {
  return liquidationsDataMap && liquidationsDataMap[`${key}:${timestamp}`];
}

export default function TradeHistory(props) {
  const { account, infoTokens, getTokenInfo, chainId, nativeTokenAddress, shouldShowPaginationButtons } = props;

  const { trades, setSize, size } = useTrades(chainId, account);

  const { currentPage, setCurrentPage, getCurrentData, pageCount } = usePagination(
    account,
    trades,
    TRADE_HISTORY_PER_PAGE
  );
  const currentPageData = getCurrentData();

  useEffect(() => {
    if (!pageCount || !currentPage) return;
    const totalPossiblePages = (TRADES_PAGE_SIZE * size) / TRADE_HISTORY_PER_PAGE;
    const doesMoreDataExist = pageCount >= totalPossiblePages;
    const isCloseToEnd = pageCount && pageCount < currentPage + 2;
    if (doesMoreDataExist && isCloseToEnd) {
      setSize((prevIndex) => prevIndex + 1);
    }
  }, [currentPage, pageCount, size, setSize]);

  const liquidationsData = useLiquidationsData(chainId, account);
  const liquidationsDataMap = useMemo(() => {
    if (!liquidationsData) {
      return null;
    }
    return liquidationsData.reduce((memo, item) => {
      const liquidationKey = `${item.key}:${item.timestamp}`;
      memo[liquidationKey] = item;
      return memo;
    }, {});
  }, [liquidationsData]);

  const getMsg = useCallback(
    (trade) => {
      const tradeData = trade.data;
      const params = JSON.parse(tradeData.params);
      const longOrShortText = params?.isLong ? t`Long` : t`Short`;
      const defaultMsg = "";

      if (tradeData.action === "BuyUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return (
          <Trans>
            Swap {formatAmount(params.tokenAmount, token.decimals, 4, true)} {token.symbol} for
            {formatAmount(params.usdgAmount, 18, 4, true)} USDG
          </Trans>
        );
      }

      if (tradeData.action === "SellUSDG") {
        const token = getTokenInfo(infoTokens, params.token, true, nativeTokenAddress);
        if (!token) {
          return defaultMsg;
        }
        return (
          <Trans>
            Swap {formatAmount(params.usdgAmount, 18, 4, true)} USDG for
            {formatAmount(params.tokenAmount, token.decimals, 4, true)} {token.symbol}
          </Trans>
        );
      }

      if (tradeData.action === "Swap") {
        const tokenIn = getTokenInfo(infoTokens, params.tokenIn, true, nativeTokenAddress);
        const tokenOut = getTokenInfo(infoTokens, params.tokenOut, true, nativeTokenAddress);
        if (!tokenIn || !tokenOut) {
          return defaultMsg;
        }
        return (
          <Trans>
            Swap {formatAmount(params.amountIn, tokenIn.decimals, 4, true)} {tokenIn.symbol} for{" "}
            {formatAmount(params.amountOut, tokenOut.decimals, 4, true)} {tokenOut.symbol}
          </Trans>
        );
      }

      if (tradeData.action === "CreateIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Request deposit into {indexToken.symbol} {longOrShortText}
            </Trans>
          );
        }

        return t`Request increase ${indexToken.symbol} ${longOrShortText}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${params.isLong ? "<" : ">"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "CreateDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Request withdrawal from {indexToken.symbol} {longOrShortText}
            </Trans>
          );
        }

        return t`Request decrease ${indexToken.symbol} ${longOrShortText}, -${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, Acceptable Price: ${params.isLong ? ">" : "<"} ${formatAmount(
          params.acceptablePrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "CancelIncreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Could not execute deposit into {indexToken.symbol} {longOrShortText}
            </Trans>
          );
        }

        return (
          <>
            <Trans>
              Could not increase {indexToken.symbol} {longOrShortText}, +
              {formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, Acceptable Price:&nbsp;
              {params.isLong ? "<" : ">"}&nbsp; USD
            </Trans>
            <Tooltip
              position="top"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD`}
              renderContent={() => (
                <Trans>Try increasing the "Allowed Slippage", under the Settings menu on the top right.</Trans>
              )}
            />
          </>
        );
      }

      if (tradeData.action === "CancelDecreasePosition") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }

        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Could not execute withdrawal from {indexToken.symbol} {longOrShortText}
            </Trans>
          );
        }

        return (
          <>
            <Trans>
              Could not decrease {indexToken.symbol} {longOrShortText}, +
              {formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD, Acceptable Price:&nbsp;
              {params.isLong ? ">" : "<"}&nbsp;
            </Trans>
            USD
            <Tooltip
              position="top-end"
              handle={`${formatAmount(params.acceptablePrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD`}
              renderContent={() => (
                <Trans>Try increasing the "Allowed Slippage", under the Settings menu on the top right</Trans>
              )}
            />
          </>
        );
      }

      if (tradeData.action === "IncreasePosition-Long" || tradeData.action === "IncreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Deposit {formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD into {indexToken.symbol}{" "}
              {longOrShortText}
            </Trans>
          );
        }
        return t`Increase ${indexToken.symbol} ${longOrShortText}, +${formatAmount(
          params.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD, ${indexToken.symbol} Price: ${formatAmount(
          params.price,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
      }

      if (tradeData.action === "DecreasePosition-Long" || tradeData.action === "DecreasePosition-Short") {
        if (params.flags?.isOrderExecution) {
          return;
        }

        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        if (bigNumberify(params.sizeDelta) == 0n) {
          return (
            <Trans>
              Withdraw {formatAmount(params.collateralDelta, USD_DECIMALS, 2, true)} USD from {indexToken.symbol}
              {longOrShortText}{" "}
            </Trans>
          );
        }
        const isLiquidation = params.flags?.isLiquidation;
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);

        if (isLiquidation && liquidationData) {
          return (
            <>
              {renderLiquidationTooltip(liquidationData, t`Partial Liquidation`)}&nbsp;
              {indexToken.symbol} {longOrShortText}, -{formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,{" "}
              {indexToken.symbol}&nbsp; Price: ${formatAmount(params.price, USD_DECIMALS, indexTokenPriceDecimal, true)}{" "}
              USD
            </>
          );
        }
        const actionDisplay = isLiquidation ? t`Partially Liquidated` : t`Decreased`;
        return t`${actionDisplay} ${indexToken.symbol} ${longOrShortText},
        -${formatAmount(params.sizeDelta, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.price, USD_DECIMALS, indexTokenPriceDecimal, true)} USD
      `;
      }

      if (tradeData.action === "LiquidatePosition-Long" || tradeData.action === "LiquidatePosition-Short") {
        const indexToken = getTokenInfo(infoTokens, params.indexToken, true, nativeTokenAddress);
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        if (!indexToken) {
          return defaultMsg;
        }
        const liquidationData = getLiquidationData(liquidationsDataMap, params.key, tradeData.timestamp);
        if (liquidationData) {
          return (
            <Trans>
              {renderLiquidationTooltip(liquidationData, t`Liquidated`)}&nbsp; {indexToken.symbol} {longOrShortText}, -
              {formatAmount(params.size, USD_DECIMALS, 2, true)} USD,&nbsp;
              {indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexTokenPriceDecimal, true)}{" "}
              USD
            </Trans>
          );
        }
        return t`
        Liquidated ${indexToken.symbol} ${longOrShortText},
        -${formatAmount(params.size, USD_DECIMALS, 2, true)} USD,
        ${indexToken.symbol} Price: ${formatAmount(params.markPrice, USD_DECIMALS, indexTokenPriceDecimal, true)} USD
      `;
      }

      if (["ExecuteIncreaseOrder", "ExecuteDecreaseOrder"].includes(tradeData.action)) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken, true, nativeTokenAddress);
        if (!indexToken) {
          return defaultMsg;
        }
        const longShortDisplay = order.isLong ? t`Long` : t`Short`;
        const orderTypeText = order.type === INCREASE ? t`Increase` : t`Decrease`;
        const executionPriceDisplay = formatAmount(order.executionPrice, USD_DECIMALS, 2, true);
        const sizeDeltaDisplay = `${order.type === "Increase" ? "+" : "-"}${formatAmount(
          order.sizeDelta,
          USD_DECIMALS,
          2,
          true
        )}`;
        return (
          <Trans>
            Execute Order: {orderTypeText} {indexToken.symbol} {longShortDisplay} {sizeDeltaDisplay} USD, Price:{" "}
            {executionPriceDisplay} USD
          </Trans>
        );
      }

      if (
        [
          "CreateIncreaseOrder",
          "CancelIncreaseOrder",
          "UpdateIncreaseOrder",
          "CreateDecreaseOrder",
          "CancelDecreaseOrder",
          "UpdateDecreaseOrder",
        ].includes(tradeData.action)
      ) {
        const order = deserialize(params.order);
        const indexToken = getTokenInfo(infoTokens, order.indexToken);
        if (!indexToken) {
          return defaultMsg;
        }
        const indexTokenPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
        const increase = tradeData.action.includes("Increase");
        const priceDisplay = `${order.triggerAboveThreshold ? ">" : "<"} ${formatAmount(
          order.triggerPrice,
          USD_DECIMALS,
          indexTokenPriceDecimal,
          true
        )} USD`;
        return (
          <Trans>
            {getOrderActionTitle(tradeData.action)}:{" "}
            {getPositionDisplay(increase, indexToken, order.isLong, order.sizeDelta)}, Price: {priceDisplay}
          </Trans>
        );
      }

      if (tradeData.action === "ExecuteSwapOrder") {
        const order = deserialize(params.order);
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromToken = getTokenInfo(infoTokens, order.path[0] === nativeTokenAddress ? ZeroAddress : order.path[0]);
        const toToken = getTokenInfo(infoTokens, order.shouldUnwrap ? ZeroAddress : order.path[order.path.length - 1]);
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const fromAmountDisplay = formatAmount(order.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true);
        const toAmountDisplay = formatAmount(order.amountOut, toToken.decimals, toToken.isStable ? 2 : 4, true);
        return (
          <Trans>
            Execute Order: Swap {fromAmountDisplay} {fromToken.symbol} for {toAmountDisplay} {toToken.symbol}
          </Trans>
        );
      }

      if (["CreateSwapOrder", "UpdateSwapOrder", "CancelSwapOrder"].includes(tradeData.action)) {
        const order = deserialize(params.order);
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromToken = getTokenInfo(infoTokens, order.path[0] === nativeTokenAddress ? ZeroAddress : order.path[0]);
        const toToken = getTokenInfo(infoTokens, order.shouldUnwrap ? ZeroAddress : order.path[order.path.length - 1]);
        if (!fromToken || !toToken) {
          return defaultMsg;
        }
        const amountInDisplay = fromToken
          ? formatAmount(order.amountIn, fromToken.decimals, fromToken.isStable ? 2 : 4, true)
          : "";
        const minOutDisplay = toToken
          ? formatAmount(order.minOut, toToken.decimals, toToken.isStable ? 2 : 4, true)
          : "";

        return (
          <Trans>
            {getOrderActionTitle(tradeData.action)}: Swap {amountInDisplay}
            {fromToken?.symbol || ""} for
            {minOutDisplay} {toToken?.symbol || ""}, Price:
            {getExchangeRateDisplay(order.triggerRatio, fromToken, toToken)} USD
          </Trans>
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getTokenInfo, infoTokens, nativeTokenAddress, chainId, liquidationsDataMap]
  );

  const tradesWithMessages = useMemo(() => {
    if (!currentPageData) {
      return [];
    }

    return currentPageData
      .map((trade) => ({
        msg: getMsg(trade),
        ...trade,
      }))
      .filter((trade) => trade.msg);
  }, [currentPageData, getMsg]);

  return (
    <div className="TradeHistory">
      {tradesWithMessages.length === 0 && (
        <div className="TradeHistory-row App-box">
          <Trans>No trades yet</Trans>
        </div>
      )}
      {tradesWithMessages.length > 0 &&
        tradesWithMessages.map((trade, index) => {
          const tradeData = trade.data;
          const txUrl = getExplorerUrl(chainId) + "tx/" + tradeData.txhash;

          let msg = getMsg(trade);

          if (!msg) {
            return null;
          }

          return (
            <div className="TradeHistory-row App-box App-box-border" key={index}>
              <div>
                <div className="muted TradeHistory-time">
                  {formatDateTime(tradeData.timestamp)}
                  {(!account || account.length === 0) && (
                    <span>
                      {" "}
                      (<Link to={`/actions/v1/${tradeData.account}`}>{tradeData.account}</Link>)
                    </span>
                  )}
                </div>
                <ExternalLink className="plain TradeHistory-item-link" href={txUrl}>
                  {msg}
                </ExternalLink>
              </div>
            </div>
          );
        })}
      {shouldShowPaginationButtons && (
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={(page) => setCurrentPage(page)} />
      )}
    </div>
  );
}
