import {
  AggregatedPositionData,
  formatLeverage,
  formatPnl,
  getLeverage,
  getLiquidationPrice,
} from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import Modal from "components/Modal/Modal";
import {
  formatTokenAmount,
  formatUsdAmount,
  getTokenAmountFromUsd,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useState } from "react";
import { formatAmount, parseValue } from "lib/numbers";
import { DEFAULT_SLIPPAGE_AMOUNT, DUST_USD, USD_DECIMALS } from "lib/legacy";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { Trans, t } from "@lingui/macro";
import { OrderType, createDecreaseOrderTxn } from "domain/synthetics/orders";
import { useWeb3React } from "@web3-react/core";
import { getExecutionFee } from "domain/synthetics/fees";
import { InfoRow } from "components/InfoRow/InfoRow";
import { BigNumber } from "ethers";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { KEEP_LEVERAGE_FOR_DECREASE_KEY } from "config/localStorage";
import Checkbox from "components/Checkbox/Checkbox";

import "./PositionSeller.scss";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

type Props = {
  position: AggregatedPositionData;
  onClose: () => void;
};

function getNextCollateralUsd(p: {
  isClosing?: boolean;
  collateralUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  fees?: BigNumber;
  pnl?: BigNumber;
}) {
  if (!p.collateralUsd || !p.collateralDeltaUsd || !p.fees) return undefined;

  if (p.isClosing) return BigNumber.from(0);

  let nextCollateralUsd = p.collateralUsd.sub(p.collateralDeltaUsd).sub(p.fees);

  if (p.pnl?.lt(0)) {
    nextCollateralUsd = nextCollateralUsd.add(p.pnl);
  }

  return nextCollateralUsd;
}

