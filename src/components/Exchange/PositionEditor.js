import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { BsArrowRight } from "react-icons/bs";

import { USD_DECIMALS, DEPOSIT_FEE, DUST_BNB, getFundingFee, LIQUIDATION_FEE } from "lib/legacy";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE, MAX_LEVERAGE } from "config/factors";
import { getContract } from "config/contracts";
import Tab from "../Tab/Tab";
import Modal from "../Modal/Modal";

import PositionRouter from "abis/PositionRouter.json";
import Token from "abis/Token.json";
import Tooltip from "../Tooltip/Tooltip";

import { getChainName, IS_NETWORK_DISABLED } from "config/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { getTokenInfo } from "domain/tokens/utils";
import { approveTokens, shouldRaiseGasError } from "domain/tokens";
import { usePrevious } from "lib/usePrevious";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, limitDecimals, parseValue } from "lib/numbers";
import { ErrorCode, ErrorDisplayType } from "./constants";
import Button from "components/Button/Button";
import FeesTooltip from "./FeesTooltip";
import getLiquidationPrice from "lib/positions/getLiquidationPrice";
import { getLeverage } from "lib/positions/getLeverage";
import { getPriceDecimals } from "config/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenIcon from "components/TokenIcon/TokenIcon";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";

const DEPOSIT = "Deposit";
const WITHDRAW = "Withdraw";
const EDIT_OPTIONS = [DEPOSIT, WITHDRAW];
const MIN_ORDER_USD = expandDecimals(10, USD_DECIMALS);
const { AddressZero } = ethers.constants;

