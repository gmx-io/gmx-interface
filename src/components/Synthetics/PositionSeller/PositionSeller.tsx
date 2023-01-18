import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { InfoRow } from "components/InfoRow/InfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { KEEP_LEVERAGE_FOR_DECREASE_KEY } from "config/localStorage";
import { getConvertedTokenAddress } from "config/tokens";
import { getExecutionFee } from "domain/synthetics/fees";
import {
  OrderType,
  createDecreaseOrderTxn,
  getCollateralDeltaUsdForDecreaseOrder,
  getCollateralOutForDecreaseOrder,
  getNextCollateralUsdForDecreaseOrder,
} from "domain/synthetics/orders";
import {
  AggregatedPositionData,
  formatLeverage,
  formatPnl,
  getLeverage,
  getLiquidationPrice,
} from "domain/synthetics/positions";
import {
  getTokenAmountFromUsd,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { DEFAULT_SLIPPAGE_AMOUNT, DUST_USD, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount, formatTokenAmountWithUsd, formatUsd, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";

import { useContractEvents } from "domain/synthetics/contractEvents";
import "./PositionSeller.scss";

type Props = {
  position: AggregatedPositionData;
  onClose: () => void;
};

export function PositionSeller(p: Props) {
  const { position } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const { setPendingPositionUpdate } = useContractEvents();
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
  const { tokensData } = useAvailableTokensData(chainId);
  // const infoTokens = adaptToInfoTokens(tokensData);

  const fees = BigNumber.from(0);

  const [closeUsdInputValue, setCloseUsdInputValue] = useState("");
  const maxCloseSize = position.sizeInUsd;
  const closeUsd = parseValue(closeUsdInputValue || "0", USD_DECIMALS)!;

  const isClosing = closeUsd.gt(0) && maxCloseSize?.sub(closeUsd).lt(DUST_USD);

  const sizeDeltaUsd = isClosing ? maxCloseSize : closeUsd;
  const nextSizeUsd = position.sizeInUsd.sub(sizeDeltaUsd);

  const collateralDeltaUsd = getCollateralDeltaUsdForDecreaseOrder({
    isClosing,
    keepLeverage,
    positionCollateralUsd: position.collateralUsd,
    positionSizeInUsd: position.sizeInUsd,
    sizeDeltaUsd,
  });

  const collateralDeltaAmount = getTokenAmountFromUsd(tokensData, position.collateralTokenAddress, collateralDeltaUsd);

  const nextCollateralUsd = getNextCollateralUsdForDecreaseOrder({
    isClosing,
    collateralUsd: position.collateralUsd,
    collateralDeltaUsd,
    sizeDeltaUsd,
    pnl: position.pnl,
  });

  const [receiveTokenAddress, setReceiveTokenAddress] = useState<string>();
  // const receiveTokenOptions = Object.values(tokensData);
  const receiveToken = getTokenData(tokensData, receiveTokenAddress);

  const collateralOutAmount = getCollateralOutForDecreaseOrder({
    position,
    indexToken: position.indexToken,
    collateralToken: position.collateralToken,
    sizeDeltaUsd,
    collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
    pnlToken: position.pnlToken,
    feesUsd: fees,
    priceImpactUsd: BigNumber.from(0),
  });

  const receiveUsd = getUsdFromTokenAmount(tokensData, position.collateralTokenAddress, collateralOutAmount);
  const receiveTokenAmount = getTokenAmountFromUsd(tokensData, receiveTokenAddress, receiveUsd);

  const nextLiqPrice =
    nextSizeUsd?.gt(0) && !keepLeverage
      ? getLiquidationPrice({
          sizeUsd: nextSizeUsd,
          collateralUsd: nextCollateralUsd,
          feesUsd: fees,
          averagePrice: position.averagePrice,
          isLong: position.isLong,
        })
      : undefined;

  const nextLeverage =
    nextSizeUsd?.gt(0) && !keepLeverage
      ? getLeverage({
          sizeUsd: nextSizeUsd,
          collateralUsd: nextCollateralUsd,
        })
      : undefined;

  useEffect(() => {
    if (!receiveTokenAddress && position.collateralToken?.address) {
      const convertedAddress = getConvertedTokenAddress(chainId, position.collateralToken.address, "native");
      setReceiveTokenAddress(convertedAddress);
    }
  }, [chainId, position.collateralToken, receiveTokenAddress]);

  const executionFee = getExecutionFee(tokensData);

  function getError() {
    if (!closeUsd.gt(0)) {
      return t`Enter an amount`;
    }

    if (closeUsd.gt(position.sizeInUsd)) {
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
      !executionFee?.feeTokenAmount ||
      !position.currentValueUsd ||
      !receiveToken?.address
    )
      return;

    createDecreaseOrderTxn(chainId, library, {
      account,
      market: position.marketAddress,
      indexTokenAddress: position.indexToken.address,
      swapPath: [],
      initialCollateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
      initialCollateralAddress: position.collateralTokenAddress,
      targetCollateralAddress: receiveToken.address,
      receiveTokenAddress: position.collateralTokenAddress,
      priceImpactDelta: BigNumber.from(0),
      allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      sizeDeltaUsd,
      orderType: OrderType.MarketDecrease,
      isLong: position.isLong,
      executionFee: executionFee.feeTokenAmount,
      tokensData,
      setPendingPositionUpdate,
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
          topRightValue={formatUsd(maxCloseSize)}
          inputValue={closeUsdInputValue}
          onInputValueChange={(e) => setCloseUsdInputValue(e.target.value)}
          showMaxButton={maxCloseSize.gt(0) && !closeUsd?.eq(maxCloseSize)}
          onClickMax={() => setCloseUsdInputValue(formatAmount(maxCloseSize, USD_DECIMALS, 2))}
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
          <InfoRow label={t`Mark Price`} value={formatUsd(position.markPrice)} />
          <InfoRow label={t`Entry Price`} value={formatUsd(position.entryPrice)} />
          <InfoRow
            label={t`Liq Price`}
            value={
              nextSizeUsd?.gt(0) && position.liqPrice ? (
                <ValueTransition
                  from={formatUsd(position.liqPrice)!}
                  to={nextLiqPrice && !nextLiqPrice.eq(position.liqPrice) ? formatUsd(nextLiqPrice) : undefined}
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
                from={formatUsd(position.sizeInUsd)!}
                to={nextSizeUsd && !nextSizeUsd.eq(position.sizeInUsd) ? formatUsd(nextSizeUsd) : undefined}
              />
            }
          />
          <InfoRow
            label={t`Collateral (${position.collateralToken?.symbol})`}
            value={
              <ValueTransition
                from={formatUsd(position.collateralUsd)!}
                to={
                  nextCollateralUsd && position.collateralUsd && !nextCollateralUsd.eq(position.collateralUsd)
                    ? formatUsd(nextCollateralUsd)
                    : undefined
                }
              />
            }
          />
          {!keepLeverage && (
            <InfoRow
              label={t`Leverage`}
              value={
                nextSizeUsd?.gt(0) && position.leverage ? (
                  <ValueTransition
                    from={formatLeverage(position.leverage)}
                    to={nextLeverage && !nextLeverage.eq(position.leverage) ? formatLeverage(nextLeverage) : undefined}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}
          <InfoRow label={t`PnL`} value={position.pnl ? formatPnl(position.pnl, position.pnlPercentage) : "..."} />
          <InfoRow
            label={t`Fees and price impact`}
            value={
              <Tooltip
                handle={"$0.00"}
                className="PositionSeller-fees-tooltip"
                position="right-bottom"
                renderContent={() => (
                  <div>
                    TODO
                    {/* {fundingFee && (
                    <StatsTooltipRow label={t`Borrow Fee`} value={formatAmount(fundingFee, USD_DECIMALS, 2, true)} />
                  )}

                  {positionFee && (
                    <StatsTooltipRow
                      label={t`Closing Fee`}
                      value={formatAmount(positionFee, USD_DECIMALS, 2, true)}
                    />
                  )}

                  {swapFee && (
                    <StatsTooltipRow
                      label={t`Swap Fee`}
                      showDollar={false}
                      value={`${formatAmount(swapFeeToken, collateralToken.decimals, 5)} ${collateralToken.symbol}
                         ($${formatAmount(swapFee, USD_DECIMALS, 2, true)})`}
                    />
                  )}

                  <StatsTooltipRow
                    label={t`Execution Fee`}
                    showDollar={false}
                    value={`${formatAmount(executionFee, 18, 5, true)} ${nativeTokenSymbol} ($${formatAmount(
                      executionFeeUsd,
                      USD_DECIMALS,
                      2
                    )})`}
                  /> */}
                  </div>
                )}
              />
            }
          />

          <div className="App-card-divider" />
          <InfoRow
            label={t`Receive`}
            className="Exchange-info-row PositionSeller-receive-row "
            value={
              <span>
                {formatTokenAmountWithUsd(receiveTokenAmount, receiveUsd, receiveToken?.symbol, receiveToken?.decimals)}
              </span>
              // TODO: add receive token selector
              // receiveTokenAddress && (
              //   <TokenSelector
              //     label={t`Receive`}
              //     className="GlpSwap-from-token"
              //     chainId={chainId}
              //     infoTokens={infoTokens}
              //     tokenAddress={receiveTokenAddress}
              //     onSelectToken={(token) => setReceiveTokenAddress(token.address)}
              //     tokens={receiveTokenOptions}
              //     showTokenImgInDropdown={true}
              //     selectedTokenLabel={
              //       <span className="PositionSelector-selected-receive-token">
              //         {formatTokenAmountWithUsd(
              //           receiveTokenAmount,
              //           receiveUsd,
              //           receiveToken?.symbol,
              //           receiveToken?.decimals
              //         )}
              //       </span>
              //     }
              //   />
              // )
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
