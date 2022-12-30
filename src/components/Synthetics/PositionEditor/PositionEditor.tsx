import { useEffect, useState } from "react";
import { getPosition, usePositionsData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import Modal from "components/Modal/Modal";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import {
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  getUsdFromTokenAmount,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";

import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import { getExecutionFee } from "domain/synthetics/fees";
import Tab from "components/Tab/Tab";
import { useTokenInputState } from "domain/synthetics/exchange";
import { formatAmountFree, parseValue } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { getTokenAmountFromUsd } from "domain/synthetics/tokens";
import { createOrderTxn } from "domain/synthetics/orders";
import { OrderType } from "config/synthetics";

import "./PositionEditor.scss";

type Props = {
  positionKey: string;
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
  const { chainId } = useChainId();
  const { account, library } = useWeb3React();

  const positionsData = usePositionsData(chainId);
  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const position = getPosition(positionsData, p.positionKey);
  const market = getMarket(marketsData, position?.marketAddress);

  const indexToken = getTokenData(tokensData, market?.indexTokenAddress);
  const collateralToken = getTokenData(tokensData, position?.collateralTokenAddress);

  const [operation, setOperation] = useState(Operation.Deposit);

  const depositInput = useTokenInputState(tokensData, { useMaxPrice: false });

  const [withdrawalInputValue, setWithdrawalInputValue] = useState("");

  const withdrawUsd = parseValue(withdrawalInputValue, USD_DECIMALS);
  const withdrawTokenAmount = getTokenAmountFromUsd(tokensData, collateralToken?.address, withdrawUsd);

  const withdrawalInput = useTokenInputState(tokensData, { useMaxPrice: true });

  const collateralUsd = getUsdFromTokenAmount(tokensData, collateralToken?.address, position?.collateralAmount);

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
      text: operationLabels[operation],
      disabled: false,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!account || !position || !executionFee?.feeTokenAmount || !indexToken) return;

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

    if (operation === Operation.Deposit) {
      createOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        indexTokenAddress: indexToken.address,
        swapPath: [],
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralAmount: depositInput.tokenAmount,
        orderType: OrderType.MarketIncrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
      });
    } else {
      createOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        indexTokenAddress: indexToken.address,
        swapPath: [],
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralAmount: withdrawTokenAmount,
        orderType: OrderType.MarketDecrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
      });
    }
  }

  useEffect(
    function updateInputsByPosition() {
      if (collateralToken?.address) {
        if (collateralToken.address !== depositInput.tokenAddress) {
          depositInput.setTokenAddress(collateralToken.address);
        }
      }
    },
    [collateralToken?.address, depositInput, withdrawalInput]
  );

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
            Edit {position?.isLong ? t`Long` : t`Short`} {indexToken?.symbol}
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
            topLeftValue={formatUsdAmount(depositInput.usdAmount)}
            topRightLabel={t`Max`}
            topRightValue={formatTokenAmount(depositInput.balance, depositInput.token?.decimals)}
            inputValue={depositInput.inputValue}
            onInputValueChange={(e) => depositInput.setInputValue(e.target.value)}
            showMaxButton={depositInput.shouldShowMaxButton}
            onClickMax={() => depositInput.setValueByTokenAmount(depositInput.balance)}
          >
            {depositInput.token?.symbol}
          </BuyInputSection>
        )}

        {operation === Operation.Withdraw && (
          <BuyInputSection
            topLeftLabel={t`Withdraw`}
            topLeftValue={formatTokenAmount(withdrawTokenAmount, collateralToken?.decimals, collateralToken?.symbol)}
            topRightLabel={t`Max`}
            topRightValue={formatUsdAmount(collateralUsd)}
            inputValue={withdrawalInputValue}
            onInputValueChange={(e) => setWithdrawalInputValue(e.target.value)}
            showMaxButton={collateralUsd?.gt(0) && !withdrawUsd?.eq(collateralUsd)}
            onClickMax={() =>
              collateralUsd && setWithdrawalInputValue(formatAmountFree(collateralUsd, USD_DECIMALS, 2))
            }
          >
            USD
          </BuyInputSection>
        )}

        <div className="PositionEditor-info-box">
          <div className="Exchange-info-row PositionSeller-receive-row top-line"></div>
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
