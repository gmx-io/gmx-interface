import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { InfoRow } from "components/InfoRow/InfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { SYNTHETICS_COLLATERAL_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getMarketFeesConfig,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  getAcceptablePrice,
  getNextCollateralUsdForDecreaseOrder,
} from "domain/synthetics/orders";
import {
  AggregatedPositionData,
  formatLeverage,
  getLeverage,
  getLiquidationPrice,
  getMarkPrice,
} from "domain/synthetics/positions";
import { adaptToInfoTokens, convertToTokenAmount, useAvailableTokensData } from "domain/synthetics/tokens";
import { useTokenInput } from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, DEFAULT_SLIPPAGE_AMOUNT, MAX_ALLOWED_LEVERAGE, USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree, formatTokenAmount, formatUsd, parseValue } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";

import { ErrorCode, ErrorDisplayType } from "components/Exchange/constants";
import { getContract } from "config/contracts";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { approveTokens } from "domain/tokens";
import { contractFetcher } from "lib/contracts";
import useSWR from "swr";
import "./PositionEditor.scss";

type Props = {
  position?: AggregatedPositionData;
  savedIsPnlInLeverage: boolean;
  setPendingTxns: (txns: any) => void;
  onClose: () => void;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

const operationLabels = {
  [Operation.Deposit]: t`Deposit`,
  [Operation.Withdraw]: t`Withdraw`,
};

export function PositionEditor(p: Props) {
  const { position, savedIsPnlInLeverage } = p;
  const { chainId } = useChainId();
  const { account, library, active } = useWeb3React();
  const { setPendingPositionUpdate } = useSyntheticsEvents();
  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const [isApproving, setIsApproving] = useState(false);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimitsConfig(chainId);

  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, position?.marketAddress);

  const depositInput = useTokenInput(tokensData, {
    priceType: "min",
    localStorageKey: [chainId, SYNTHETICS_COLLATERAL_DEPOSIT_TOKEN_KEY, position?.marketAddress],
  });

  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const { data: tokenAllowance } = useSWR<BigNumber>(
    [active, chainId, position?.collateralTokenAddress, "allowance", account, routerAddress],
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const [withdrawUsdInputValue, setWithdrawUsdInputValue] = useState("");
  const maxWithdrawUsd = position?.collateralUsd;
  const withdrawUsd = parseValue(withdrawUsdInputValue, USD_DECIMALS);
  const withdrawTokenAmount = convertToTokenAmount(
    withdrawUsd,
    position?.collateralToken?.decimals,
    position?.collateralToken?.prices?.maxPrice
  );

  const collateralDeltaAmount = isDeposit ? depositInput.tokenAmount : withdrawTokenAmount;
  const collateralDeltaUsd = isDeposit ? depositInput.usdAmount : withdrawUsd;

  const nextCollateralUsd = isDeposit
    ? position?.collateralUsd?.add(collateralDeltaUsd || BigNumber.from(0))
    : getNextCollateralUsdForDecreaseOrder({
        sizeDeltaUsd: BigNumber.from(0),
        collateralUsd: position?.collateralUsd,
        collateralDeltaUsd,
        pnl: position?.pnl,
      });

  const nextLeverageExcludingPnl = getLeverage({
    sizeUsd: position?.sizeInUsd,
    collateralUsd: nextCollateralUsd,
    pendingBorrowingFeesUsd: position?.pendingBorrowingFees,
    pendingFundingFeesUsd: position?.pendingFundingFeesUsd,
  });

  const nextLeverage = getLeverage({
    sizeUsd: position?.sizeInUsd,
    collateralUsd: nextCollateralUsd,
    pendingBorrowingFeesUsd: position?.pendingBorrowingFees,
    pendingFundingFeesUsd: position?.pendingFundingFeesUsd,
    pnl: savedIsPnlInLeverage ? position?.pnl : undefined,
  });

  const nextLiqPrice = getLiquidationPrice({
    sizeUsd: position?.sizeInUsd,
    collateralUsd: nextCollateralUsd,
    indexPrice: position?.markPrice,
    isLong: position?.isLong,
    positionFeeFactor: feesConfig?.positionFeeFactor,
  });

  const { acceptablePrice = undefined } = position
    ? getAcceptablePrice({
        isIncrease: isDeposit,
        isLong: position?.isLong,
        sizeDeltaUsd: BigNumber.from(0),
        indexPrice: getMarkPrice(position?.indexToken?.prices, isDeposit, position?.isLong),
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
      })
    : {};

  // TODO: calculate swap fees
  const shouldSwapPnlToCollateralToken =
    !isDeposit && position?.market && position?.pnlToken?.address !== position?.collateralToken?.address;

  const needApproval =
    isDeposit && tokenAllowance && depositInput.tokenAmount && depositInput.tokenAmount.gt(tokenAllowance);

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    let estimatedGas: BigNumber;
    if (isDeposit) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {});
    } else {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    }

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, isDeposit, tokensData]);

  function getError() {
    if (!collateralDeltaAmount || collateralDeltaAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    if (collateralDeltaAmount.lte(0)) {
      return [t`Amount should be greater than zero`];
    }

    if (!isDeposit && collateralDeltaUsd && position?.collateralUsdAfterFees && minCollateralUsd) {
      if (position?.collateralUsdAfterFees.sub(collateralDeltaUsd).lt(minCollateralUsd)) {
        return [t`Min residual collateral: ${formatAmount(minCollateralUsd, USD_DECIMALS, 2)} USD`];
      }
    }

    if (!isDeposit && collateralDeltaUsd && nextLiqPrice && position?.markPrice) {
      if (position?.isLong && position?.markPrice.lt(nextLiqPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
      if (!position?.isLong && position?.markPrice.gt(nextLiqPrice)) {
        return [t`Invalid liq. price`, ErrorDisplayType.Tooltip, ErrorCode.InvalidLiqPrice];
      }
    }

    if (nextLeverageExcludingPnl && nextLeverageExcludingPnl.lt(1.1 * BASIS_POINTS_DIVISOR)) {
      return [t`Min leverage: 1.1x`];
    }

    if (nextLeverage && nextLeverage.gt(MAX_ALLOWED_LEVERAGE)) {
      return [t`Max leverage: ${(MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    return [false];
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getError();

    if (typeof error[0] === "string") {
      return {
        text: error[0],
        disabled: true,
      };
    }

    if (isApproving) {
      return {
        text: t`Approving ${position?.collateralToken?.symbol}...`,
        disabled: true,
      };
    }

    if (needApproval) {
      return {
        text: t`Approve ${position?.collateralToken?.symbol}`,
        onClick: () => {
          if (!position) return;

          approveTokens({
            setIsApproving,
            library,
            tokenAddress: position?.collateralTokenAddress,
            spender: routerAddress,
            chainId: chainId,
            infoTokens: adaptToInfoTokens(tokensData),
            pendingTxns: [],
            setPendingTxns: () => {},
            onApproveSubmitted: () => {},
          });
        },
      };
    }

    return {
      text: operationLabels[operation],
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!account || !executionFee?.feeTokenAmount || !acceptablePrice || !position?.indexToken) return;

    if (operation === Operation.Deposit) {
      createIncreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position?.marketAddress,
        indexTokenAddress: position?.indexToken.address,
        swapPath: [],
        initialCollateralAddress: position?.collateralTokenAddress,
        initialCollateralAmount: depositInput.tokenAmount,
        acceptablePrice,
        orderType: OrderType.MarketIncrease,
        sizeDeltaUsd: BigNumber.from(0),
        isLong: position?.isLong,
        executionFee: executionFee.feeTokenAmount,
        tokensData,
        setPendingTxns: p.setPendingTxns,
      }).then(() => {
        if (p.position) {
          setPendingPositionUpdate({
            isIncrease: true,
            positionKey: p.position.key,
            collateralDeltaAmount: depositInput.tokenAmount,
          });
        }

        p.onClose();
      });
    } else {
      if (!withdrawTokenAmount) return;

      createDecreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position?.marketAddress,
        indexTokenAddress: position?.indexToken.address,
        swapPath: [],
        initialCollateralDeltaAmount: withdrawTokenAmount,
        initialCollateralAddress: position?.collateralTokenAddress,
        receiveTokenAddress: position?.collateralTokenAddress,
        acceptablePrice,
        sizeDeltaUsd: BigNumber.from(0),
        orderType: OrderType.MarketDecrease,
        isLong: position?.isLong,
        executionFee: executionFee.feeTokenAmount,
        decreasePositionSwapType: shouldSwapPnlToCollateralToken
          ? DecreasePositionSwapType.SwapPnlTokenToCollateralToken
          : DecreasePositionSwapType.NoSwap,
        tokensData,
        setPendingTxns: p.setPendingTxns,
      }).then(() => {
        if (p.position) {
          setPendingPositionUpdate({
            isIncrease: false,
            positionKey: p.position.key,
            collateralDeltaAmount: withdrawTokenAmount,
          });
        }

        p.onClose();
      });
    }
  }

  useEffect(
    function updateInputsByPosition() {
      if (position?.collateralToken?.address) {
        if (position?.collateralToken.address !== depositInput.tokenAddress) {
          depositInput.setTokenAddress(position?.collateralToken.address);
        }
      }
    },
    [depositInput, position?.collateralToken?.address]
  );

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionSeller-modal"
        isVisible={Boolean(position)}
        setIsVisible={p.onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        <Tab
          onChange={setOperation}
          option={operation}
          options={Object.values(Operation)}
          optionLabels={operationLabels}
          className="SwapBox-option-tabs PositionEditor-tabs"
        />

        {operation === Operation.Deposit && (
          <BuyInputSection
            topLeftLabel={t`Deposit`}
            topLeftValue={formatUsd(depositInput.usdAmount)}
            topRightLabel={t`Max`}
            topRightValue={formatTokenAmount(depositInput.balance, depositInput.token?.decimals)}
            inputValue={depositInput.inputValue}
            onInputValueChange={(e) => depositInput.setInputValue(e.target.value)}
            showMaxButton={depositInput.isNotMatchAvailableBalance}
            onClickMax={() => depositInput.setValueByTokenAmount(depositInput.balance)}
          >
            {depositInput.token?.symbol}
          </BuyInputSection>
        )}

        {operation === Operation.Withdraw && (
          <BuyInputSection
            topLeftLabel={t`Withdraw`}
            topLeftValue={formatTokenAmount(
              withdrawTokenAmount,
              position?.collateralToken?.decimals,
              position?.collateralToken?.symbol
            )}
            topRightLabel={t`Max`}
            topRightValue={formatUsd(maxWithdrawUsd)}
            inputValue={withdrawUsdInputValue}
            onInputValueChange={(e) => setWithdrawUsdInputValue(e.target.value)}
            showMaxButton={maxWithdrawUsd?.gt(0) && !withdrawUsd?.eq(maxWithdrawUsd)}
            onClickMax={() =>
              maxWithdrawUsd && setWithdrawUsdInputValue(formatAmountFree(maxWithdrawUsd, USD_DECIMALS, 2))
            }
          >
            USD
          </BuyInputSection>
        )}

        <div className="PositionEditor-info-box">
          {/* {minExecutionFeeErrorMessage && <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>} */}
          <InfoRow label={t`Size`} value={formatUsd(position?.sizeInUsd)} />
          <InfoRow
            label={t`Collateral (${position?.collateralToken?.symbol})`}
            value={
              <ValueTransition
                from={formatUsd(position?.collateralUsdAfterFees) || "..."}
                to={
                  nextCollateralUsd &&
                  position?.collateralUsdAfterFees &&
                  !nextCollateralUsd.eq(position?.collateralUsdAfterFees)
                    ? formatUsd(nextCollateralUsd)
                    : undefined
                }
              />
            }
          />
          <InfoRow
            label={t`Leverage`}
            value={
              <ValueTransition
                from={formatLeverage(position?.leverage)}
                to={
                  position?.leverage && nextLeverage && !nextLeverage.eq(position?.leverage)
                    ? formatLeverage(nextLeverage)
                    : undefined
                }
              />
            }
          />
          <InfoRow label={t`Mark Price`} value={formatUsd(position?.markPrice)} />
          <InfoRow
            label={t`Liq Price`}
            value={
              <ValueTransition
                from={formatUsd(position?.liqPrice) || "..."}
                to={
                  nextLiqPrice && position?.liqPrice && !nextLiqPrice.eq(position?.liqPrice)
                    ? formatUsd(nextLiqPrice)
                    : undefined
                }
              />
            }
          />

          {position?.pendingBorrowingFees?.gt(0) && withdrawUsd?.gt(0) && (
            <InfoRow
              label={t`Borrow Fee`}
              value={
                <Tooltip
                  handle={
                    <ValueTransition
                      from={formatUsd(position?.pendingBorrowingFees) || "..."}
                      to={formatUsd(BigNumber.from(0))}
                    />
                  }
                  position="right-top"
                  renderContent={() => <Trans>The pending borrow fee will be charged on this transaction.</Trans>}
                />
              }
            />
          )}

          {position?.pendingFundingFeesUsd?.gt(0) && withdrawUsd?.gt(0) && (
            <InfoRow
              label={t`Funding Fee`}
              value={
                <Tooltip
                  handle={
                    <ValueTransition
                      from={formatUsd(position?.pendingFundingFeesUsd) || "..."}
                      to={formatUsd(BigNumber.from(0))}
                    />
                  }
                  position="right-top"
                  renderContent={() => <Trans>The pending funding fee will be charged on this transaction.</Trans>}
                />
              }
            />
          )}

          <InfoRow
            label={t`Fees and price impact`}
            value={<Tooltip handle={"$0.00"} position="right-top" renderContent={() => "TODO"} />}
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
