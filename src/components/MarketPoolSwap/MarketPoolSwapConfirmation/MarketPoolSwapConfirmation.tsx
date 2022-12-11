import { useEffect, useMemo, useState } from "react";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Modal from "components/Modal/Modal";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import { TokenAllowancesData, TokensData } from "domain/synthetics/tokens/types";
import {
  convertFromUsdByPrice,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  getTokenAllowance,
  getTokenData,
  getUsdFromTokenAmount,
} from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { useWeb3React } from "@web3-react/core";
import Checkbox from "components/Checkbox/Checkbox";
import { InfoRow } from "components/InfoRow/InfoRow";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getContract } from "config/contracts";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";
import { getToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { PriceImpact } from "domain/synthetics/fees/types";
import { formatFee } from "domain/synthetics/fees/utils";
import { createDepositTxn } from "domain/synthetics/markets/createDepositTxn";
import { createWithdrawalTxn } from "domain/synthetics/markets/createWithdrawalTxn";
import { useTokenAllowance } from "domain/synthetics/tokens/useTokenAllowance";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import { useChainId } from "lib/chains";
import { Operation, operationTexts } from "../constants";

import {
  getMarket,
  getMarketName,
  getMarketTokenData,
  useMarketsData,
  useMarketTokensData,
} from "domain/synthetics/markets";
import "./MarketPoolSwapConfirmation.scss";
import { useTransactions } from "lib/contracts";

type Props = {
  onClose: () => void;
  marketTokenAddress: string;
  longTokenAmount?: BigNumber;
  shortTokenAmount?: BigNumber;
  marketTokenAmount?: BigNumber;
  priceImpact?: PriceImpact;
  firstSwapTokenAddress: string;
  firstSwapTokenAmount: BigNumber;
  secondSwapTokenAddress?: string;
  secondSwapTokenAmount?: BigNumber;
  gmSwapAmount: BigNumber;
  tokensData: TokensData;
  operationType: Operation;
  fees: BigNumber;
  executionFee: BigNumber;
  onSubmitted: () => void;
};

function getTokenText(tokensData: TokensData, tokenAddress?: string, swapAmount?: BigNumber) {
  if (!tokenAddress || !swapAmount) return undefined;

  const usdAmount = getUsdFromTokenAmount(tokensData, tokenAddress, swapAmount);
  const token = getTokenData(tokensData, tokenAddress);

  if (!usdAmount || !token) return undefined;

  return formatTokenAmountWithUsd(swapAmount, usdAmount, token.symbol, token.decimals);
}

function needTokenApprove(tokenAllowanceData: TokenAllowancesData, tokenAddress?: string, tokenAmount?: BigNumber) {
  if (!tokenAddress || !tokenAmount) return false;

  const allowance = getTokenAllowance(tokenAllowanceData, tokenAddress);

  return !allowance || tokenAmount.gt(allowance);
}

export function MarketPoolSwapConfirmation(p: Props) {
  const { library, account } = useWeb3React();
  const { chainId } = useChainId();
  const { executeTxn } = useTransactions();
  const routerAddress = getContract(chainId, "SyntheticsRouter");

  const tokenAllowanceData = useTokenAllowance(chainId, {
    spenderAddress: routerAddress,
    tokenAddresses: [p.firstSwapTokenAddress, p.marketTokenAddress, p.secondSwapTokenAddress!].filter(Boolean),
  });

  const marketsData = useMarketsData(chainId);
  const marketTokensData = useMarketTokensData(chainId);
  const tokensData = useWhitelistedTokensData(chainId);

  const [tokensToApprove, setTokensToApprove] = useState<string[]>();
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  const isHighPriceImpact = p.priceImpact?.impact.lt(0) && p.priceImpact?.basisPoints.gte(HIGH_PRICE_IMPACT_BP);

  const swapAmountByToken = useMemo(
    () => ({
      [p.firstSwapTokenAddress]: p.firstSwapTokenAmount,
      [p.secondSwapTokenAddress || "nope"]: p.secondSwapTokenAmount,
      [p.marketTokenAddress]: p.gmSwapAmount,
    }),
    [
      p.firstSwapTokenAddress,
      p.firstSwapTokenAmount,
      p.gmSwapAmount,
      p.marketTokenAddress,
      p.secondSwapTokenAddress,
      p.secondSwapTokenAmount,
    ]
  );

  const isDeposit = p.operationType === Operation.deposit;

  const firstTokenText = getTokenText(tokensData, p.firstSwapTokenAddress, p.firstSwapTokenAmount);
  const secondTokenText = getTokenText(tokensData, p.secondSwapTokenAddress, p.secondSwapTokenAmount);

  const gmTokenText = getTokenText(marketTokensData, p.marketTokenAddress, p.marketTokenAmount);
  const marketToken = getMarketTokenData(marketTokensData, p.marketTokenAddress);

  const market = getMarket(marketsData, p.marketTokenAddress);
  const marketName = getMarketName(marketsData, tokensData, p.marketTokenAddress);

  const isAllowanceLoaded = Object.keys(tokenAllowanceData).length > 0;

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!isAllowanceLoaded || !marketToken) {
      return {
        text: t`Loading...`,
        disabled: true,
      };
    }

    if (tokensToApprove?.some((address) => needTokenApprove(tokenAllowanceData, address, swapAmountByToken[address]))) {
      return {
        text: t`Need tokens approval`,
        disabled: true,
      };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return {
        text: t`Need to accept price impact`,
        disabled: true,
      };
    }

    const operationText = p.operationType === Operation.deposit ? t`Buy` : `Sell`;
    const text = t`Confirm ${operationText} ${formatTokenAmount(p.gmSwapAmount, marketToken.decimals)} GM`;

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
    if (!account) return;

    const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)!;

    const executionFee = convertFromUsdByPrice(p.executionFee, 18, nativeToken.prices!.maxPrice);

    executeTxn(
      createDepositTxn(chainId, library, {
        account,
        longTokenAddress: market?.longTokenAddress!,
        shortTokenAddress: market?.shortTokenAddress!,
        longTokenAmount: p.longTokenAmount,
        shortTokenAmount: p.shortTokenAmount,
        marketTokenAddress: p.marketTokenAddress,
        minMarketTokens: p.marketTokenAmount!,
        executionFee: executionFee!,
      })
    ).then(p.onSubmitted);
  }

  function onCreateWithdrawal() {
    if (!account || !market) return;

    const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS)!;

    const executionFee = convertFromUsdByPrice(p.executionFee, 18, nativeToken.prices!.maxPrice);

    const longTokenPrice = getTokenData(tokensData, market.longTokenAddress)!.prices!.maxPrice;
    const shortTokenPrice = getTokenData(tokensData, market.shortTokenAddress)!.prices!.maxPrice;
    const marketTokenPrice = getMarketTokenData(marketTokensData, p.marketTokenAddress)!.prices?.maxPrice;

    const marketLongAmount = p.longTokenAmount?.mul(longTokenPrice!).div(marketTokenPrice!);
    const marketShortAmount = p.shortTokenAmount?.mul(shortTokenPrice!).div(marketTokenPrice!);

    executeTxn(
      createWithdrawalTxn(chainId, library, {
        account,
        longTokenAddress: market?.longTokenAddress!,
        marketLongAmount,
        marketShortAmount,
        minLongTokenAmount: p.longTokenAmount,
        minShortTokenAmount: p.shortTokenAmount,
        marketTokenAddress: p.marketTokenAddress,
        executionFee: executionFee!,
      })
    ).then(p.onSubmitted);
  }

  useEffect(
    function updateTokensToApproveEff() {
      if (Object.keys(tokenAllowanceData).length > 0 && !tokensToApprove) {
        const payTokens = isDeposit
          ? ([p.firstSwapTokenAddress, p.secondSwapTokenAddress].filter(Boolean) as string[])
          : [p.marketTokenAddress];

        const toApproveAddresses = payTokens.filter(
          (address) =>
            swapAmountByToken[address]?.gt(0) &&
            needTokenApprove(tokenAllowanceData, address, swapAmountByToken[address])
        );

        setTokensToApprove(toApproveAddresses);
      }
    },
    [
      isDeposit,
      p.firstSwapTokenAddress,
      p.marketTokenAddress,
      p.secondSwapTokenAddress,
      swapAmountByToken,
      tokenAllowanceData,
      tokensToApprove,
    ]
  );

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
                <Trans>Receive</Trans>&nbsp;{gmTokenText}
              </div>
            </>
          )}
          {p.operationType === Operation.withdraw && (
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

        <InfoRow
          label={<Trans>Fees and price impact</Trans>}
          value={
            <Tooltip
              handle={formatFee(p.fees)}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <StatsTooltipRow
                    label={t`Price impact`}
                    value={formatFee(p.priceImpact?.impact, p.priceImpact?.impact)}
                    showDollar={false}
                  />
                  <StatsTooltipRow label={t`Execution fee`} value={formatFee(p.executionFee)} showDollar={false} />
                </div>
              )}
            />
          }
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
                    isApproved={!needTokenApprove(tokenAllowanceData, address, swapAmountByToken[address])}
                  />
                </div>
              ))}
            </div>

            <div className="App-card-divider" />
          </>
        )}

        {isHighPriceImpact && (
          <div className="MarketPoolSwapBox-warnings">
            <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the high price impact</Trans>
              </span>
            </Checkbox>
          </div>
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
