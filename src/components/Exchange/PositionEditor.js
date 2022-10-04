import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { BsArrowRight } from "react-icons/bs";

import { USD_DECIMALS, BASIS_POINTS_DIVISOR, DEPOSIT_FEE, DUST_BNB, getLiquidationPrice } from "lib/legacy";
import { getContract } from "config/contracts";
import Tab from "../Tab/Tab";
import Modal from "../Modal/Modal";

import PositionRouter from "abis/PositionRouter.json";
import Token from "abis/Token.json";
import Tooltip from "../Tooltip/Tooltip";

import { getChainName, getConstant, IS_NETWORK_DISABLED } from "config/chains";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { callContract, contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { getTokenInfo } from "domain/tokens/utils";
import { approveTokens, shouldRaiseGasError } from "domain/tokens";
import { usePrevious } from "lib/usePrevious";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";

const DEPOSIT = t`Deposit`;
const WITHDRAW = t`Withdraw`;
const EDIT_OPTIONS = [DEPOSIT, WITHDRAW];
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
    getLeverage,
    savedIsPnlInLeverage,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    chainId,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
  } = props;
  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const position = positionsMap && positionKey ? positionsMap[positionKey] : undefined;
  const [option, setOption] = useState(DEPOSIT);
  const [fromValue, setFromValue] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const prevIsVisible = usePrevious(isVisible);

  const routerAddress = getContract(chainId, "Router");
  const positionRouterAddress = getContract(chainId, "PositionRouter");

  const { data: tokenAllowance } = useSWR(
    [active, chainId, collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  // const { data: minExecutionFee } = useSWR([active, chainId, positionRouterAddress, "minExecutionFee"], {
  //   fetcher: fetcher(library, PositionRouter),
  // });

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
  if (position) {
    title = `Edit ${position.isLong ? "Long" : "Short"} ${position.indexToken.symbol}`;
    collateralToken = position.collateralToken;
    liquidationPrice = getLiquidationPrice(position);

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
      maxAmount = position.collateral;
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
      if (position.isLong) {
        collateralDelta = collateralDelta.mul(BASIS_POINTS_DIVISOR - DEPOSIT_FEE).div(BASIS_POINTS_DIVISOR);
      }
      nextLeverage = getLeverage({
        size: position.size,
        collateral: position.collateral,
        collateralDelta,
        increaseCollateral: isDeposit,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate,
        hasProfit: position.hasProfit,
        delta: position.delta,
        includeDelta: savedIsPnlInLeverage,
      });
      nextLeverageExcludingPnl = getLeverage({
        size: position.size,
        collateral: position.collateral,
        collateralDelta,
        increaseCollateral: isDeposit,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate,
        hasProfit: position.hasProfit,
        delta: position.delta,
        includeDelta: false,
      });

      nextLiquidationPrice = getLiquidationPrice({
        isLong: position.isLong,
        size: position.size,
        collateral: position.collateral,
        averagePrice: position.averagePrice,
        entryFundingRate: position.entryFundingRate,
        cumulativeFundingRate: position.cumulativeFundingRate,
        collateralDelta,
        increaseCollateral: isDeposit,
      });

      nextCollateral = isDeposit ? position.collateral.add(collateralDelta) : position.collateral.sub(collateralDelta);
    }
  }

  const getError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      if (isDeposit) return [t`Deposit disabled, pending ${getChainName(chainId)} upgrade`];
      return [t`Withdraw disabled, pending ${getChainName(chainId)} upgrade`];
    }
    if (!fromAmount) {
      return t`Enter an amount`;
    }
    if (nextLeverage && nextLeverage.eq(0)) {
      return t`Enter an amount`;
    }

    if (!isDeposit && fromAmount) {
      if (fromAmount.gte(position.collateral)) {
        return t`Min order: 10 USD`;
      }
      if (position.collateral.sub(fromAmount).lt(expandDecimals(10, USD_DECIMALS))) {
        return t`Min order: 10 USD`;
      }
    }

    if (!isDeposit && fromAmount && nextLiquidationPrice) {
      if (position.isLong && position.markPrice.lt(nextLiquidationPrice)) {
        return t`Invalid liq. price`;
      }
      if (!position.isLong && position.markPrice.gt(nextLiquidationPrice)) {
        return t`Invalid liq. price`;
      }
    }

    if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return t`Min leverage: 1.1x`;
    }

    if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.gt(30.5 * BASIS_POINTS_DIVISOR)) {
      return t`Max leverage: 30x`;
    }
  };

  const isPrimaryEnabled = () => {
    const error = getError();
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
    const error = getError();
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
      ];
    }

    if (shouldRaiseGasError(getTokenInfo(infoTokens, collateralTokenAddress), fromAmount)) {
      setIsSwapping(false);
      helperToast.error(`Leave at least ${formatAmount(DUST_BNB, 18, 3)} ETH for gas`);
      return;
    }

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());
    callContract(chainId, contract, method, params, {
      value,
      sentMsg: t`Deposit submitted.`,
      successMsg: t`Requested deposit of ${formatAmount(fromAmount, position.collateralToken.decimals, 4)} ${
        position.collateralToken.symbol
      } into ${position.indexToken.symbol} ${position.isLong ? "Long" : "Short"}.`,
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

    const withdrawETH = collateralTokenAddress === AddressZero || collateralTokenAddress === nativeTokenAddress;
    const params = [
      [tokenAddress0], // _path
      indexTokenAddress, // _indexToken
      fromAmount, // _collateralDelta
      0, // _sizeDelta
      position.isLong, // _isLong
      account, // _receiver
      priceLimit, // _acceptablePrice
      0, // _minOut
      minExecutionFee, // _executionFee
      withdrawETH, // _withdrawETH
    ];

    const method = "createDecreasePosition";

    const contract = new ethers.Contract(positionRouterAddress, PositionRouter.abi, library.getSigner());
    callContract(chainId, contract, method, params, {
      value: minExecutionFee,
      sentMsg: t`Withdrawal submitted.`,
      successMsg: t`Requested withdrawal of ${formatAmount(fromAmount, USD_DECIMALS, 2)} USD from ${
        position.indexToken.symbol
      } ${position.isLong ? "Long" : "Short"}.`,
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
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  return (
    <div className="PositionEditor">
      {position && (
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div>
            <Tab options={EDIT_OPTIONS} option={option} setOption={setOption} onChange={resetForm} />
            {(isDeposit || isWithdrawal) && (
              <div>
                <div className="Exchange-swap-section">
                  <div className="Exchange-swap-section-top">
                    <div className="muted">
                      {convertedAmountFormatted && (
                        <div className="Exchange-swap-usd">
                          {isDeposit ? t`Deposit` : t`Withdraw`}: {convertedAmountFormatted}{" "}
                          {isDeposit ? "USD" : position.collateralToken.symbol}
                        </div>
                      )}
                      {!convertedAmountFormatted && `${isDeposit ? t`Deposit` : t`Withdraw`}`}
                    </div>
                    {maxAmount && (
                      <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>
                        Max: {maxAmountFormatted}
                      </div>
                    )}
                  </div>
                  <div className="Exchange-swap-section-bottom">
                    <div className="Exchange-swap-input-container">
                      <input
                        type="number"
                        min="0"
                        placeholder="0.0"
                        className="Exchange-swap-input"
                        value={fromValue}
                        onChange={(e) => setFromValue(e.target.value)}
                      />
                      {fromValue !== maxAmountFormattedFree && (
                        <div
                          className="Exchange-swap-max"
                          onClick={() => {
                            setFromValue(maxAmountFormattedFree);
                          }}
                        >
                          MAX
                        </div>
                      )}
                    </div>
                    <div className="PositionEditor-token-symbol">
                      {isDeposit ? position.collateralToken.symbol : "USD"}
                    </div>
                  </div>
                </div>
                <div className="PositionEditor-info-box">
                  {minExecutionFeeErrorMessage && (
                    <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>
                  )}
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Size</Trans>
                    </div>
                    <div className="align-right">{formatAmount(position.size, USD_DECIMALS, 2, true)} USD</div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Collateral</Trans>
                    </div>
                    <div className="align-right">
                      {!nextCollateral && <div>${formatAmount(position.collateral, USD_DECIMALS, 2, true)}</div>}
                      {nextCollateral && (
                        <div>
                          <div className="inline-block muted">
                            ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                        </div>
                      )}
                    </div>
                  </div>
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
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Mark Price</Trans>
                    </div>
                    <div className="align-right">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Liq. Price</Trans>
                    </div>
                    <div className="align-right">
                      {!nextLiquidationPrice && (
                        <div>
                          {!fromAmount && `$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
                          {fromAmount && "-"}
                        </div>
                      )}
                      {nextLiquidationPrice && (
                        <div>
                          <div className="inline-block muted">
                            ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Exchange-info-row">
                    <div className="Exchange-info-label">
                      <Trans>Execution Fee</Trans>
                    </div>
                    <div className="align-right">
                      <Tooltip
                        handle={`${formatAmountFree(minExecutionFee, 18, 5)} ${nativeTokenSymbol}`}
                        position="right-top"
                        renderContent={() => {
                          return (
                            <>
                              <StatsTooltipRow
                                label="Network fee"
                                showDollar={false}
                                value={`${formatAmountFree(
                                  minExecutionFee,
                                  18,
                                  5
                                )} ${nativeTokenSymbol} ($${formatAmount(minExecutionFeeUSD, USD_DECIMALS, 2)})`}
                              />
                              <br />
                              This is the network cost required to execute the {isDeposit
                                ? "deposit"
                                : "withdrawal"}.{" "}
                              <a
                                href="https://gmxio.gitbook.io/gmx/trading#execution-fee"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                More Info
                              </a>
                            </>
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="Exchange-swap-button-container">
                  <button
                    className="App-cta Exchange-swap-button"
                    onClick={onClickPrimary}
                    disabled={!isPrimaryEnabled()}
                  >
                    {getPrimaryText()}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
