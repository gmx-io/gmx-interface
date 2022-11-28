import { t, Trans } from "@lingui/macro";
import { InfoRow } from "components/InfoRow/InfoRow";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { PriceImpactData } from "domain/synthetics/priceImpact/usePriceImpact";
import { formatPriceImpact } from "domain/synthetics/priceImpact/utils";
import { TokensData } from "domain/synthetics/tokens/types";
import cx from "classnames";

import {
  convertToUsdByPrice,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenConfig,
  getUsdFromTokenAmount,
  MOCK_GM_PRICE,
} from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { GM_DECIMALS } from "lib/legacy";
import { OperationType, operationTypesTexts } from "../constants";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";

import "./MarketPoolSwapConfirmation.scss";

type Props = {
  onClose: () => void;
  priceImpact: PriceImpactData;
  firstSwapTokenAddress: string;
  firstSwapTokenAmount: BigNumber;
  secondSwapTokenAddress?: string;
  secondSwapTokenAmount?: BigNumber;
  gmSwapAmount: BigNumber;
  tokensData: TokensData;
  operationType: OperationType;
  onApproveToken: (tokenAddress: string) => void;
  onSubmit: () => void;
};

function getTokenText(tokensData: TokensData, tokenAddress?: string, swapAmount?: BigNumber) {
  if (!tokenAddress || !swapAmount) return undefined;

  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, swapAmount);
  const token = getTokenConfig(tokensData, tokenAddress);

  if (!usdAmount || !token) return undefined;

  return formatTokenAmountWithUsd(swapAmount, usdAmount, token.symbol, token.decimals);
}

export function MarketPoolSwapConfirmation(p: Props) {
  const firstTokenText = getTokenText(p.tokensData, p.firstSwapTokenAddress, p.firstSwapTokenAmount);
  const secondTokenText = getTokenText(p.tokensData, p.secondSwapTokenAddress, p.secondSwapTokenAmount);

  const gmUsdAmount = convertToUsdByPrice(p.gmSwapAmount, GM_DECIMALS, MOCK_GM_PRICE);
  const gmTokenText = formatTokenAmountWithUsd(p.gmSwapAmount, gmUsdAmount, "GM", GM_DECIMALS);

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const operationText = p.operationType === OperationType.deposit ? t`Buy` : `Sell`;
    const text = t`Confirm ${operationText} ${formatTokenAmount(p.gmSwapAmount, GM_DECIMALS)} GM`;

    return {
      text,
      onClick: p.onSubmit,
    };
  }

  return (
    <div className="Confirmation-box">
      <Modal
        isVisible={true}
        setIsVisible={p.onClose}
        label={t`Confirm ${operationTypesTexts[p.operationType]}`}
        allowContentTouchMove
      >
        <div className={cx("Confirmation-box-main MarketPoolSwapConfirmation-main")}>
          {p.operationType === OperationType.deposit && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{firstTokenText}
              </div>
              {secondTokenText && (
                <div>
                  <Trans>Pay</Trans>&nbsp;{secondTokenText}
                </div>
              )}
              <div className="Confirmation-box-main-icon"></div>
              <div>
                <Trans>Receive</Trans>&nbsp;{gmTokenText}
              </div>
            </>
          )}
          {p.operationType === OperationType.withdraw && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{gmTokenText}
              </div>
              <div className="Confirmation-box-main-icon"></div>
              <div>
                <Trans>Receive</Trans>&nbsp;{firstTokenText}
              </div>
              {secondTokenText && (
                <div>
                  <Trans>Receive</Trans>&nbsp;{secondTokenText}
                </div>
              )}
            </>
          )}
        </div>

        <InfoRow label={t`Price impact`} value={formatPriceImpact(p.priceImpact)} />

        <div className="App-card-divider" />

        <div className="MarketPoolSwapConfirmation-approve-tokens">
          <div className="MarketPoolSwapConfirmation-approve-token">
            <ApproveTokenButton />
          </div>

          <div className="MarketPoolSwapConfirmation-approve-token">
            <ApproveTokenButton />
          </div>
        </div>

        <div className="App-card-divider" />

        <div className="Confirmation-box-row">
          <SubmitButton onClick={submitButtonState.onClick} disabled={submitButtonState.disabled}>
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </Modal>
    </div>
  );
}
