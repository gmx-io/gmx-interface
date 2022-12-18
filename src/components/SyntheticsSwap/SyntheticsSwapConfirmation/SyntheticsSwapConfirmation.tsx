import { t, Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getContract } from "config/contracts";
import { useTokenAllowance } from "domain/synthetics/tokens/useTokenAllowance";
import {
  convertToUsdByPrice,
  formatTokenAmountWithUsd,
  getTokenData,
  needTokenApprove,
} from "domain/synthetics/tokens/utils";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";

import { useAvailableTradeTokensData } from "domain/synthetics/tokens";
import { createOrderTxn, OrderType } from "domain/synthetics/exchange";

import { getSubmitError, Mode, Operation, operationTexts } from "../utils";
import { useUserReferralCode } from "domain/referrals";

import "./SyntheticsSwapConfirmation.scss";

type Props = {
  operationType: Operation;
  mode: Mode;
  fromTokenAddress: string;
  fromTokenAmount: BigNumber;
  toTokenAddress: string;
  toTokenAmount: BigNumber;
  sizeDeltaUsd: BigNumber;
  acceptablePrice: BigNumber;
  triggerPrice?: BigNumber;
  executionFee: BigNumber;
  executionFeeUsd: BigNumber;
  executionFeeToken: Token;
  swapPath: string[];
  onClose: () => void;
  onSubmitted: () => void;
};

function getTokenText(token?: Token, tokenAmount?: BigNumber, price?: BigNumber) {
  if (!token || !price || !tokenAmount) return undefined;

  const usdAmount = convertToUsdByPrice(tokenAmount, token.decimals, price);

  return formatTokenAmountWithUsd(tokenAmount, usdAmount, token.symbol, token.decimals);
}

export function SyntheticsSwapConfirmation(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const tokensData = useAvailableTradeTokensData(chainId);
  const referralCodeData = useUserReferralCode(library, chainId, account);

  const tokenAllowanceData = useTokenAllowance(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: [p.fromTokenAddress],
  });

  const fromToken = getTokenData(tokensData, p.fromTokenAddress);
  const toToken = getTokenData(tokensData, p.toTokenAddress);

  const fromTokenText = getTokenText(fromToken, p.fromTokenAmount, fromToken?.prices?.minPrice);
  const toTokenText = getTokenText(toToken, p.toTokenAmount, toToken?.prices?.maxPrice);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const needFromTokenApproval = needTokenApprove(tokenAllowanceData, p.fromTokenAddress, p.fromTokenAmount);

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operationType: p.operationType,
      mode: p.mode,
      tokensData,
      fromTokenAddress: p.fromTokenAddress,
      fromTokenAmount: p.fromTokenAmount,
      toTokenAddress: p.toTokenAddress,
      swapPath: p.swapPath,
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

    const text = t`Confirm ${operationTexts[p.operationType]} ${toToken.symbol}`;

    return {
      text,
      onClick: onSubmit,
    };
  }

  function onSubmit() {
    if (!account || !p.fromTokenAddress || !p.toTokenAddress || !p.executionFee || !p.swapPath) return;

    if ([Operation.Long, Operation.Short].includes(p.operationType)) {
      if ([Mode.Market, Mode.Limit].includes(p.mode)) {
        const orderType = p.mode === Mode.Limit ? OrderType.LimitIncrease : OrderType.MarketIncrease;

        const marketAddress = p.swapPath[p.swapPath.length - 1];

        createOrderTxn(chainId, library, {
          account,
          marketAddress: marketAddress,
          initialCollateralAddress: p.fromTokenAddress,
          initialCollateralAmount: p.fromTokenAmount,
          swapPath: p.swapPath,
          sizeDeltaUsd: p.sizeDeltaUsd,
          triggerPrice: p.triggerPrice,
          acceptablePrice: p.acceptablePrice,
          executionFee: p.executionFee,
          isLong: p.operationType === Operation.Long,
          orderType,
          minOutputAmount: BigNumber.from(0),
          referralCode: referralCodeData?.userReferralCodeString,
        }).then(p.onSubmitted);
      }
    }

    if (p.operationType === Operation.Swap) {
      if (!p.swapPath) return;

      const orderType = p.mode === Mode.Limit ? OrderType.LimitSwap : OrderType.MarketSwap;

      createOrderTxn(chainId, library, {
        account,
        initialCollateralAddress: p.fromTokenAddress,
        initialCollateralAmount: p.fromTokenAmount,
        swapPath: p.swapPath,
        receiveTokenAddress: p.toTokenAddress,
        sizeDeltaUsd: p.sizeDeltaUsd,
        // TODO
        // triggerPrice: BigNumber.from(0),
        acceptablePrice: p.acceptablePrice,
        executionFee: p.executionFee!,
        isLong: false,
        orderType,
        minOutputAmount: BigNumber.from(0),
        referralCode: referralCodeData?.userReferralCodeString,
      }).then(p.onSubmitted);
    }
  }

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="Confirmation-box">
      <Modal
        isVisible={true}
        setIsVisible={p.onClose}
        label={t`Confirm ${operationTexts[p.operationType]}`}
        allowContentTouchMove
      >
        <div className={cx("Confirmation-box-main SyntheticsSwapConfirmation-main")}>
          <div>
            <Trans>Pay</Trans>&nbsp;{fromTokenText}
          </div>
          <div className="Confirmation-box-main-icon"></div>
          <div>
            <Trans>Receive</Trans>&nbsp;{toTokenText}
          </div>
        </div>

        {/* <MarketPoolFees
          priceImpact={p.priceImpact}
          executionFeeToken={p.executionFeeToken}
          totalFeeUsd={p.feesUsd}
          executionFee={p.executionFee}
          executionFeeUsd={p.executionFeeUsd}
        /> */}

        {needFromTokenApproval && fromToken && (
          <>
            <div className="App-card-divider" />

            <div className="SyntheticsSwapConfirmation-approve-tokens">
              <div className="SyntheticsSwapConfirmation-approve-token">
                <ApproveTokenButton
                  tokenAddress={p.fromTokenAddress}
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
