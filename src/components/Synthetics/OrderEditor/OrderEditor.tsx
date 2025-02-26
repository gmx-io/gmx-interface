import { Trans, t } from "@lingui/macro";
import { ReactNode, useEffect, useMemo, useState } from "react";

import { DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS, USD_DECIMALS } from "config/factors";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  OrderInfo,
  OrderType,
  PositionOrderInfo,
  SwapOrderInfo,
  isLimitOrderType,
  isLimitSwapOrderType,
  isSwapOrderType,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { updateOrderTxn } from "domain/synthetics/orders/updateOrderTxn";
import {
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getTriggerNameByOrderType,
  substractMaxLeverageSlippage,
} from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatBalanceAmount,
  formatDeltaUsd,
  formatTokenAmountWithUsd,
  formatUsdPrice,
} from "lib/numbers";

import Button from "components/Button/Button";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import {
  usePositionsConstants,
  useTokensData,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { getIncreasePositionAmounts, getNextPositionValuesForIncreaseTrade } from "domain/synthetics/trade";
import useWallet from "lib/wallets/useWallet";

import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { AcceptablePriceImpactInputRow } from "components/Synthetics/AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";

import ExternalLink from "components/ExternalLink/ExternalLink";
import { useMarketInfo } from "context/SyntheticsStateContext/hooks/marketHooks";
import {
  useOrderEditorSizeInputValueState,
  useOrderEditorTriggerPriceInputValueState,
  useOrderEditorTriggerRatioInputValueState,
} from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import {
  selectOrderEditorAcceptablePrice,
  selectOrderEditorAcceptablePriceImpactBps,
  selectOrderEditorDecreaseAmounts,
  selectOrderEditorExecutionFee,
  selectOrderEditorExistingPosition,
  selectOrderEditorFindSwapPath,
  selectOrderEditorFromToken,
  selectOrderEditorIncreaseAmounts,
  selectOrderEditorInitialAcceptablePriceImpactBps,
  selectOrderEditorIsRatioInverted,
  selectOrderEditorMarkRatio,
  selectOrderEditorMaxAllowedLeverage,
  selectOrderEditorMinOutputAmount,
  selectOrderEditorNextPositionValuesForIncrease,
  selectOrderEditorNextPositionValuesWithoutPnlForIncrease,
  selectOrderEditorPriceImpactFeeBps,
  selectOrderEditorSelectedAllowedSwapSlippageBps,
  selectOrderEditorSetSelectedAllowedSwapSlippageBps,
  selectOrderEditorSetAcceptablePriceImpactBps,
  selectOrderEditorSizeDeltaUsd,
  selectOrderEditorTriggerPrice,
  selectOrderEditorTriggerRatio,
  selectOrderEditorDefaultAllowedSwapSlippageBps,
  selectOrderEditorSetDefaultAllowedSwapSlippageBps,
  selectOrderEditorTotalSwapImpactBps,
} from "context/SyntheticsStateContext/selectors/orderEditorSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsMaxLeverageExceeded } from "domain/synthetics/trade/utils/validation";
import { numericBinarySearch } from "lib/binarySearch";
import { helperToast } from "lib/helperToast";
import { useKey } from "react-use";
import { bigMath } from "sdk/utils/bigmath";

import { SyntheticsInfoRow } from "../SyntheticsInfoRow";
import "./OrderEditor.scss";
import { AllowedSwapSlippageInputRow } from "../AllowedSwapSlippageInputRowImpl/AllowedSwapSlippageInputRowImpl";
import { TokensRatioAndSlippage } from "domain/tokens";

type Props = {
  order: OrderInfo;
  onClose: () => void;
  setPendingTxns: (txns: any) => void;
};

export function OrderEditor(p: Props) {
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const tokensData = useTokensData();

  const [isInited, setIsInited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizeInputValue, setSizeInputValue] = useOrderEditorSizeInputValueState();
  const [triggerPriceInputValue, setTriggerPriceInputValue] = useOrderEditorTriggerPriceInputValueState();
  const [triggerRatioInputValue, setTriggerRatioInputValue] = useOrderEditorTriggerRatioInputValueState();

  const sizeDeltaUsd = useSelector(selectOrderEditorSizeDeltaUsd);
  const triggerPrice = useSelector(selectOrderEditorTriggerPrice);
  const fromToken = useSelector(selectOrderEditorFromToken);
  const markRatio = useSelector(selectOrderEditorMarkRatio);
  const isRatioInverted = useSelector(selectOrderEditorIsRatioInverted);
  const triggerRatio = useSelector(selectOrderEditorTriggerRatio);
  const minOutputAmount = useSelector(selectOrderEditorMinOutputAmount);

  const market = useMarketInfo(p.order.marketAddress);
  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const markPrice = p.order.isLong ? indexToken?.prices?.minPrice : indexToken?.prices?.maxPrice;
  const existingPosition = useSelector(selectOrderEditorExistingPosition);

  const executionFee = useSelector(selectOrderEditorExecutionFee);

  const additionalExecutionFee = useMemo(() => {
    if (!executionFee || p.order.executionFee >= executionFee.feeTokenAmount) {
      return undefined;
    }

    const feeTokenData = getTokenData(tokensData, executionFee.feeToken.address);
    const additionalTokenAmount = executionFee.feeTokenAmount - p.order.executionFee;

    return {
      feeUsd: convertToUsd(additionalTokenAmount, executionFee.feeToken.decimals, feeTokenData?.prices.minPrice),
      feeTokenAmount: additionalTokenAmount,
      feeToken: executionFee.feeToken,
    };
  }, [executionFee, tokensData, p.order.executionFee]);

  const subaccount = useSubaccount(additionalExecutionFee?.feeTokenAmount ?? null);

  const isLimitIncreaseOrder = p.order.orderType === OrderType.LimitIncrease;

  const positionOrder = p.order as PositionOrderInfo | undefined;
  const positionIndexToken = positionOrder?.indexToken;
  const indexTokenAmount = useMemo(
    () =>
      positionIndexToken ? convertToTokenAmount(sizeDeltaUsd, positionIndexToken.decimals, triggerPrice) : undefined,
    [positionIndexToken, sizeDeltaUsd, triggerPrice]
  );
  const nextPositionValuesForIncrease = useSelector(selectOrderEditorNextPositionValuesForIncrease);
  const nextPositionValuesWithoutPnlForIncrease = useSelector(selectOrderEditorNextPositionValuesWithoutPnlForIncrease);

  const findSwapPath = useSelector(selectOrderEditorFindSwapPath);

  const userReferralInfo = useUserReferralInfo();
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);

  const acceptablePrice = useSelector(selectOrderEditorAcceptablePrice);
  const acceptablePriceImpactBps = useSelector(selectOrderEditorAcceptablePriceImpactBps);
  const initialAcceptablePriceImpactBps = useSelector(selectOrderEditorInitialAcceptablePriceImpactBps);
  const setAcceptablePriceImpactBps = useSelector(selectOrderEditorSetAcceptablePriceImpactBps);
  const increaseAmounts = useSelector(selectOrderEditorIncreaseAmounts);
  const maxAllowedLeverage = useSelector(selectOrderEditorMaxAllowedLeverage);

  const defaultAllowedSwapSlippageBps = useSelector(selectOrderEditorDefaultAllowedSwapSlippageBps);
  const setDefaultAllowedSwapSlippageBps = useSelector(selectOrderEditorSetDefaultAllowedSwapSlippageBps);
  const selectedAllowedSwapSlippageBps = useSelector(selectOrderEditorSelectedAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectOrderEditorSetSelectedAllowedSwapSlippageBps);
  const swapImpactBps = useSelector(selectOrderEditorTotalSwapImpactBps);

  const decreaseAmounts = useSelector(selectOrderEditorDecreaseAmounts);
  const { minCollateralUsd } = usePositionsConstants();

  const recommendedAcceptablePriceImpactBps =
    isLimitIncreaseOrder && increaseAmounts?.acceptablePrice
      ? bigMath.abs(increaseAmounts.acceptablePriceDeltaBps)
      : decreaseAmounts?.recommendedAcceptablePriceDeltaBps !== undefined
        ? bigMath.abs(decreaseAmounts?.recommendedAcceptablePriceDeltaBps)
        : undefined;

  const priceImpactFeeBps = useSelector(selectOrderEditorPriceImpactFeeBps);

  function getError() {
    if (isSubmitting) {
      return t`Updating Order...`;
    }

    if (isSwapOrderType(p.order.orderType)) {
      if (triggerRatio?.ratio === undefined || triggerRatio?.ratio < 0 || minOutputAmount <= 0) {
        return t`Enter a ratio`;
      }

      if (minOutputAmount === p.order.minOutputAmount) {
        return t`Enter a new ratio or allowed slippage`;
      }

      if (triggerRatio && !isRatioInverted && markRatio && markRatio.ratio < triggerRatio.ratio) {
        return t`Limit price above mark price`;
      }

      if (triggerRatio && isRatioInverted && markRatio && markRatio.ratio > triggerRatio.ratio) {
        return t`Limit price below mark price`;
      }

      return;
    }

    const positionOrder = p.order as PositionOrderInfo;

    if (markPrice === undefined) {
      return t`Loading...`;
    }

    if (sizeDeltaUsd === undefined || sizeDeltaUsd < 0) {
      return t`Enter an amount`;
    }

    if (triggerPrice === undefined || triggerPrice < 0) {
      return t`Enter a price`;
    }

    if (
      sizeDeltaUsd === positionOrder.sizeDeltaUsd &&
      triggerPrice === positionOrder.triggerPrice! &&
      acceptablePrice === positionOrder.acceptablePrice
    ) {
      return t`Enter new amount or price`;
    }

    if (isLimitOrderType(p.order.orderType)) {
      if (p.order.isLong) {
        if (triggerPrice >= markPrice) {
          return t`Limit price above mark price`;
        }
      } else {
        if (triggerPrice <= markPrice) {
          return t`Limit price below mark price`;
        }
      }
    }

    if (isTriggerDecreaseOrderType(p.order.orderType)) {
      if (markPrice === undefined) {
        return t`Loading...`;
      }

      if (
        sizeDeltaUsd === (p.order.sizeDeltaUsd ?? 0n) &&
        triggerPrice === (positionOrder.triggerPrice ?? 0n) &&
        acceptablePrice === positionOrder.acceptablePrice
      ) {
        return t`Enter a new size or price`;
      }

      if (existingPosition?.liquidationPrice) {
        if (existingPosition.isLong && triggerPrice <= existingPosition?.liquidationPrice) {
          return t`Trigger price below liq. price`;
        }

        if (!existingPosition.isLong && triggerPrice >= existingPosition?.liquidationPrice) {
          return t`Trigger price above liq. price`;
        }
      }

      if (p.order.isLong) {
        if (p.order.orderType === OrderType.LimitDecrease && triggerPrice <= markPrice) {
          return t`Trigger price below mark price`;
        }

        if (p.order.orderType === OrderType.StopLossDecrease && triggerPrice >= markPrice) {
          return t`Trigger price above mark price`;
        }
      } else {
        if (p.order.orderType === OrderType.LimitDecrease && triggerPrice >= markPrice) {
          return t`Trigger price above mark price`;
        }

        if (p.order.orderType === OrderType.StopLossDecrease && triggerPrice <= markPrice) {
          return t`Trigger price below mark price`;
        }
      }
    }

    if (isLimitIncreaseOrder) {
      if (
        nextPositionValuesForIncrease?.nextLeverage !== undefined &&
        nextPositionValuesForIncrease?.nextLeverage > maxAllowedLeverage
      ) {
        return t`Max leverage: ${(maxAllowedLeverage / BASIS_POINTS_DIVISOR).toFixed(1)}x`;
      }
    }
  }

  function getIsMaxLeverageError() {
    if (isLimitIncreaseOrder && sizeDeltaUsd !== undefined) {
      if (nextPositionValuesWithoutPnlForIncrease?.nextLeverage === undefined) {
        return false;
      }

      const positionOrder = p.order as PositionOrderInfo;
      return getIsMaxLeverageExceeded(
        nextPositionValuesWithoutPnlForIncrease?.nextLeverage,
        positionOrder.marketInfo,
        positionOrder.isLong,
        sizeDeltaUsd
      );
    }
    return false;
  }

  const { savedAcceptablePriceImpactBuffer } = useSettings();

  function detectAndSetAvailableMaxLeverage() {
    const positionOrder = p.order as PositionOrderInfo;
    const marketInfo = positionOrder.marketInfo;
    const collateralToken = positionOrder.targetCollateralToken;

    if (!positionIndexToken || !fromToken || minCollateralUsd === undefined) return;

    const { returnValue: newSizeDeltaUsd } = numericBinarySearch<bigint | undefined>(
      1,
      // "10 *" means we do 1..50 search but with 0.1x step
      (10 * maxAllowedLeverage) / BASIS_POINTS_DIVISOR,
      (lev) => {
        const leverage = BigInt((lev / 10) * BASIS_POINTS_DIVISOR);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath,
          indexToken: positionIndexToken,
          indexTokenAmount,
          initialCollateralAmount: positionOrder.initialCollateralDeltaAmount,
          initialCollateralToken: fromToken,
          isLong: positionOrder.isLong,
          marketInfo: positionOrder.marketInfo,
          position: existingPosition,
          strategy: "leverageByCollateral",
          uiFeeFactor,
          userReferralInfo,
          acceptablePriceImpactBuffer: savedAcceptablePriceImpactBuffer,
          fixedAcceptablePriceImpactBps: acceptablePriceImpactBps,
          leverage,
          triggerPrice,
        });

        const nextPositionValues = getNextPositionValuesForIncreaseTrade({
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralToken,
          existingPosition,
          indexPrice: increaseAmounts.indexPrice,
          isLong: positionOrder.isLong,
          marketInfo,
          minCollateralUsd,
          showPnlInLeverage: false,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          userReferralInfo,
        });

        if (nextPositionValues.nextLeverage !== undefined) {
          const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
            nextPositionValues.nextLeverage,
            marketInfo,
            positionOrder.isLong,
            increaseAmounts.sizeDeltaUsd
          );

          return {
            isValid: !isMaxLeverageExceeded,
            returnValue: increaseAmounts.sizeDeltaUsd,
          };
        }

        return {
          isValid: false,
          returnValue: increaseAmounts.sizeDeltaUsd,
        };
      }
    );

    if (newSizeDeltaUsd !== undefined) {
      setSizeInputValue(formatAmountFree(substractMaxLeverageSlippage(newSizeDeltaUsd), USD_DECIMALS, 2));
    } else {
      helperToast.error(t`No available leverage found`);
    }
  }

  function getSubmitButtonState(): { text: ReactNode; disabled?: boolean; tooltip?: ReactNode; onClick?: () => void } {
    const error = getError();
    const isMaxLeverageError = getIsMaxLeverageError();

    if (isMaxLeverageError) {
      return {
        text: t`Max. Leverage Exceeded`,
        tooltip: (
          <>
            <Trans>Decrease the size to match the max. allowed leverage:</Trans>{" "}
            <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
            <br />
            <br />
            <span onClick={detectAndSetAvailableMaxLeverage} className="Tradebox-handle">
              <Trans>Set Max Leverage</Trans>
            </span>
          </>
        ),
        disabled: true,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    const orderTypeName =
      p.order.orderType === OrderType.LimitIncrease ? t`Limit` : getTriggerNameByOrderType(p.order.orderType);

    return {
      text: `Update ${orderTypeName} Order`,
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!signer) return;
    const positionOrder = p.order as PositionOrderInfo;

    setIsSubmitting(true);

    const orderTriggerPrice = isSwapOrderType(p.order.orderType)
      ? triggerRatio?.ratio ?? triggerPrice ?? positionOrder.triggerPrice
      : triggerPrice ?? positionOrder.triggerPrice;

    const txnPromise = updateOrderTxn(chainId, signer, subaccount, {
      orderKey: p.order.key,
      sizeDeltaUsd: sizeDeltaUsd ?? positionOrder.sizeDeltaUsd,
      triggerPrice: orderTriggerPrice,
      acceptablePrice: acceptablePrice ?? positionOrder.acceptablePrice,
      minOutputAmount: minOutputAmount ?? positionOrder.minOutputAmount,
      executionFee: additionalExecutionFee?.feeTokenAmount,
      indexToken: indexToken,
      autoCancel: positionOrder.autoCancel,
      setPendingTxns: p.setPendingTxns,
    });

    if (subaccount) {
      p.onClose();
      setIsSubmitting(false);
      return;
    }

    txnPromise
      .then(() => p.onClose())
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const submitButtonState = getSubmitButtonState();

  useKey(
    "Enter",
    () => {
      if (!submitButtonState.disabled) {
        onSubmit();
      }
    },
    {},
    [submitButtonState.disabled]
  );

  useEffect(
    function initValues() {
      if (isInited) return;

      if (isSwapOrderType(p.order.orderType)) {
        const ratio = (p.order as SwapOrderInfo).triggerRatio as TokensRatioAndSlippage;

        if (ratio) {
          setTriggerRatioInputValue(formatAmount(ratio.ratio, USD_DECIMALS, 2));
        }

        if (isLimitSwapOrderType(p.order.orderType)) {
          const totalSwapImpactBps = swapImpactBps >= 0n ? 0n : bigMath.abs(swapImpactBps);
          const defaultSwapImpactBuffer = DEFAULT_ALLOWED_SWAP_SLIPPAGE_BPS + totalSwapImpactBps;

          setDefaultAllowedSwapSlippageBps(bigMath.abs(defaultSwapImpactBuffer));
          setSelectedAllowedSwapSlippageBps(ratio?.allowedSwapSlippageBps, false);
        }
      } else {
        const positionOrder = p.order as PositionOrderInfo;

        setSizeInputValue(formatAmountFree(positionOrder.sizeDeltaUsd ?? 0n, USD_DECIMALS));
        const price = positionOrder.triggerPrice ?? 0n;
        const decimals = calculateDisplayDecimals(price, USD_DECIMALS, indexToken?.visualMultiplier);

        setTriggerPriceInputValue(
          formatAmount(price, USD_DECIMALS, decimals, undefined, undefined, indexToken?.visualMultiplier)
        );
      }

      setIsInited(true);
    },
    [
      indexToken?.visualMultiplier,
      isInited,
      p.order,
      setSizeInputValue,
      setTriggerPriceInputValue,
      setTriggerRatioInputValue,

      defaultAllowedSwapSlippageBps,
      setDefaultAllowedSwapSlippageBps,
      selectedAllowedSwapSlippageBps,
      setSelectedAllowedSwapSlippageBps,
      swapImpactBps,
    ]
  );

  const buttonContent = (
    <Button
      className="w-full"
      variant="primary-action"
      onClick={submitButtonState.onClick}
      disabled={submitButtonState.disabled}
    >
      {submitButtonState.text}
    </Button>
  );

  const button = submitButtonState.tooltip ? (
    <TooltipWithPortal
      position="top"
      handleClassName="w-full"
      tooltipClassName="PositionEditor-tooltip"
      handle={buttonContent}
      isHandlerDisabled
      renderContent={() => submitButtonState.tooltip}
    />
  ) : (
    buttonContent
  );

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={true}
        setIsVisible={p.onClose}
        label={<Trans>Edit {p.order.title}</Trans>}
      >
        <div className="mb-14 flex flex-col gap-2">
          {!isSwapOrderType(p.order.orderType) && (
            <>
              <BuyInputSection
                topLeftLabel={isTriggerDecreaseOrderType(p.order.orderType) ? t`Close` : t`Size`}
                inputValue={sizeInputValue}
                onInputValueChange={(e) => setSizeInputValue(e.target.value)}
              >
                USD
              </BuyInputSection>

              <BuyInputSection
                topLeftLabel={isTriggerDecreaseOrderType(p.order.orderType) ? t`Trigger Price` : t`Limit Price`}
                topRightLabel={t`Mark`}
                topRightValue={formatUsdPrice(markPrice, {
                  visualMultiplier: indexToken?.visualMultiplier,
                })}
                onClickTopRightLabel={() =>
                  setTriggerPriceInputValue(
                    formatAmount(
                      markPrice,
                      USD_DECIMALS,
                      calculateDisplayDecimals(markPrice, USD_DECIMALS, indexToken?.visualMultiplier),
                      undefined,
                      undefined,
                      indexToken?.visualMultiplier
                    )
                  )
                }
                inputValue={triggerPriceInputValue}
                onInputValueChange={(e) => setTriggerPriceInputValue(e.target.value)}
              >
                USD
              </BuyInputSection>
            </>
          )}

          {isSwapOrderType(p.order.orderType) && (
            <>
              {triggerRatio && (
                <BuyInputSection
                  topLeftLabel={t`Limit Price`}
                  topRightLabel={t`Mark`}
                  topRightValue={formatAmount(markRatio?.ratio, USD_DECIMALS, 4)}
                  onClickTopRightLabel={() => {
                    setTriggerRatioInputValue(formatAmount(markRatio?.ratio, USD_DECIMALS, 10));
                  }}
                  inputValue={triggerRatioInputValue}
                  onInputValueChange={(e) => {
                    setTriggerRatioInputValue(e.target.value);
                  }}
                >
                  {`${triggerRatio.smallestToken.symbol} per ${triggerRatio.largestToken.symbol}`}
                </BuyInputSection>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-14">
          {button}

          {isLimitIncreaseOrder && (
            <SyntheticsInfoRow
              label={t`Leverage`}
              value={
                <ValueTransition
                  from={formatLeverage(existingPosition?.leverage)}
                  to={formatLeverage(nextPositionValuesForIncrease?.nextLeverage) ?? "-"}
                />
              }
            />
          )}

          {!isSwapOrderType(p.order.orderType) && p.order.orderType !== OrderType.StopLossDecrease && (
            <AcceptablePriceImpactInputRow
              acceptablePriceImpactBps={acceptablePriceImpactBps}
              initialPriceImpactFeeBps={initialAcceptablePriceImpactBps}
              recommendedAcceptablePriceImpactBps={recommendedAcceptablePriceImpactBps}
              setAcceptablePriceImpactBps={setAcceptablePriceImpactBps}
              priceImpactFeeBps={priceImpactFeeBps}
            />
          )}
          {!isSwapOrderType(p.order.orderType) && (
            <>
              <SyntheticsInfoRow
                label={t`Acceptable Price`}
                value={formatAcceptablePrice(acceptablePrice, {
                  visualMultiplier: indexToken?.visualMultiplier,
                })}
              />

              {existingPosition && (
                <SyntheticsInfoRow
                  label={t`Liq. Price`}
                  value={formatLiquidationPrice(existingPosition.liquidationPrice, {
                    visualMultiplier: indexToken?.visualMultiplier,
                  })}
                />
              )}
            </>
          )}

          {additionalExecutionFee && (
            <SyntheticsInfoRow
              label={t`Fees`}
              value={
                <TooltipWithPortal
                  position="top-end"
                  tooltipClassName="PositionEditor-fees-tooltip"
                  handle={formatDeltaUsd(
                    additionalExecutionFee.feeUsd === undefined ? undefined : additionalExecutionFee.feeUsd * -1n
                  )}
                  renderContent={() => (
                    <>
                      <StatsTooltipRow
                        label={<div className="text-white">{t`Network Fee`}:</div>}
                        value={formatTokenAmountWithUsd(
                          additionalExecutionFee.feeTokenAmount * -1n,
                          additionalExecutionFee.feeUsd === undefined ? undefined : additionalExecutionFee.feeUsd * -1n,
                          additionalExecutionFee.feeToken.symbol,
                          additionalExecutionFee.feeToken.decimals,
                          {
                            displayDecimals: 5,
                          }
                        )}
                        showDollar={false}
                      />
                      <br />
                      <div className="text-white">
                        <Trans>As network fees have increased, an additional network fee is needed.</Trans>
                      </div>
                    </>
                  )}
                />
              }
            />
          )}

          {isSwapOrderType(p.order.orderType) && (
            <>
              <AllowedSwapSlippageInputRow
                className="!mb-0 mt-8"
                notAvailable={false}
                totalSwapImpactBps={swapImpactBps}
                allowedSwapSlippageBps={selectedAllowedSwapSlippageBps}
                recommendedAllowedSwapSlippageBps={defaultAllowedSwapSlippageBps}
                setAllowedSwapSlippageBps={setSelectedAllowedSwapSlippageBps}
              />
              <div className="h-1 bg-stroke-primary" />
              <SyntheticsInfoRow
                label={t`Min. Receive`}
                value={formatBalanceAmount(
                  minOutputAmount,
                  p.order.targetCollateralToken.decimals,
                  p.order.targetCollateralToken.symbol
                )}
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
