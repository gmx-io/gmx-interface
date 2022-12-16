import { t, Trans } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { getContract } from "config/contracts";
import { getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { PriceImpact } from "domain/synthetics/fees/types";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { TokensData } from "domain/synthetics/tokens/types";
import { useTokenAllowance } from "domain/synthetics/tokens/useTokenAllowance";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import {
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenAllowance,
  getTokenAmountFromUsd,
  getTokenData,
  getUsdFromTokenAmount,
} from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Operation, operationTexts, PoolDelta } from "../constants";

import { SyntheticsFees } from "components/SyntheticsFees/SyntheticsFees";
import {
  getMarket,
  getMarketName,
  getMarketTokenData,
  useMarketsData,
  useMarketTokensData,
} from "domain/synthetics/markets";
import "./MarketPoolSwapConfirmation.scss";

type Props = {
  onClose: () => void;
  marketTokenAddress: string;
  marketTokenAmount?: BigNumber;
  longDelta?: PoolDelta;
  shortDelta?: PoolDelta;
  priceImpact?: PriceImpact;
  tokensData: TokensData;
  operationType: Operation;
  feesUsd: BigNumber;
  executionFee?: BigNumber;
  executionFeeUsd?: BigNumber;
  onSubmitted: () => void;
};

function getTokenText(tokensData: TokensData, tokenAddress?: string, swapAmount?: BigNumber) {
  if (!tokenAddress || !swapAmount) return undefined;

  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, swapAmount);
  const token = getTokenData(tokensData, tokenAddress);

  if (!usdAmount || !token) return undefined;

  return formatTokenAmountWithUsd(swapAmount, usdAmount, token.symbol, token.decimals);
}

