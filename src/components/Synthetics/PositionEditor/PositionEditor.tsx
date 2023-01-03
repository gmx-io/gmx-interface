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
  useAvailableTokensData,
} from "domain/synthetics/tokens";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import { getExecutionFee } from "domain/synthetics/fees";
import { useTokenInputState } from "domain/synthetics/exchange";
import { formatAmountFree, parseValue } from "lib/numbers";
import { DEFAULT_SLIPPAGE_AMOUNT, USD_DECIMALS } from "lib/legacy";
import { getTokenAmountFromUsd } from "domain/synthetics/tokens";
import { OrderType, createDecreaseOrderTxn, createIncreaseOrderTxn } from "domain/synthetics/orders";
import { BigNumber } from "ethers";

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
  const tokensData = useAvailableTokensData(chainId);

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

    if (!indexToken.prices) return;

    if (operation === Operation.Deposit) {
      createIncreaseOrderTxn(chainId, library, {
        account,
        market: position.marketAddress,
        indexTokenAddress: indexToken.address,
        swapPath: [],
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralAmount: depositInput.tokenAmount,
        priceImpactDelta: BigNumber.from(0),
        allowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
        orderType: OrderType.MarketIncrease,
        sizeDeltaUsd: BigNumber.from(0),
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        tokensData,
      });
    } else {
      if (!withdrawTokenAmount) return;

      createDecreaseOrderTxn(chainId, library, {
        account,
        market: position.marketAddress,
        indexTokenAddress: indexToken.address,
        swapPath: [],
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralAmount: withdrawTokenAmount,
        receiveTokenAddress: position.collateralTokenAddress,
        sizeDeltaUsd: BigNumber.from(0),
        acceptablePrice: acceptablePrice!,
        minOutputAmount: withdrawTokenAmount,
        orderType: OrderType.MarketDecrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        tokensData,
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
