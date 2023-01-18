import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { InfoRow } from "components/InfoRow/InfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getContract } from "config/contracts";
import { useUserReferralCode } from "domain/referrals";
import { SwapRoute } from "domain/synthetics/exchange";
import {
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
} from "domain/synthetics/orders";
import { TokenData, formatUsd, useAvailableTokensData } from "domain/synthetics/tokens";
import { useTokenAllowanceData } from "domain/synthetics/tokens/useTokenAllowanceData";
import {
  convertToUsd,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenData,
  needTokenApprove,
} from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT, USD_DECIMALS } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { TradeFees } from "../TradeFees/TradeFees";
import { Fees, TradeMode, TradeType, getSubmitError, tradeTypeLabels } from "../utils";

import Checkbox from "components/Checkbox/Checkbox";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { useContractEvents } from "domain/synthetics/contractEvents";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { AggregatedPositionData, formatLeverage, formatPnl } from "domain/synthetics/positions";
import "./ConfirmationBox.scss";

type Props = {
  operationType: TradeType;
  mode: TradeMode;
  fees: Fees;
  selectedMarketAddress?: string;
  closeSizeUsd?: BigNumber;
  fromTokenAddress?: string;
  fromTokenAmount?: BigNumber;
  toTokenAddress?: string;
  toTokenAmount?: BigNumber;
  fromTokenPrice?: BigNumber;
  toTokenPrice?: BigNumber;
  collateralTokenAddress?: string;
  sizeDeltaUsd?: BigNumber;
  collateralDeltaUsd?: BigNumber;
  collateralDeltaAmount?: BigNumber;
  entryPrice?: BigNumber;
  markPrice?: BigNumber;
  nextLiqPrice?: BigNumber;
  nextSizeUsd?: BigNumber;
  nextCollateralUsd?: BigNumber;
  nextLeverage?: BigNumber;
  acceptablePrice?: BigNumber;
  triggerPricePrefix?: string;
  triggerPrice?: BigNumber;
  receiveTokenAmount?: BigNumber;
  receiveUsd?: BigNumber;
  receiveToken?: TokenData;
  keepLeverage?: boolean;
  swapTriggerRatio?: BigNumber;
  existingPosition?: AggregatedPositionData;
  swapRoute?: SwapRoute;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
};

function getTokenText(token?: Token, tokenAmount?: BigNumber, price?: BigNumber) {
  if (!token || !price || !tokenAmount) return undefined;

  const usdAmount = convertToUsd(tokenAmount, token.decimals, price);

  return formatTokenAmountWithUsd(tokenAmount, usdAmount, token.symbol, token.decimals);
}