export function PositionSeller(p: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const { position } = p;

  const tokensData = useAvailableTokensData(chainId);

  const [sizeInput, setSizeInput] = useState("");
  const sizeInputUsd = parseValue(sizeInput || "0", USD_DECIMALS)!;

  const isClosing = position.sizeInUsd?.sub(sizeInputUsd).lt(DUST_USD);

  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);

  const fees = BigNumber.from(0);

  const sizeDelta = isClosing ? position.sizeInUsd : sizeInputUsd;

  const collateralDeltaUsd =
    keepLeverage && position.collateralUsd && sizeDelta && position.currentSizeUsd
      ? sizeDelta.mul(position.collateralUsd).div(position.currentSizeUsd)
      : BigNumber.from(0);

  const nextCollateralUsd = getNextCollateralUsd({
    isClosing,
    collateralUsd: position.collateralUsd,
    collateralDeltaUsd,
    fees,
    pnl: position.pnl,
  });

  const nextSizeUsd = isClosing ? BigNumber.from(0) : position.sizeInUsd?.sub(sizeDelta);

  const nextLiqPrice = nextSizeUsd.gt(0)
    ? getLiquidationPrice({
        currentSizeUsd: nextSizeUsd,
        collateralUsd: nextCollateralUsd,
        feesUsd: fees,
        averagePrice: position.averagePrice,
        isLong: position.isLong,
      })
    : undefined;

  const nextLeverage = nextSizeUsd.gt(0)
    ? getLeverage({
        sizeUsd: nextSizeUsd,
        collateralUsd: nextCollateralUsd,
      })
    : undefined;

  // if (!isClosing) {
  //   if (collateralUsd) {
  //     nextCollateralUsd = collateralUsd;
  //     if (collateralDeltaUsd?.gt(0)) {
  //       nextCollateralUsd = collateralUsd.sub(collateralDeltaUsd);
  //     } else if (positionDelta && positionDelta.gt(0) && sizeDelta) {
  //       if (!positionHasProfit) {
  //         nextCollateralUsd = nextCollateralUsd.sub(nextCollateralUsd);
  //       }
  //     }
  //   }
  // }

  //   const [deltaStr, deltaPercentageStr] = useMemo(() => {
  //     if (!position || !position.markPrice || position.collateral.eq(0)) {
  //       return ["-", "-"];
  //     }
  //     if (orderOption !== STOP) {
  //       const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
  //         position.markPrice,
  //         position,
  //         fromAmount
  //       );
  //       const { deltaStr, deltaPercentageStr } = getDeltaStr({
  //         delta: pendingDelta,
  //         deltaPercentage: pendingDeltaPercentage,
  //         hasProfit,
  //       });
  //       return [deltaStr, deltaPercentageStr];
  //     }
  //     if (!triggerPriceUsd || triggerPriceUsd.eq(0)) {
  //       return ["-", "-"];
  //     }

  //     const { pendingDelta, pendingDeltaPercentage, hasProfit } = calculatePositionDelta(
  //       triggerPriceUsd,
  //       position,
  //       fromAmount
  //     );

  //     const { deltaStr, deltaPercentageStr } = getDeltaStr({
  //       delta: pendingDelta,
  //       deltaPercentage: pendingDeltaPercentage,
  //       hasProfit,
  //     });
  //     return [deltaStr, deltaPercentageStr];
  //   }, [position, triggerPriceUsd, orderOption, fromAmount]);

  const executionFee = getExecutionFee(tokensData);

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    // const error = getError();

    // if (error) {
    //   return error;
    // }

    // if (hasPendingProfit) {
    //   return t`Close without profit`;
    // }

    // return isSubmitting ? t`Closing...` : t`Close`;

    return {
      text: t`Close`,
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (
      !position.indexToken ||
      !account ||
      !position ||
      !sizeDelta?.gt(0) ||
      !executionFee?.feeTokenAmount ||
      !position.currentSizeUsd
    )
      return;

    const collateralAmount = collateralDeltaUsd?.gt(0)
      ? getTokenAmountFromUsd(tokensData, position.collateralToken!.address, collateralDeltaUsd)
      : BigNumber.from(0);

    const adjustedSizeDeltaUsd = position.sizeInUsd.mul(sizeDelta).div(position.currentSizeUsd);

    // console.log("params", {
    //   collateralAmount: formatTokenAmount(collateralAmount, position.collateralToken!.decimals),
    //   sizeDeltaUsd: formatUsdAmount(adjustedSizeDeltaUsd),
    // });

    createDecreaseOrderTxn(chainId, library, {
      account,
      market: position.marketAddress,
      indexTokenAddress: position.indexToken.address,
      swapPath: [],
      initialCollateralAmount: collateralAmount,
      initialCollateralAddress: position.collateralTokenAddress,
      receiveTokenAddress: position.collateralTokenAddress,
      priceImpactDelta: BigNumber.from(0),
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      sizeDeltaUsd: adjustedSizeDeltaUsd,
      orderType: OrderType.MarketDecrease,
      isLong: position.isLong,
      executionFee: executionFee.feeTokenAmount,
      tokensData,
    });
  }

  if (!position) {
    return null;
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="PositionEditor PositionSeller">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={
          <Trans>
            Close {position?.isLong ? t`Long` : t`Short`} {position.indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        <BuyInputSection
          topLeftLabel={t`Close`}
          topRightLabel={t`Max`}
          topRightValue={formatUsdAmount(position.currentSizeUsd)}
          inputValue={sizeInput}
          onInputValueChange={(e) => setSizeInput(e.target.value)}
          showMaxButton={position.currentSizeUsd?.gt(0) && !sizeDelta?.eq(position.currentSizeUsd)}
          onClickMax={() => setSizeInput(formatAmount(position.currentSizeUsd, USD_DECIMALS, 2))}
        >
          USD
        </BuyInputSection>

        {/* FOR SL/TP */}
        {/* {MIN_PROFIT_TIME > 0 && profitPrice && nextDelta.eq(0) && nextHasProfit && (
          <div className="Confirmation-box-warning">
            <Trans>
              Reducing the position at the current price will forfeit a&nbsp;
              <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#minimum-price-change">
                pending profit
              </ExternalLink>{" "}
              of {deltaText}. <br />
            </Trans>
            <Trans>
              <br />
              Profit price: {isLong ? ">" : "<"} ${formatUsdAmount(profitPrice, USD_DECIMALS, 2, true)}. This rule
              applies for the next {getTimeRemaining(minProfitExpiration)}, until {formatDateTime(minProfitExpiration)}.
            </Trans>
          </div>
        )} */}

        <div className="PositionEditor-info-box PositionSeller-info-box">
          {/* {minExecutionFeeErrorMessage && <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>} */}

          {/* {hasPendingProfit && orderOption !== STOP && (
            <div className="PositionEditor-accept-profit-warning">
              <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                <span className="muted">Forfeit profit</span>
              </Checkbox>
            </div>
          )} */}

          <div className="PositionEditor-keep-leverage-settings">
            <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
              <span className="muted font-sm">
                <Trans>Keep leverage at {position.leverage ? formatLeverage(position.leverage) : "..."}</Trans>
              </span>
            </Checkbox>
          </div>

          <div className="App-card-divider" />

          {/* <div className="PositionEditor-allow-higher-slippage">
            <Checkbox isChecked={isHigherSlippageAllowed} setIsChecked={setIsHigherSlippageAllowed}>
              <span className="muted font-sm">
                <Trans>Allow up to 1% slippage</Trans>
              </span>
            </Checkbox>
          </div> */}

          {/* <div>
            <ExchangeInfoRow label={t`Allowed Slippage`}>
              <Tooltip
                handle={`${formatAmount(allowedSlippage, 2, 2)}%`}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <Trans>
                      You can change this in the settings menu on the top right of the page.
                      <br />
                      <br />
                      Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if prices are
                      volatile.
                    </Trans>
                  );
                }}
              />
            </ExchangeInfoRow>
          </div> */}

          <InfoRow label={t`Mark Price`} value={formatUsdAmount(position.markPrice)} />
          <InfoRow label={t`Entry Price`} value={formatUsdAmount(position.entryPrice)} />

          <InfoRow
            label={t`Liq Price`}
            value={
              nextSizeUsd.gt(0) && position.liqPrice ? (
                <ValueTransition
                  from={formatUsdAmount(position.liqPrice)}
                  to={nextLiqPrice && !nextLiqPrice.eq(position.liqPrice) ? formatUsdAmount(nextLiqPrice) : undefined}
                />
              ) : (
                "-"
              )
            }
          />

          <div className="App-card-divider" />

          <InfoRow
            label={t`Size`}
            value={
              <ValueTransition
                from={formatUsdAmount(position.currentSizeUsd)}
                to={
                  position.currentSizeUsd && nextSizeUsd && !nextSizeUsd.eq(position.currentSizeUsd)
                    ? formatUsdAmount(nextSizeUsd)
                    : undefined
                }
              />
            }
          />

          <InfoRow
            label={t`Collateral (${position.collateralToken?.symbol})`}
            value={
              <ValueTransition
                from={formatUsdAmount(position.collateralUsd)}
                to={
                  nextCollateralUsd && position.collateralUsd && !nextCollateralUsd.eq(position.collateralUsd)
                    ? formatUsdAmount(nextCollateralUsd)
                    : undefined
                }
              />
            }
          />

          {keepLeverage && (
            <InfoRow
              label={t`Leverage`}
              value={
                <ValueTransition
                  from={position.leverage ? formatLeverage(position.leverage) : "..."}
                  to={
                    nextLeverage && position.leverage && !nextLeverage.eq(position.leverage)
                      ? formatLeverage(nextLeverage)
                      : undefined
                  }
                />
              }
            />
          )}

          <InfoRow label={t`PnL`} value={position.pnl ? formatPnl(position.pnl, position.pnlPercentage) : "..."} />

          {/* <div className="Exchange-info-row">
            <div className="Exchange-info-label">
              <Trans>Fees</Trans>
            </div>
            <div className="align-right">
              <Tooltip
                position="right-top"
                className="PositionSeller-fees-tooltip"
                handle={
                  <div>
                    {totalFees ? `$${formatAmount(totalFees.add(executionFeeUsd), USD_DECIMALS, 2, true)}` : "-"}
                  </div>
                }
                renderContent={() => (
                  <div>
                    {fundingFee && (
                      <StatsTooltipRow label={t`Borrow fee`} value={formatAmount(fundingFee, USD_DECIMALS, 2, true)} />
                    )}

                    {positionFee && (
                      <StatsTooltipRow
                        label={t`Closing fee`}
                        value={formatAmount(positionFee, USD_DECIMALS, 2, true)}
                      />
                    )}

                    {swapFee && (
                      <StatsTooltipRow
                        label={t`Swap fee`}
                        showDollar={false}
                        value={`${formatAmount(swapFeeToken, collateralToken.decimals, 5)} ${collateralToken.symbol}
                             ($${formatAmount(swapFee, USD_DECIMALS, 2, true)})`}
                      />
                    )}

                    <StatsTooltipRow
                      label={t`Execution fee`}
                      showDollar={false}
                      value={`${formatAmount(executionFee, 18, 5, true)} ${nativeTokenSymbol} ($${formatAmount(
                        executionFeeUsd,
                        USD_DECIMALS,
                        2
                      )})`}
                    />

                    <br />

                    <div className="PositionSeller-fee-item">
                      <Trans>
                        <ExternalLink href="https://gmxio.gitbook.io/gmx/trading#fees">More Info</ExternalLink> about
                        fees.
                      </Trans>
                    </div>
                  </div>
                )}
              />
            </div>
          </div> */}

          <div className="Exchange-info-row PositionSeller-receive-row top-line">
            <div className="Exchange-info-label">
              <Trans>Receive</Trans>
            </div>

            {/* {!isSwapAllowed && receiveToken && (
              <div className="align-right PositionSelector-selected-receive-token">
                {formatAmount(convertedReceiveAmount, receiveToken.decimals, 4, true)}
                &nbsp;{receiveToken.symbol} ($
                {formatAmount(receiveAmount, USD_DECIMALS, 2, true)})
              </div>
            )} */}

            {/* {isSwapAllowed && receiveToken && (
              <div className="align-right">
                <TokenSelector
                  // Scroll lock lead to side effects
                  // if it applied on modal inside another modal
                  disableBodyScrollLock={true}
                  className={cx("PositionSeller-token-selector", {
                    warning: isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded,
                  })}
                  label={t`Receive`}
                  showBalances={false}
                  chainId={chainId}
                  tokenAddress={receiveToken.address}
                  onSelectToken={(token) => {
                    setSwapToToken(token);
                    setSavedRecieveTokenAddress(token.address);
                  }}
                  tokens={toTokens}
                  getTokenState={(tokenOptionInfo) => {
                    if (!shouldSwap(collateralToken, tokenOptionInfo)) {
                      return;
                    }

                    const convertedTokenAmount = getTokenAmountFromUsd(
                      infoTokens,
                      tokenOptionInfo.address,
                      receiveAmount
                    );

                    const isNotEnoughLiquidity =
                      tokenOptionInfo.availableAmount.lt(convertedTokenAmount) ||
                      tokenOptionInfo.bufferAmount.gt(tokenOptionInfo.poolAmount.sub(convertedTokenAmount));

                    if (isNotEnoughLiquidity) {
                      const { maxIn, maxOut, maxInUsd, maxOutUsd } = getSwapLimits(
                        infoTokens,
                        collateralToken.address,
                        tokenOptionInfo.address
                      );

                      const collateralInfo = getTokenInfo(infoTokens, collateralToken.address);

                      return {
                        disabled: true,
                        message: (
                          <div>
                            <Trans>Insufficient Available Liquidity to swap to {tokenOptionInfo.symbol}:</Trans>
                            <br />
                            <br />
                            <StatsTooltipRow
                              label={t`Max ${collateralInfo.symbol} in`}
                              value={[
                                `${formatAmount(maxIn, collateralInfo.decimals, 0, true)} ${collateralInfo.symbol}`,
                                `($${formatAmount(maxInUsd, USD_DECIMALS, 0, true)})`,
                              ]}
                            />
                            <br />
                            <StatsTooltipRow
                              label={t`Max ${tokenOptionInfo.symbol} out`}
                              value={[
                                `${formatAmount(maxOut, tokenOptionInfo.decimals, 2, true)} ${tokenOptionInfo.symbol}`,
                                `($${formatAmount(maxOutUsd, USD_DECIMALS, 2, true)})`,
                              ]}
                            />
                          </div>
                        ),
                      };
                    }
                  }}
                  infoTokens={infoTokens}
                  showTokenImgInDropdown={true}
                  selectedTokenLabel={
                    <span className="PositionSelector-selected-receive-token">
                      {formatAmount(convertedReceiveAmount, receiveToken.decimals, 4, true)}&nbsp;
                      {receiveToken.symbol} (${formatAmount(receiveAmount, USD_DECIMALS, 2, true)})
                    </span>
                  }
                />
              </div>
            )} */}
          </div>
        </div>
        <div className="Exchange-swap-button-container">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled} authRequired>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}
