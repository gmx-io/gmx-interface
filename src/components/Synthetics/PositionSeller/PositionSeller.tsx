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
  adaptToInfoTokens,
  formatTokenAmountWithUsd,
  formatUsdAmount,
  getTokenAmountFromUsd,
  getTokenData,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useEffect, useState } from "react";
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
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import TokenSelector from "components/TokenSelector/TokenSelector";

import "./PositionSeller.scss";

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
  const { position } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
  const { tokensData } = useAvailableTokensData(chainId);
  const infoTokens = adaptToInfoTokens(tokensData);

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const isClosing = position.sizeInUsd?.sub(closeSizeUsd).lt(DUST_USD);

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  const receiveTokenOptions = Object.values(tokensData);
  const receiveToken = getTokenData(tokensData, receiveTokenAddress);

  const fees = BigNumber.from(0);

  const sizeDelta = isClosing ? position.sizeInUsd : closeSizeUsd;

  const collateralDeltaUsd =
    keepLeverage && position.collateralUsd && sizeDelta && position.currentValueUsd
      ? sizeDelta.mul(position.collateralUsd).div(position.currentValueUsd)
      : BigNumber.from(0);

  const receiveUsd = collateralDeltaUsd;
  const receiveTokenAmount = getTokenAmountFromUsd(tokensData, receiveTokenAddress, receiveUsd, false);

  const nextSizeUsd = isClosing ? BigNumber.from(0) : position.sizeInUsd?.sub(sizeDelta);

  const nextCollateralUsd = getNextCollateralUsd({
    isClosing,
    collateralUsd: position.collateralUsd,
    collateralDeltaUsd,
    fees,
    pnl: position.pnl,
  });

  const nextLiqPrice = nextSizeUsd.gt(0)
    ? getLiquidationPrice({
        sizeUsd: nextSizeUsd,
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

  useEffect(() => {
    if (!receiveTokenAddress && position.collateralToken) {
      setReceiveTokenAddress(position.collateralToken?.address);
    }
  }, [position.collateralToken, receiveTokenAddress]);

  const executionFee = getExecutionFee(tokensData);

  function getError() {
    if (!closeSizeUsd.gt(0)) {
      return t`Enter a size`;
    }

    if (closeSizeUsd.gt(position.sizeInUsd)) {
      return t`Close size is greater than position size`;
    }
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getError();

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: t`Close`,
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
      !position.currentValueUsd
    )
      return;

    const collateralAmount = collateralDeltaUsd?.gt(0)
      ? getTokenAmountFromUsd(tokensData, position.collateralToken!.address, collateralDeltaUsd)
      : BigNumber.from(0);

    const adjustedSizeDeltaUsd = position.sizeInUsd.mul(sizeDelta).div(position.currentValueUsd);

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
          topRightValue={formatUsdAmount(position.currentValueUsd)}
          inputValue={closeSizeInputValue}
          onInputValueChange={(e) => setCloseSizeInputValue(e.target.value)}
          showMaxButton={position.currentValueUsd?.gt(0) && !sizeDelta?.eq(position.currentValueUsd)}
          onClickMax={() => setCloseSizeInputValue(formatAmount(position.currentValueUsd, USD_DECIMALS, 2))}
        >
          USD
        </BuyInputSection>

        <div className="PositionEditor-info-box PositionSeller-info-box">
          {/* {minExecutionFeeErrorMessage && <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>} */}

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
                from={formatUsdAmount(position.currentValueUsd)}
                to={
                  position.currentValueUsd && nextSizeUsd && !nextSizeUsd.eq(position.currentValueUsd)
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

          <div className="App-card-divider" />

          <InfoRow
            label={t`Receive`}
            className="Exchange-info-row PositionSeller-receive-row "
            value={
              receiveTokenAddress && (
                <TokenSelector
                  label={t`Receive`}
                  className="GlpSwap-from-token"
                  chainId={chainId}
                  infoTokens={infoTokens}
                  tokenAddress={receiveTokenAddress}
                  onSelectToken={(token) => setReceiveTokenAddress(token.address)}
                  tokens={receiveTokenOptions}
                  showTokenImgInDropdown={true}
                  selectedTokenLabel={
                    <span className="PositionSelector-selected-receive-token">
                      {formatTokenAmountWithUsd(
                        receiveTokenAmount,
                        receiveUsd,
                        receiveToken?.symbol,
                        receiveToken?.decimals
                      )}
                    </span>
                  }
                />
              )
            }
          />
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
