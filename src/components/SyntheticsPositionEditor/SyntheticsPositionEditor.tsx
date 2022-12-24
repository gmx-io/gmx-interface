import { getPosition, usePositionsData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import Modal from "components/Modal/Modal";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import {
  formatUsdAmount,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useState } from "react";
import { parseValue } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { SubmitButton } from "components/SubmitButton/SubmitButton";

import { Trans, t } from "@lingui/macro";
import { createOrderTxn } from "domain/synthetics/orders";
import { OrderType } from "config/synthetics";
import { useWeb3React } from "@web3-react/core";
import { getExecutionFee } from "domain/synthetics/fees";

import "./SyntheticsPositionSeller.scss";

type Props = {
  positionKey: string;
  onClose: () => void;
};

export function SyntheticsPositionSeller(p: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();

  const positionsData = usePositionsData(chainId);
  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const [closeSizeInput, setCloseSizeInput] = useState("");

  const closeSize = parseValue(closeSizeInput || "0", USD_DECIMALS);

  const position = getPosition(positionsData, p.positionKey);

  const market = getMarket(marketsData, position?.marketAddress);

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const minPrice = indexToken?.prices?.maxPrice;

  const currentSize = getUsdFromTokenAmount(tokensData, indexToken?.address, position?.sizeInTokens);

  const maxCloseSize = currentSize;

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
    if (!minPrice || !account || !position || !closeSize?.gt(0) || !executionFee?.feeTokenAmount) return;

    function getAcceptablePrice() {
      if (position!.isLong) {
        const price = indexToken?.prices?.maxPrice;

        return price?.div(2);
      }

      const price = indexToken?.prices?.maxPrice;

      return price?.add(price.div(2));
    }

    const acceptablePrice = getAcceptablePrice();

    if (!acceptablePrice) return;

    createOrderTxn(chainId, library, {
      account,
      marketAddress: position.marketAddress,
      indexTokenAddress: indexToken.address,
      swapPath: [],
      initialCollateralAddress: position.collateralTokenAddress,
      acceptablePrice,
      sizeDeltaUsd: closeSize,
      orderType: OrderType.MarketDecrease,
      isLong: position.isLong,
      executionFee: executionFee.feeTokenAmount,
    });
  }

  if (!position) {
    return null;
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={
          <Trans>
            Close {position?.isLong ? t`Long` : t`Short`} {indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        <BuyInputSection
          topLeftLabel={t`Close`}
          topRightLabel={t`Max`}
          topRightValue={formatUsdAmount(maxCloseSize)}
          inputValue={closeSizeInput}
          onInputValueChange={(e) => setCloseSizeInput(e.target.value)}
          showMaxButton={maxCloseSize?.gt(0) && !closeSize?.eq(maxCloseSize)}
          onClickMax={() => setCloseSizeInput(formatUsdAmount(maxCloseSize))}
        >
          USD
        </BuyInputSection>

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

        <div className="PositionEditor-info-box">
          {/* {minExecutionFeeErrorMessage && <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>} */}
          {/* {hasPendingProfit && orderOption !== STOP && (
            <div className="PositionEditor-accept-profit-warning">
              <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                <span className="muted">Forfeit profit</span>
              </Checkbox>
            </div>
          )} */}

          {/* <div className="PositionEditor-keep-leverage-settings">
            <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
              <span className="muted font-sm">
                <Trans>Keep leverage at {formatAmount(position.leverage, 4, 2)}x</Trans>
              </span>
            </Checkbox>
          </div> */}

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
          {/* 
          <div className="Exchange-info-row top-line">
            <div className="Exchange-info-label">
              <Trans>Mark Price</Trans>
            </div>
            <div className="align-right">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
          </div> */}

          {/* <InfoRow label={t`Entry Price`} value={formatAmount(position.averagePrice, USD_DECIMALS, 2, true)} /> */}

          {/* <InfoRow
            label={t`Liq Price`}
            value={
              <>
                {isClosing && orderOption !== STOP && "-"}
                {(!isClosing || orderOption === STOP) && (
                  <div>
                    {(!nextLiquidationPrice || nextLiquidationPrice.eq(liquidationPrice)) && (
                      <div>{`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
                    )}
                    {nextLiquidationPrice && !nextLiquidationPrice.eq(liquidationPrice) && (
                      <div>
                        <div className="inline-block muted">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                      </div>
                    )}
                  </div>
                )}
              </>
            }
          /> */}
          {/* 
          <InfoRow
            label={t`Size`}
            value={
              <>
                {position && position.size && fromAmount && (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.size, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(position.size.sub(fromAmount), USD_DECIMALS, 2, true)}
                  </div>
                )}
                {position && position.size && !fromAmount && (
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                )}
              </>
            }
          /> */}

          {/* <InfoRow
            label={t`Collateral ({collateralToken.symbol})`}
            value={
              <>
                {nextCollateral && !nextCollateral.eq(position.collateral) ? (
                  <div>
                    <div className="inline-block muted">
                      ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                  </div>
                ) : (
                  `$${formatAmount(position.collateral, USD_DECIMALS, 4, true)}`
                )}
              </>
            }
          /> */}

          {/* {keepLeverage && (
            <InfoRow
              label={t`Leverage`}
              value={
                <>
                  {isClosing && "-"}
                  {!isClosing && (
                    <div>
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted">
                            {formatAmount(position.leverage, 4, 2)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2)}x
                        </div>
                      )}
                    </div>
                  )}
                </>
              }
            />
          )} */}

          {/* <InfoRow label={t`PnL`} value={{ deltaStr }({ deltaPercentageStr })} /> */}

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