export function ConfirmationBox(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { setPendingPositionUpdate } = useContractEvents();

  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const referralCodeData = useUserReferralCode(library, chainId, account);

  const { tokenAllowanceData } = useTokenAllowanceData(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: p.fromTokenAddress ? [p.fromTokenAddress] : [],
  });

  const fromToken = getTokenData(tokensData, p.fromTokenAddress);
  const toToken = getTokenData(tokensData, p.toTokenAddress);

  const market = getMarket(marketsData, p.selectedMarketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);

  const fromTokenText = getTokenText(fromToken, p.fromTokenAmount, fromToken?.prices?.minPrice);
  const toTokenText = getTokenText(toToken, p.toTokenAmount, toToken?.prices?.maxPrice);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const needFromTokenApproval = needTokenApprove(tokenAllowanceData, p.fromTokenAddress, p.fromTokenAmount);

  const isSwap = p.operationType === TradeType.Swap;
  const isPosition = [TradeType.Long, TradeType.Short].includes(p.operationType);
  const isLimit = p.mode === TradeMode.Limit;
  const isLong = p.operationType === TradeType.Long;
  const isStop = p.mode === TradeMode.Trigger;

  function getReceiveText() {
    if (p.operationType === TradeType.Swap) {
      return t`Receive`;
    }

    return p.operationType === TradeType.Long ? t`Long` : t`Short`;
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      markPrice: p.toTokenPrice,
      operationType: p.operationType,
      mode: p.mode,
      tokensData,
      fromTokenAddress: p.fromTokenAddress,
      fromTokenAmount: p.fromTokenAmount,
      toTokenAddress: p.toTokenAddress,
      swapPath: p.swapRoute?.swapPath,
      triggerPrice: p.triggerPrice,
      swapTriggerRatio: p.swapTriggerRatio,
      closeSizeUsd: p.closeSizeUsd,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (!isAllowanceLoaded || !fromToken || !toToken) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (needFromTokenApproval) {
      return {
        text: t`Pending ${fromToken?.symbol} approval`,
        disabled: true,
      };
    }

    let text = "";

    if (isSwap) {
      text = t`Swap`;
    } else if (isLimit) {
      text = t`Create Limit Order`;
    } else if (isStop) {
      text = t`Create Trigger Order`;
    } else {
      text = isLong ? t`Long` : t`Short`;
    }

    return {
      text,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!account || !p.fees.executionFee?.feeTokenAmount) return;

    if ([TradeType.Long, TradeType.Short].includes(p.operationType)) {
      if ([TradeMode.Market, TradeMode.Limit].includes(p.mode)) {
        if (!p.fromTokenAddress || !p.swapRoute || !p.fromTokenAmount || !p.toTokenAddress) return;

        const { market, swapPath } = p.swapRoute;

        if (!market || !p.sizeDeltaUsd || !toToken?.prices) return;

        createIncreaseOrderTxn(chainId, library, {
          account,
          market,
          initialCollateralAddress: p.fromTokenAddress,
          initialCollateralAmount: p.fromTokenAmount,
          targetCollateralAddress: p.collateralTokenAddress,
          swapPath: swapPath,
          indexTokenAddress: p.toTokenAddress,
          sizeDeltaUsd: p.sizeDeltaUsd,
          triggerPrice: p.triggerPrice,
          priceImpactDelta: p.fees.positionPriceImpact?.impact || BigNumber.from(0),
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          executionFee: p.fees.executionFee.feeTokenAmount,
          isLong: p.operationType === TradeType.Long,
          orderType: p.mode === TradeMode.Limit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
          referralCode: referralCodeData?.userReferralCodeString,
          tokensData,
          setPendingPositionUpdate,
        }).then(p.onSubmitted);
      }

      if (p.mode === TradeMode.Trigger) {
        if (!p.selectedMarketAddress || !indexToken || !p.collateralTokenAddress || !p.triggerPrice || !p.markPrice)
          return;

        let orderType: OrderType;

        if (p.operationType === TradeType.Long) {
          orderType = p.triggerPrice.gt(p.markPrice) ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
        } else {
          orderType = p.triggerPrice.lt(p.markPrice) ? OrderType.LimitDecrease : OrderType.StopLossDecrease;
        }

        createDecreaseOrderTxn(chainId, library, {
          account,
          market: p.selectedMarketAddress,
          indexTokenAddress: indexToken.address,
          swapPath: [],
          initialCollateralDeltaAmount: p.collateralDeltaAmount || BigNumber.from(0),
          initialCollateralAddress: p.collateralTokenAddress,
          targetCollateralAddress: p.collateralTokenAddress,
          receiveTokenAddress: p.collateralTokenAddress,
          triggerPrice: p.triggerPrice,
          priceImpactDelta: p.fees.positionPriceImpact?.impact || BigNumber.from(0),
          allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
          sizeDeltaUsd: p.closeSizeUsd,
          orderType: orderType,
          isLong: p.operationType === TradeType.Long,
          executionFee: p.fees.executionFee.feeTokenAmount,
          tokensData,
          setPendingPositionUpdate,
        });
      }
    }

    if (p.operationType === TradeType.Swap) {
      if (!p.toTokenAmount || !p.swapRoute || !p.fromTokenAddress || !p.fromTokenAmount || !p.toTokenAddress) return;

      const orderType = p.mode === TradeMode.Limit ? OrderType.LimitSwap : OrderType.MarketSwap;

      const { swapPath } = p.swapRoute;

      createSwapOrderTxn(chainId, library, {
        account,
        fromTokenAddress: p.fromTokenAddress,
        fromTokenAmount: p.fromTokenAmount,
        swapPath: swapPath,
        toTokenAddress: p.toTokenAddress,
        executionFee: p.fees.executionFee.feeTokenAmount,
        orderType,
        minOutputAmount: p.toTokenAmount,
        referralCode: referralCodeData?.userReferralCodeString,
        tokensData,
      }).then(p.onSubmitted);
    }
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="Confirmation-box">
      <Modal
        isVisible={true}
        setIsVisible={p.onClose}
        label={isStop ? t`Confirm Trigger Order` : <Trans>Confirm {tradeTypeLabels[p.operationType]}</Trans>}
        allowContentTouchMove
      >
        {!isStop && (
          <div className={cx("Confirmation-box-main ConfirmationBox-main")}>
            <div>
              <Trans>Pay</Trans>&nbsp;{fromTokenText}
            </div>
            <div className="Confirmation-box-main-icon"></div>
            <div>
              {getReceiveText()}&nbsp;{toTokenText}
            </div>
          </div>
        )}

        {isStop && (
          <div className={cx("Confirmation-box-main ConfirmationBox-main")}>
            <Trans>Decrease</Trans>&nbsp;{indexToken?.symbol} {isLong ? t`Long` : t`Short`}
          </div>
        )}

        {isSwap && (
          <>
            <InfoRow
              label={t`Min Receive`}
              value={formatTokenAmount(p.toTokenAmount, toToken?.decimals, toToken?.symbol)}
            />

            {p.swapTriggerRatio?.gt(0) && (
              <InfoRow label={t`Price`} value={formatAmount(p.swapTriggerRatio, USD_DECIMALS, 4)} />
            )}

            <InfoRow label={t`${fromToken?.symbol} Price`} value={formatUsd(p.fromTokenPrice)!} />
            <InfoRow label={t`${toToken?.symbol} Price`} value={formatUsd(p.toTokenPrice)!} />
          </>
        )}

        {isPosition && (
          <>
            {isStop && p.existingPosition?.leverage && (
              <div className="Exchange-leverage-slider-settings">
                <Checkbox isChecked={p.keepLeverage} setIsChecked={p.setKeepLeverage}>
                  <span className="muted font-sm">
                    <Trans>Keep leverage at {formatLeverage(p.existingPosition.leverage)} </Trans>
                  </span>
                </Checkbox>
              </div>
            )}

            {isPosition && isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={p.existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
                value={
                  p.existingPosition?.sizeInUsd ? (
                    <ValueTransition from={formatUsd(p.existingPosition.sizeInUsd)!} to={formatUsd(p.nextSizeUsd)} />
                  ) : p.closeSizeUsd ? (
                    formatUsd(p.closeSizeUsd)
                  ) : (
                    "..."
                  )
                }
              />
            )}

            <InfoRow label={t`Collateral In`} value={getTokenData(tokensData, p.collateralTokenAddress)?.symbol} />

            {p.existingPosition && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Collateral (${p.existingPosition?.collateralToken?.symbol})`}
                value={
                  <ValueTransition
                    from={formatUsd(p.existingPosition.collateralUsd)!}
                    to={formatUsd(p.nextCollateralUsd)}
                  />
                }
              />
            )}

            {isPosition && !isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Leverage`}
                value={
                  p.existingPosition?.leverage ? (
                    <ValueTransition
                      from={formatLeverage(p.existingPosition?.leverage)}
                      to={p.nextLeverage ? formatLeverage(p.nextLeverage) : "..."}
                    />
                  ) : (
                    formatLeverage(p.nextLeverage)
                  )
                }
              />
            )}

            {isPosition && isStop && !p.keepLeverage && p.existingPosition?.leverage && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Leverage`}
                value={
                  p.nextSizeUsd?.gt(0) ? (
                    <ValueTransition
                      from={formatLeverage(p.existingPosition?.leverage)}
                      to={p.nextLeverage ? formatLeverage(p.nextLeverage) : "..."}
                    />
                  ) : (
                    "..."
                  )
                }
              />
            )}

            <div className="App-card-divider" />

            {/* {showSpread && (
              <ExchangeInfoRow label={t`Spread`} isWarning={spread.isHigh} isTop={true}>
                {formatAmount(spread.value.mul(100), USD_DECIMALS, 2, true)}%
              </ExchangeInfoRow>
            )} */}

            {p.entryPrice && !isLimit && !isStop && <InfoRow label={t`Entry price`} value={formatUsd(p.entryPrice)} />}

            {isPosition && isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Mark Price`}
                value={p.markPrice ? formatUsd(p.markPrice) : "..."}
              />
            )}

            {isPosition && !isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Entry Price`}
                value={p.entryPrice ? formatUsd(p.entryPrice) : "..."}
              />
            )}

            {isPosition && isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Trigger Price`}
                value={p.triggerPrice ? `${p.triggerPricePrefix}${formatUsd(p.triggerPrice)}` : "..."}
              />
            )}

            {isPosition && !isStop && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Liq. Price`}
                value={
                  p.existingPosition?.liqPrice ? (
                    <ValueTransition
                      from={formatUsd(p.existingPosition.liqPrice)!}
                      to={p.nextLiqPrice ? formatUsd(p.nextLiqPrice) : undefined}
                    />
                  ) : p.nextLiqPrice ? (
                    formatUsd(p.nextLiqPrice)
                  ) : (
                    "..."
                  )
                }
              />
            )}

            {isStop && p.existingPosition && (
              <InfoRow
                label={t`PnL`}
                value={
                  <ValueTransition
                    from={formatPnl(p.existingPosition.pnl, p.existingPosition.pnlPercentage)}
                    to={formatPnl(BigNumber.from(0), BigNumber.from(0))}
                  />
                }
              />
            )}

            {isPosition && isStop && p.existingPosition && (
              <InfoRow
                className="SwapBox-info-row"
                label={t`Liq. Price`}
                value={
                  p.nextSizeUsd?.gt(0) ? (
                    <ValueTransition
                      from={formatUsd(p.existingPosition.liqPrice)!}
                      to={p.nextLiqPrice ? formatUsd(p.nextLiqPrice) : undefined}
                    />
                  ) : (
                    "..."
                  )
                }
              />
            )}
          </>
        )}

        <div className="App-card-divider" />

        {/* {decreaseOrdersThatWillBeExecuted.length > 0 && (
          <div className="PositionEditor-allow-higher-slippage">
            <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the trigger orders</Trans>
              </span>
            </Checkbox>
          </div>
        )} */}

        <TradeFees fees={p.fees} />

        <div className="App-card-divider" />

        {isStop && p.receiveToken && p.receiveTokenAmount && p.receiveUsd && (
          <InfoRow
            label={t`Receive`}
            className="Exchange-info-row "
            value={
              <span>
                {formatTokenAmountWithUsd(
                  p.receiveTokenAmount,
                  p.receiveUsd,
                  p.receiveToken?.symbol,
                  p.receiveToken?.decimals
                )}
              </span>
            }
          />
        )}

        {needFromTokenApproval && fromToken && (
          <>
            <div className="App-card-divider" />

            <div className="ConfirmationBox-approve-tokens">
              <div className="ConfirmationBox-approve-token">
                <ApproveTokenButton
                  tokenAddress={fromToken.address}
                  tokenSymbol={fromToken.symbol}
                  spenderAddress={routerAddress}
                />
              </div>
            </div>

            <div className="App-card-divider" />
          </>
        )}
        <div className="Confirmation-box-row">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled}>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}