export function MarketPoolSwapConfirmation(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const tokenAddresses = [p.longDelta?.tokenAddress, p.shortDelta?.tokenAddress, p.marketTokenAddress].filter(
    Boolean
  ) as string[];

  const marketsData = useMarketsData(chainId);
  const marketTokensData = useMarketTokensData(chainId);
  const tokensData = useWhitelistedTokensData(chainId);
  const tokenAllowanceData = useTokenAllowance(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses,
  });

  const [tokensToApprove, setTokensToApprove] = useState<string[]>();

  const isDeposit = p.operationType === Operation.deposit;

  const firstTokenText = getTokenText(tokensData, p.longDelta?.tokenAddress, p.longDelta?.tokenAmount);
  const secondTokenText = getTokenText(tokensData, p.shortDelta?.tokenAddress, p.shortDelta?.tokenAmount);
  const marketTokenText = getTokenText(marketTokensData, p.marketTokenAddress, p.marketTokenAmount);

  const market = getMarket(marketsData, p.marketTokenAddress);
  const marketName = getMarketName(marketsData, tokensData, p.marketTokenAddress);

  const marketToken = getMarketTokenData(marketTokensData, p.marketTokenAddress);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)!;

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const payTokens: { [address: string]: BigNumber } = useMemo(() => {
    if (isDeposit) {
      return [p.longDelta, p.shortDelta].filter(Boolean).reduce((acc, delta) => {
        acc[delta!.tokenAddress] = delta?.tokenAmount;
        return acc;
      }, {});
    }

    return {
      [p.marketTokenAddress]: p.marketTokenAmount,
    };
  }, [isDeposit, p.longDelta, p.marketTokenAddress, p.marketTokenAmount, p.shortDelta]);

  const needTokenApprove = useCallback(
    (tokenAddress: string) => {
      const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);
      const amount = payTokens[tokenAddress];

      if (!allowance || !tokenAddress || !amount) return false;

      return amount.gt(allowance);
    },
    [payTokens, tokenAllowanceData]
  );

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!isAllowanceLoaded || !marketToken) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (needTokenApprove && tokensToApprove?.some((address) => needTokenApprove(address))) {
      return {
        text: t`Need tokens approval`,
        disabled: true,
      };
    }

    const operationText = p.operationType === Operation.deposit ? t`Buy` : `Sell`;
    const text = t`Confirm ${operationText} ${formatTokenAmount(p.marketTokenAmount, marketToken.decimals)} GM`;

    return {
      text,
      onClick: () => {
        if (isDeposit) {
          onCreateDeposit();
        } else {
          onCreateWithdrawal();
        }
      },
    };
  }

  function onCreateDeposit() {
    if (!account || !p.executionFee) return;

    createDepositTxn(chainId, library, {
      account,
      longTokenAddress: p.longDelta?.tokenAddress,
      shortTokenAddress: p.shortDelta?.tokenAddress,
      longTokenAmount: p.longDelta?.tokenAmount,
      shortTokenAmount: p.shortDelta?.tokenAmount,
      marketTokenAddress: p.marketTokenAddress,
      minMarketTokens: p.marketTokenAmount!,
      executionFee: p.executionFee,
    }).then(p.onSubmitted);
  }

  function onCreateWithdrawal() {
    if (!account || !market || !p.executionFee) return;

    const marketLongAmount = p.longDelta
      ? getTokenAmountFromUsd(marketTokensData, p.marketTokenAddress, p.longDelta.usdAmount)
      : undefined;

    const marketShortAmount = p.shortDelta
      ? getTokenAmountFromUsd(marketTokensData, p.marketTokenAddress, p.shortDelta.usdAmount)
      : undefined;

    createWithdrawalTxn(chainId, library, {
      account,
      longTokenAddress: market?.longTokenAddress!,
      marketLongAmount,
      marketShortAmount,
      minLongTokenAmount: p.longDelta?.tokenAmount,
      minShortTokenAmount: p.shortDelta?.tokenAmount,
      marketTokenAddress: p.marketTokenAddress,
      executionFee: p.executionFee,
    }).then(p.onSubmitted);
  }

  useEffect(
    function updateTokensToApproveEff() {
      if (Object.keys(tokenAllowanceData).length > 0 && !tokensToApprove) {
        const payTokens = isDeposit
          ? ([p.longDelta?.tokenAddress, p.shortDelta?.tokenAddress].filter(Boolean) as string[])
          : [p.marketTokenAddress];

        const toApproveAddresses = payTokens.filter((address) => needTokenApprove(address));

        setTokensToApprove(toApproveAddresses);
      }
    },
    [
      isDeposit,
      needTokenApprove,
      p.longDelta?.tokenAddress,
      p.marketTokenAddress,
      p.shortDelta?.tokenAddress,
      tokenAllowanceData,
      tokensToApprove,
    ]
  );

  const submitButtonState = getSubmitButtonState();

  return (
    <div className="Confirmation-box">
      <Modal
        isVisible={true}
        setIsVisible={p.onClose}
        label={t`Confirm ${operationTexts[p.operationType]}`}
        allowContentTouchMove
      >
        <div className={cx("Confirmation-box-main MarketPoolSwapConfirmation-main")}>
          {p.operationType === Operation.deposit && (
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
                <Trans>Receive</Trans>&nbsp;{marketTokenText}
              </div>
            </>
          )}
          {p.operationType === Operation.withdraw && (
            <>
              <div>
                <Trans>Pay</Trans>&nbsp;{marketTokenText}
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

        <SyntheticsFees
          priceImpact={p.priceImpact}
          nativeToken={nativeToken}
          totalFeeUsd={p.feesUsd}
          executionFee={p.executionFee}
          executionFeeUsd={p.executionFeeUsd}
        />

        {tokensToApprove && tokensToApprove.length > 0 && (
          <>
            <div className="App-card-divider" />

            <div className="MarketPoolSwapConfirmation-approve-tokens">
              {tokensToApprove.map((address) => (
                <div className="MarketPoolSwapConfirmation-approve-token">
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={address === p.marketTokenAddress ? marketName! : getToken(chainId, address).symbol}
                    spenderAddress={routerAddress}
                    isApproved={!needTokenApprove(address)}
                  />
                </div>
              ))}
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