export default function PositionEditor(props) {
  const {
    pendingPositions,
    setPendingPositions,
    positionsMap,
    positionKey,
    isVisible,
    setIsVisible,
    infoTokens,
    active,
    account,
    library,
    collateralTokenAddress,
    pendingTxns,
    setPendingTxns,
    getUsd,
    savedIsPnlInLeverage,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    chainId,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
    isContractAccount,
  } = props;
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const isMetamaskMobile = useIsMetamaskMobile();
  const position = positionsMap && positionKey ? positionsMap[positionKey] : undefined;
  const [option, setOption] = useState(DEPOSIT);
  const [fromValue, setFromValue] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const prevIsVisible = usePrevious(isVisible);
  const longOrShortText = position?.isLong ? t`Long` : t`Short`;
  const positionPriceDecimal = getPriceDecimals(chainId, position?.indexToken?.symbol);

  const routerAddress = getContract(chainId, "Router");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  const { data: tokenAllowance } = useSWR(
    [active, chainId, collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const isDeposit = option === DEPOSIT;
  const isWithdrawal = option === WITHDRAW;

  const needPositionRouterApproval = !positionRouterApproved;

  let collateralToken;
  let maxAmount;
  let maxAmountFormatted;
  let maxAmountFormattedFree;
  let fromAmount;
  let needApproval;

  let convertedAmount;
  let convertedAmountFormatted;

  let nextLeverage;
  let nextLeverageExcludingPnl;
  let liquidationPrice;
  let nextLiquidationPrice;
  let nextCollateral;

  let title;
  let collateralDelta;
  let fundingFee;
  let depositFeeUSD;

  if (position) {
    title = t`Edit ${longOrShortText} ${position.indexToken.symbol}`;
    collateralToken = position.collateralToken;
    fundingFee = getFundingFee(position);

    liquidationPrice = getLiquidationPrice({
      size: position.size,
      collateral: position.collateral,
      averagePrice: position.averagePrice,
      isLong: position.isLong,
      fundingFee,
    });

    if (isDeposit) {
      fromAmount = parseValue(fromValue, collateralToken.decimals);
      maxAmount = collateralToken ? collateralToken.balance : bigNumberify(0);
      maxAmountFormatted = formatAmount(maxAmount, collateralToken.decimals, 4, true);
      maxAmountFormattedFree = formatAmountFree(maxAmount, collateralToken.decimals, 8);
      if (fromAmount) {
        convertedAmount = getUsd(fromAmount, position.collateralToken.address, false, infoTokens);
        convertedAmountFormatted = formatAmount(convertedAmount, USD_DECIMALS, 2);
      }
    } else {
      fromAmount = parseValue(fromValue, USD_DECIMALS);

      maxAmount = position.collateralAfterFee.sub(MIN_ORDER_USD).gt(0)
        ? position.collateralAfterFee.sub(MIN_ORDER_USD)
        : bigNumberify(0);

      maxAmountFormatted = formatAmount(maxAmount, USD_DECIMALS, 2, true);
      maxAmountFormattedFree = formatAmountFree(maxAmount, USD_DECIMALS, 2);
      if (fromAmount) {
        convertedAmount = fromAmount.mul(expandDecimals(1, collateralToken.decimals)).div(collateralToken.maxPrice);
        convertedAmountFormatted = formatAmount(convertedAmount, collateralToken.decimals, 4, true);
      }
    }
    needApproval = isDeposit && tokenAllowance && fromAmount && fromAmount.gt(tokenAllowance);

    if (fromAmount) {
      collateralDelta = isDeposit ? convertedAmount : fromAmount;

      if (position.isLong && isDeposit) {
        collateralDelta = collateralDelta.mul(BASIS_POINTS_DIVISOR - DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR);
        depositFeeUSD = convertedAmount.mul(DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR);
      }

      nextCollateral = isDeposit
        ? position.collateralAfterFee.add(collateralDelta)
        : position.collateralAfterFee.sub(collateralDelta);

      nextLeverage = getLeverage({
        size: position.size,
        collateral: nextCollateral,
        hasProfit: position.hasProfit,
        delta: position.delta,
        includeDelta: savedIsPnlInLeverage,
      });

      nextLeverageExcludingPnl = getLeverage({
        size: position.size,
        collateral: nextCollateral,
        hasProfit: position.hasProfit,
        delta: position.delta,
        includeDelta: false,
      });

      // nextCollateral is prev collateral + deposit amount - borrow fee - deposit fee
      // in case of withdrawal nextCollateral is prev collateral - withdraw amount - borrow fee
      nextLiquidationPrice = getLiquidationPrice({
        isLong: position.isLong,
        size: position.size,
        collateral: nextCollateral,
        averagePrice: position.averagePrice,
      });
    }
  }

  const getError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      if (isDeposit) return [t`Deposit disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`Withdraw disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (!fromAmount) {
      return [t`Enter an amount`];
    }

    if (fromAmount.lte(0)) {
      return [t`Amount should be greater than zero`];
    }

    if (!isDeposit && fromAmount) {
      if (position.collateralAfterFee.sub(fromAmount).lt(MIN_ORDER_USD)) {
        return [t`Min residual collateral: 10 USD`];
      }
    }

    if (!isDeposit && fromAmount && nextLiquidationPrice) {
      if (position.isLong && position.markPrice.lt(nextLiquidationPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
      if (!position.isLong && position.markPrice.gt(nextLiquidationPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
    }

    if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return [t`Min leverage: 1.1x`];
    }

    if (nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    if (fromAmount && isDeposit && nextLiquidationPrice) {
      const isInvalidLiquidationPrice = position.isLong
        ? nextLiquidationPrice.gte(position.markPrice)
        : nextLiquidationPrice.lte(position.markPrice);

      if (isInvalidLiquidationPrice) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientDepositAmount];
      }
    }

    if (position.hasProfit) {
      if (nextCollateral.lte(position.closingFee.add(LIQUIDATION_FEE))) {
        return isDeposit ? [t`Deposit not enough to cover fees`] : [t`Leftover Collateral not enough to cover fees`];
      }
      if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.gt(MAX_LEVERAGE)) {
        return [t`Max leverage without PnL: ${(MAX_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
      }
    }

    return [false];
  };

  const isPrimaryEnabled = () => {
    const [error] = getError();
    if (error) {
      return false;
    }
    if (isSwapping) {
      return false;
    }
    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return false;
    }
    if (isPositionRouterApproving) {
      return false;
    }

    return true;
  };

  const getPrimaryText = () => {
    const [error] = getError();
    if (error) {
      return error;
    }
    if (isSwapping) {
      if (isDeposit) {
        return t`Depositing...`;
      }
      return t`Withdrawing...`;
    }

    if (isApproving) {
      return t`Approving ${position.collateralToken.symbol}...`;
    }
    if (needApproval) {
      return t`Approve ${position.collateralToken.symbol}`;
    }

    if (needPositionRouterApproval && isWaitingForPositionRouterApproval) {
      return t`Enabling Leverage`;
    }

    if (isPositionRouterApproving) {
      return t`Enabling Leverage...`;
    }

    if (needPositionRouterApproval) {
      return t`Enable Leverage`;
    }

    if (isDeposit) {
      return t`Deposit`;
    }

    return t`Withdraw`;
  };

  const resetForm = () => {
    setFromValue("");
  };

  useEffect(() => {
    if (prevIsVisible !== isVisible) {
      resetForm();
    }
  }, [prevIsVisible, isVisible]);

  const depositCollateral = async () => {
    setIsSwapping(true);
    const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress;
    const path = [tokenAddress0];
    const indexTokenAddress =
      position.indexToken.address === AddressZero ? nativeTokenAddress : position.indexToken.address;

    const priceBasisPoints = position.isLong ? 11000 : 9000;
    const priceLimit = position.indexToken.maxPrice.mul(priceBasisPoints).div(10000);

    const referralCode = ethers.constants.HashZero;
    let params = [
      path, // _path
      indexTokenAddress, // _indexToken
      fromAmount, // _amountIn
      0, // _minOut
      0, // _sizeDelta
      position.isLong, // _isLong
      priceLimit, // _acceptablePrice
      minExecutionFee, // _executionFee
      referralCode, // _referralCode
      AddressZero, // _callbackTarget
    ];

    let method = "createIncreasePosition";
    let value = minExecutionFee;
    if (collateralTokenAddress === AddressZero) {
      method = "createIncreasePositionETH";
      value = fromAmount.add(minExecutionFee);
      params = [
        path, // _path
        indexTokenAddress, // _indexToken
        0, // _minOut
        0, // _sizeDelta
        position.isLong, // _isLong
        priceLimit, // _acceptablePrice
        minExecutionFee, // _executionFee
        referralCode, // _referralCode
        AddressZero, // _callbackTarget
      ];
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, collateralTokenAddress), fromAmount)) {
      setIsSwapping(false);
      helperToast.error(t`Leave at least ${formatAmount(DUST_BNB, 18, 3)} ETH for gas`);
      return;
    }

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());
    callContract(chainId, contract, method, params, {
      value,
      sentMsg: t`Deposit submitted.`,
      successMsg: t`Requested deposit of ${formatAmount(fromAmount, position.collateralToken.decimals, 4)} ${
        position.collateralToken.symbol
      } into ${position.indexToken.symbol} ${longOrShortText}.`,
      failMsg: t`Deposit failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setFromValue("");
        setIsVisible(false);

        pendingPositions[position.key] = {
          updatedAt: Date.now(),
          pendingChanges: {
            collateralSnapshot: position.collateral,
            expectingCollateralChange: true,
          },
        };

        setPendingPositions({ ...pendingPositions });
      })
      .finally(() => {
        setIsSwapping(false);
      });
  };

  const withdrawCollateral = async () => {
    setIsSwapping(true);
    const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress;
    const indexTokenAddress =
      position.indexToken.address === AddressZero ? nativeTokenAddress : position.indexToken.address;
    const priceBasisPoints = position.isLong ? 9000 : 11000;
    const priceLimit = position.indexToken.maxPrice.mul(priceBasisPoints).div(10000);

    const withdrawAmount = fromAmount.add(fundingFee || bigNumberify(0));

    const withdrawETH =
      !isContractAccount && (collateralTokenAddress === AddressZero || collateralTokenAddress === nativeTokenAddress);

    const params = [
      [tokenAddress0], // _path
      indexTokenAddress, // _indexToken
      withdrawAmount, // _collateralDelta
      0, // _sizeDelta
      position.isLong, // _isLong
      account, // _receiver
      priceLimit, // _acceptablePrice
      0, // _minOut
      minExecutionFee, // _executionFee
      withdrawETH, // _withdrawETH
      AddressZero, // _callbackTarget
    ];

    const method = "createDecreasePosition";

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());
    callContract(chainId, contract, method, params, {
      value: minExecutionFee,
      sentMsg: t`Withdrawal submitted.`,
      successMsg: t`Requested withdrawal of ${formatAmount(fromAmount, USD_DECIMALS, 2)} USD from ${
        position.indexToken.symbol
      } ${longOrShortText}.`,
      failMsg: t`Withdrawal failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setFromValue("");
        setIsVisible(false);

        pendingPositions[position.key] = {
          updatedAt: Date.now(),
          pendingChanges: {
            collateralSnapshot: position.collateral,
            expectingCollateralChange: true,
          },
        };
      })
      .finally(() => {
        setIsSwapping(false);
      });
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        library,
        tokenAddress: collateralTokenAddress,
        spender: routerAddress,
        chainId: chainId,
        infoTokens,
        getTokenInfo,
        pendingTxns,
        setPendingTxns,
      });
      return;
    }

    if (needPositionRouterApproval) {
      approvePositionRouter({
        sentMsg: isDeposit ? t`Enable deposit sent.` : t`Enable withdraw sent.`,
        failMsg: isDeposit ? t`Enable deposit failed.` : t`Enable withdraw failed.`,
      });
      return;
    }

    if (isDeposit) {
      depositCollateral();
      return;
    }

    withdrawCollateral();
  };

  const EDIT_OPTIONS_LABELS = {
    [DEPOSIT]: t`Deposit`,
    [WITHDRAW]: t`Withdraw`,
  };
  const ERROR_TOOLTIP_MSG = {
    [ErrorCode.InvalidLiqPrice]: t`Liquidation price would cross mark price.`,
    [ErrorCode.InsufficientDepositAmount]: t`Deposit amount is insufficient to bring leverage below the max allowed leverage of 100x`,
  };

  function renderPrimaryButton() {
    const [errorMessage, errorType, errorCode] = getError();
    const primaryTextMessage = getPrimaryText();
    if (errorType === ErrorDisplayType.Tooltip && errorMessage === primaryTextMessage && ERROR_TOOLTIP_MSG[errorCode]) {
      return (
        <Tooltip
          isHandlerDisabled
          handle={
            <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
              {primaryTextMessage}
            </Button>
          }
          className="Tooltip-flex"
          position="center-top"
          renderContent={() => ERROR_TOOLTIP_MSG[errorCode]}
        />
      );
    }
    return (
      <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
        {primaryTextMessage}
      </Button>
    );
  }

  return (
    <div className="PositionEditor">
      {position && (
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div>
            <Tab
              options={EDIT_OPTIONS}
              optionLabels={EDIT_OPTIONS_LABELS}
              option={option}
              setOption={setOption}
              onChange={resetForm}
            />
            {(isDeposit || isWithdrawal) && (
              <div>
                <BuyInputSection
                  inputValue={fromValue}
                  onInputValueChange={(e) => setFromValue(e.target.value)}
                  topLeftLabel={isDeposit ? t`Deposit` : t`Withdraw`}
                  topLeftValue={
                    convertedAmountFormatted
                      ? `${convertedAmountFormatted} ${isDeposit ? "USD" : position.collateralToken.symbol}`
                      : ""
                  }
                  topRightLabel={t`Max`}
                  topRightValue={maxAmount && maxAmountFormatted}
                  onClickTopRightLabel={() => setFromValue(maxAmountFormattedFree)}
                  onClick={() => {
                    const finalMaxAmount = isMetamaskMobile
                      ? limitDecimals(maxAmountFormattedFree, MAX_METAMASK_MOBILE_DECIMALS)
                      : maxAmountFormattedFree;
                    setFromValue(finalMaxAmount);
                  }}
                  showMaxButton={fromValue !== maxAmountFormattedFree}
                  onClickMax={() => setFromValue(maxAmountFormattedFree)}
                  showPercentSelector={!isDeposit}
                  onPercentChange={(percentage) => {
                    setFromValue(formatAmountFree(maxAmount.mul(percentage).div(100), USD_DECIMALS, 2));
                  }}
                >
                  {isDeposit ? (
                    <>
                      <TokenIcon
                        className="mr-xs"
                        symbol={position.collateralToken.symbol}
                        displaySize={20}
                        importSize={24}
                      />
                      {position.collateralToken.symbol}
                    </>
                  ) : (
                    "USD"
                  )}
                </BuyInputSection>
                <div className="PositionEditor-info-box">
                  {minExecutionFeeErrorMessage && (
                    <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>
                  )}
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Leverage</Trans>
                    </div>
                    <div className="align-right">
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2, true)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted">
                            {formatAmount(position.leverage, 4, 2, true)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2, true)}x
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Exchange-info-row top-line">
                    <div className="Exchange-info-label">
                      <Trans>Entry Price</Trans>
                    </div>
                    <div className="align-right">
                      ${formatAmount(position.averagePrice, USD_DECIMALS, positionPriceDecimal, true)}
                    </div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Mark Price</Trans>
                    </div>
                    <div className="align-right">
                      ${formatAmount(position.markPrice, USD_DECIMALS, positionPriceDecimal, true)}
                    </div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Liq. Price</Trans>
                    </div>
                    <div className="align-right">
                      {!nextLiquidationPrice && (
                        <div>
                          {!fromAmount &&
                            `$${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}`}
                          {fromAmount && "-"}
                        </div>
                      )}
                      {nextLiquidationPrice && (
                        <div>
                          <div className="inline-block muted">
                            ${formatAmount(liquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextLiquidationPrice, USD_DECIMALS, positionPriceDecimal, true)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Exchange-info-row top-line">
                    <div className="Exchange-info-label">
                      <Trans>Size</Trans>
                    </div>
                    <div className="align-right">{formatAmount(position.size, USD_DECIMALS, 2, true)} USD</div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken.symbol})</Trans>
                    </div>
                    <div className="align-right">
                      {!nextCollateral && (
                        <div>${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}</div>
                      )}
                      {nextCollateral && (
                        <div>
                          <div className="inline-block muted">
                            ${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                        </div>
                      )}
                    </div>
                  </div>

                  {fromAmount?.gt(0) && fundingFee?.gt(0) && (
                    <div className="Exchange-info-row">
                      <div className="Exchange-info-label">
                        <Trans>Borrow Fee</Trans>
                      </div>
                      <div className="align-right">
                        <Tooltip
                          handle={
                            <>
                              <div className="inline-block muted">
                                ${formatAmount(fundingFee, USD_DECIMALS, 2, true)}
                                <BsArrowRight className="transition-arrow" />
                              </div>
                              $0
                            </>
                          }
                          position="right-top"
                          renderContent={() => (
                            <Trans>The pending borrow fee will be charged on this transaction.</Trans>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Fees</Trans>
                    </div>
                    <div className="align-right">
                      <FeesTooltip
                        executionFees={{
                          fee: minExecutionFee,
                          feeUsd: minExecutionFeeUSD,
                        }}
                        depositFee={depositFeeUSD}
                      />
                    </div>
                  </div>
                </div>

                <div className="Exchange-swap-button-container">{renderPrimaryButton()}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
