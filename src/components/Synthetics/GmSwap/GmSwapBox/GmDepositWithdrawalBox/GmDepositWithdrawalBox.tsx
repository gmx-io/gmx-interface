import { t } from "@lingui/macro";
import cx from "classnames";
import mapValues from "lodash/mapValues";
import noop from "lodash/noop";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { isSourceChain } from "config/multichain";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import {
  getAvailableUsdLiquidityForCollateral,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { convertToUsd, getMidPrice, getTokenData, TokenData } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { Token, TokenBalanceType } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { switchNetwork } from "lib/wallets";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import {
  useMultichainMarketTokenBalancesRequest,
  useMultichainTokens,
} from "components/Synthetics/GmxAccountModal/hooks";
import { useBestGmPoolAddressForGlv } from "components/Synthetics/MarketStats/hooks/useBestGmPoolForGlv";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { GmSwapBoxProps } from "../GmSwapBox";
import { GmSwapBoxPoolRow } from "../GmSwapBoxPoolRow";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { Mode, Operation } from "../types";
import { useGmWarningState } from "../useGmWarningState";
import { InfoRows } from "./InfoRows";
import { TokenInputState } from "./types";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useGmDepositWithdrawalBoxState } from "./useGmDepositWithdrawalBoxState";
import { useGmSwapSubmitState } from "./useGmSwapSubmitState";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";

export function GmSwapBoxDepositWithdrawal(p: GmSwapBoxProps) {
  const {
    selectedGlvOrMarketAddress,
    operation,
    mode,
    onSelectGlvOrMarket,
    selectedMarketForGlv,
    onSelectedMarketForGlv,
  } = p;
  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId, srcChainId } = useChainId();
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  // #region Requests
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, srcChainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, srcChainId, {
    isDeposit: false,
  });
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);
  const { tokenChainDataArray } = useMultichainTokens();
  const { address: account } = useAccount();
  const { tokenBalancesData: marketTokenBalancesData } = useMultichainMarketTokenBalancesRequest(
    chainId,
    srcChainId,
    account,
    selectedGlvOrMarketAddress
  );
  // #endregion

  // #region Selectors
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const { marketsInfo: sortedGlvOrMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    depositMarketTokensData
  );
  const isDeposit = operation === Operation.Deposit;
  const rawTokensData = useTokensData();

  // #region State
  const {
    focusedInput,
    setFocusedInput,
    paySource,
    setPaySource,
    firstTokenAddress,
    setFirstTokenAddress,
    secondTokenAddress,
    setSecondTokenAddress,
    firstTokenInputValue,
    setFirstTokenInputValue,
    secondTokenInputValue,
    setSecondTokenInputValue,
    marketOrGlvTokenInputValue,
    setMarketOrGlvTokenInputValue,
  } = useGmDepositWithdrawalBoxState(operation, mode, selectedGlvOrMarketAddress);
  // #endregion
  // #region Derived state

  const tokensData = useMemo(() => {
    if (paySource !== "sourceChain") {
      return rawTokensData;
    }

    return mapValues(rawTokensData, (token) => {
      const sourceChainToken = tokenChainDataArray.find(
        (t) => t.address === token.address && t.sourceChainId === srcChainId
      );

      if (!sourceChainToken) {
        return token;
      }

      return {
        ...token,
        balanceType: TokenBalanceType.SourceChain,
        balance: sourceChainToken.sourceChainBalance,
        sourceChainBalance: sourceChainToken.sourceChainBalance,
      };
    });
  }, [rawTokensData, tokenChainDataArray, srcChainId, paySource]);

  /**
   * When buy/sell GM - marketInfo is GM market, glvInfo is undefined
   * When buy/sell GLV - marketInfo is corresponding GM market, glvInfo is selected GLV
   */
  const { marketInfo, glvInfo } = useMemo(() => {
    const initialGlvOrMarketInfo = getByKey(glvAndMarketsInfoData, selectedGlvOrMarketAddress);
    const isGlv = initialGlvOrMarketInfo && isGlvInfo(initialGlvOrMarketInfo);
    const marketInfo = isGlv
      ? selectedMarketForGlv
        ? marketsInfoData?.[selectedMarketForGlv]
        : undefined
      : initialGlvOrMarketInfo;

    const glvInfo = isGlv ? initialGlvOrMarketInfo : undefined;

    return {
      marketInfo,
      glvInfo,
    };
  }, [selectedGlvOrMarketAddress, glvAndMarketsInfoData, marketsInfoData, selectedMarketForGlv]);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const isWithdrawal = operation === Operation.Withdrawal;
  const isSingle = mode === Mode.Single;
  const isPair = mode === Mode.Pair;

  const marketTokensData = isDeposit ? depositMarketTokensData : withdrawalMarketTokensData;

  const indexName = useMemo(() => marketInfo && getMarketIndexName(marketInfo), [marketInfo]);
  const routerAddress = useMemo(() => getContract(chainId, "SyntheticsRouter"), [chainId]);
  const allTokensData = useMemo(() => {
    return {
      ...tokensData,
      ...marketTokensData,
    };
  }, [tokensData, marketTokensData]);

  let firstToken = getTokenData(allTokensData, firstTokenAddress);
  let firstTokenAmount = parseValue(firstTokenInputValue, firstToken?.decimals || 0);
  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  let secondToken = getTokenData(allTokensData, secondTokenAddress);
  let secondTokenAmount = parseValue(secondTokenInputValue, secondToken?.decimals || 0);
  const secondTokenUsd = convertToUsd(
    secondTokenAmount,
    secondToken?.decimals,
    isDeposit ? secondToken?.prices?.minPrice : secondToken?.prices?.maxPrice
  );

  const {
    // Undefined when paying with GM
    longTokenInputState,
    // Undefined when isSameCollaterals is true, or when paying with GM
    shortTokenInputState,
    // undefined when not paying with GM
    fromMarketTokenInputState,
  } = useMemo((): Partial<{
    longTokenInputState: TokenInputState;
    shortTokenInputState: TokenInputState;
    fromMarketTokenInputState: TokenInputState;
  }> => {
    if (!marketInfo) {
      return {};
    }

    const inputs: {
      address: string;
      value: string;
      amount: bigint | undefined;
      isMarketToken: boolean;
      usd: bigint | undefined;
      setValue: (val: string) => void;
    }[] = [];

    if (firstTokenAddress) {
      inputs.push({
        address: firstTokenAddress,
        isMarketToken: firstToken?.symbol === "GM",
        value: firstTokenInputValue,
        setValue: setFirstTokenInputValue,
        amount: firstTokenAmount,
        usd: firstTokenUsd,
      });
    }

    if (isPair && secondTokenAddress) {
      inputs.push({
        address: secondTokenAddress,
        value: secondTokenInputValue,
        isMarketToken: false,
        setValue: setSecondTokenInputValue,
        amount: secondTokenAmount,
        usd: secondTokenUsd,
      });
    }

    const longTokenInputState = inputs.find(
      (input) => input.isMarketToken === false && getTokenPoolType(marketInfo, input.address) === "long"
    );
    const shortTokenInputState = inputs.find(
      (input) => input.isMarketToken === false && getTokenPoolType(marketInfo, input.address) === "short"
    );
    const fromMarketTokenInputState = inputs.find((input) => input.isMarketToken);

    return {
      longTokenInputState,
      shortTokenInputState,
      fromMarketTokenInputState,
    };
  }, [
    firstToken,
    firstTokenAddress,
    firstTokenAmount,
    firstTokenInputValue,
    firstTokenUsd,
    isPair,
    marketInfo,
    secondTokenAddress,
    secondTokenAmount,
    secondTokenInputValue,
    secondTokenUsd,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  ]);

  /**
   * When buy/sell GM - marketToken is GM token, glvToken is undefined
   * When buy/sell GLV - marketToken is corresponding GM token, glvToken is selected GLV token
   */
  const { marketTokenAmount, marketToken, glvToken, glvTokenAmount } = useMemo(() => {
    const marketToken = getTokenData(marketTokensData, marketInfo?.marketTokenAddress);
    const marketTokenAmount = glvInfo
      ? fromMarketTokenInputState?.amount ?? 0n
      : parseValue(marketOrGlvTokenInputValue || "0", marketToken?.decimals || 0)!;

    const glvTokenAmount = glvInfo
      ? parseValue(marketOrGlvTokenInputValue || "0", glvInfo?.glvToken.decimals || 0)!
      : 0n;

    return {
      marketToken,
      marketTokenAmount,
      glvToken: glvInfo?.glvToken,
      glvTokenAmount,
    };
  }, [glvInfo, marketInfo, marketTokensData, marketOrGlvTokenInputValue, fromMarketTokenInputState?.amount]);

  const tokenOptions: (Token & { isMarketToken?: boolean })[] = useMemo(
    function getTokenOptions(): TokenData[] {
      const { longToken, shortToken } = marketInfo || {};

      if (!longToken || !shortToken) return [];

      const result = [longToken];

      if (glvInfo && !isPair) {
        const options = [longToken, shortToken];

        const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!;

        if (options.some((token) => token.isWrapped) && nativeToken) {
          options.unshift(nativeToken);
        }

        options.push(
          ...glvInfo.markets
            .map((m) => {
              const token = marketTokensData?.[m.address];
              const market = marketsInfoData?.[m.address];

              if (!market || market.isDisabled) {
                return;
              }

              if (token) {
                return {
                  ...token,
                  isMarketToken: true,
                  name: `${market.indexToken.symbol}: ${market.name}`,
                  symbol: market.indexToken.symbol,
                };
              }
            })
            .filter(Boolean as unknown as FilterOutFalsy)
        );

        return options;
      }

      if (longToken.address !== shortToken.address) {
        result.push(shortToken);
      }

      // TODO MLTCH: maybe allow to, but change chain
      if (srcChainId === undefined || !isPair) {
        const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!;

        if (result.some((token) => token.isWrapped) && nativeToken) {
          result.unshift(nativeToken);
        }
      }

      return result;
    },
    [marketInfo, glvInfo, isPair, srcChainId, tokensData, marketTokensData, marketsInfoData]
  );

  const { longCollateralLiquidityUsd, shortCollateralLiquidityUsd } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    return {
      longCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, true),
      shortCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, false),
    };
  }, [marketInfo]);

  const isMarketTokenDeposit = Boolean(fromMarketTokenInputState);

  const amounts = useDepositWithdrawalAmounts({
    isDeposit,
    marketInfo,
    marketToken,
    glvToken,
    glvTokenAmount,
    longTokenInputState,
    shortTokenInputState,
    marketTokenAmount,
    uiFeeFactor,
    focusedInput,
    isWithdrawal,
    marketTokensData,
    isMarketTokenDeposit,
    glvInfo,
  });

  const { fees, executionFee } = useDepositWithdrawalFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData,
    glvInfo,
    isMarketTokenDeposit,
  });

  const { shouldShowWarning, shouldShowWarningForExecutionFee, shouldShowWarningForPosition } = useGmWarningState({
    executionFee,
    fees,
  });

  const submitState = useGmSwapSubmitState({
    routerAddress,
    amounts,
    executionFee,
    fees,
    isDeposit,
    marketInfo,
    glvInfo,
    marketToken: marketToken!,
    operation,
    glvToken,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData,
    longTokenAddress: longTokenInputState?.address,
    shortTokenAddress: shortTokenInputState?.address,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketTokensData,
    selectedMarketForGlv,
    selectedMarketInfoForGlv: getByKey(marketsInfoData, selectedMarketForGlv),
    isMarketTokenDeposit: isMarketTokenDeposit,
    marketsInfoData,
    glvAndMarketsInfoData,
    paySource,
    isPair,
  });

  const firstTokenMaxDetails = useMaxAvailableAmount({
    fromToken: firstToken,
    fromTokenAmount: firstTokenAmount ?? 0n,
    fromTokenInputValue: firstTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
  });

  const firstTokenShowMaxButton = isDeposit && firstTokenMaxDetails.showClickMax;

  const secondTokenMaxDetails = useMaxAvailableAmount({
    fromToken: secondToken,
    fromTokenAmount: secondTokenAmount ?? 0n,
    fromTokenInputValue: secondTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
  });

  const secondTokenShowMaxButton = isDeposit && secondTokenMaxDetails.showClickMax;

  const marketTokenMaxDetails = useMaxAvailableAmount({
    fromToken: glvInfo ? glvToken : marketToken,
    fromTokenAmount: glvInfo ? glvTokenAmount : marketTokenAmount,
    fromTokenInputValue: marketOrGlvTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
  });

  const marketTokenInputShowMaxButton = isWithdrawal && marketTokenMaxDetails.showClickMax;

  const receiveTokenFormatted = useMemo(() => {
    const usedMarketToken = glvInfo ? glvToken : marketToken;

    if (!usedMarketToken) {
      return undefined;
    }

    let balance;
    if (paySource === "gmxAccount") {
      balance = usedMarketToken.gmxAccountBalance;
    } else if (paySource === "sourceChain") {
      balance = usedMarketToken.sourceChainBalance;
    } else {
      balance = usedMarketToken.walletBalance;
    }

    if (balance === undefined) {
      return undefined;
    }

    return formatBalanceAmount(balance, usedMarketToken.decimals);
  }, [glvInfo, glvToken, marketToken, paySource]);

  const receiveTokenUsd = glvInfo
    ? amounts?.glvTokenUsd ?? 0n
    : convertToUsd(
        marketTokenAmount,
        marketToken?.decimals,
        isDeposit ? marketToken?.prices?.maxPrice : marketToken?.prices?.minPrice
      )!;

  const payTokenBalanceFormatted = useMemo(() => {
    if (!firstToken) {
      return undefined;
    }

    let balance;
    if (paySource === "gmxAccount") {
      balance = firstToken.gmxAccountBalance;
    } else if (paySource === "sourceChain") {
      balance = firstToken.sourceChainBalance;
    } else {
      balance = firstToken.walletBalance;
    }

    if (balance === undefined) {
      return undefined;
    }

    return formatBalanceAmount(balance, firstToken.decimals, undefined, {
      isStable: firstToken.isStable,
    });
  }, [firstToken, paySource]);
  // #endregion

  // #region Callbacks
  const onFocusedCollateralInputChange = useCallback(
    (tokenAddress: string) => {
      if (!marketInfo) {
        return;
      }

      if (marketInfo.isSameCollaterals) {
        setFocusedInput("longCollateral");
        return;
      }

      if (getTokenPoolType(marketInfo, tokenAddress) === "long") {
        setFocusedInput("longCollateral");
      } else {
        setFocusedInput("shortCollateral");
      }
    },
    [marketInfo, setFocusedInput]
  );

  const resetInputs = useCallback(() => {
    setFirstTokenInputValue("");
    setSecondTokenInputValue("");
    setMarketOrGlvTokenInputValue("");
  }, [setFirstTokenInputValue, setMarketOrGlvTokenInputValue, setSecondTokenInputValue]);

  const onGlvOrMarketChange = useCallback(
    (glvOrMarketAddress: string) => {
      resetInputs();
      onSelectGlvOrMarket(glvOrMarketAddress);
      setIsMarketForGlvSelectedManually(false);
    },
    [onSelectGlvOrMarket, resetInputs]
  );

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      setIsMarketForGlvSelectedManually(true);
      onSelectedMarketForGlv?.(marketAddress);
    },
    [onSelectedMarketForGlv]
  );

  const onMaxClickFirstToken = useCallback(() => {
    if (firstTokenMaxDetails.formattedMaxAvailableAmount && firstToken?.address) {
      setFirstTokenInputValue(firstTokenMaxDetails.formattedMaxAvailableAmount);
      onFocusedCollateralInputChange(firstToken.address);
    }
  }, [
    firstToken?.address,
    firstTokenMaxDetails.formattedMaxAvailableAmount,
    onFocusedCollateralInputChange,
    setFirstTokenInputValue,
  ]);

  const onMaxClickSecondToken = useCallback(() => {
    if (!isDeposit || !secondTokenMaxDetails.formattedMaxAvailableAmount || !secondToken?.address) {
      return;
    }

    setSecondTokenInputValue(secondTokenMaxDetails.formattedMaxAvailableAmount);
    onFocusedCollateralInputChange(secondToken.address);
  }, [
    isDeposit,
    onFocusedCollateralInputChange,
    secondToken?.address,
    secondTokenMaxDetails.formattedMaxAvailableAmount,
    setSecondTokenInputValue,
  ]);

  const handleFirstTokenInputValueChange = useCallback(
    (e) => {
      if (firstTokenAddress) {
        setFirstTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(firstTokenAddress);
      }
    },
    [firstTokenAddress, onFocusedCollateralInputChange, setFirstTokenInputValue]
  );

  const marketTokenInputClickMax = useCallback(() => {
    if (!marketTokenMaxDetails.formattedMaxAvailableAmount) {
      return;
    }

    setMarketOrGlvTokenInputValue(marketTokenMaxDetails.formattedMaxAvailableAmount);
    setFocusedInput("market");
  }, [setMarketOrGlvTokenInputValue, marketTokenMaxDetails.formattedMaxAvailableAmount, setFocusedInput]);

  const marketTokenInputClickTopRightLabel = useCallback(() => {
    if (!isWithdrawal) {
      return;
    }

    if (marketToken?.balance) {
      setMarketOrGlvTokenInputValue(formatAmountFree(marketToken.balance, marketToken.decimals));
      setFocusedInput("market");
    }
  }, [isWithdrawal, marketToken?.balance, marketToken?.decimals, setFocusedInput, setMarketOrGlvTokenInputValue]);

  const marketOrGlvTokenInputValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMarketOrGlvTokenInputValue(e.target.value);
      setFocusedInput("market");
    },
    [setFocusedInput, setMarketOrGlvTokenInputValue]
  );

  const secondTokenInputValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (secondToken) {
        setSecondTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(secondToken.address);
      }
    },
    [onFocusedCollateralInputChange, secondToken, setSecondTokenInputValue]
  );

  const handleFirstTokenSelect = useCallback(
    (tokenAddress: string): void => {
      setFirstTokenAddress(tokenAddress);

      const isGmMarketSelected = glvInfo && glvInfo.markets.find((m) => m.address === tokenAddress);

      if (isGmMarketSelected) {
        onSelectedMarketForGlv?.(tokenAddress);
      }
    },
    [setFirstTokenAddress, glvInfo, onSelectedMarketForGlv]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitState.onSubmit?.();
    },
    [submitState]
  );
  // #endregion

  // #region Effects
  useUpdateInputAmounts({
    chainId,
    marketToken,
    marketInfo,
    fromMarketTokenInputState,
    longTokenInputState,
    shortTokenInputState,
    isDeposit,
    glvInfo,
    glvToken,
    focusedInput,
    amounts,
    marketTokenAmount,
    glvTokenAmount,
    isWithdrawal,
    setMarketOrGlvTokenInputValue,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  });

  useEffect(
    function updateMarket() {
      if (!selectedGlvOrMarketAddress && sortedGlvOrMarketsInfoByIndexToken.length) {
        onGlvOrMarketChange(getGlvOrMarketAddress(sortedGlvOrMarketsInfoByIndexToken[0]));
      }
    },
    [selectedGlvOrMarketAddress, onGlvOrMarketChange, sortedGlvOrMarketsInfoByIndexToken]
  );

  useUpdateTokens({
    tokenOptions,
    firstTokenAddress,
    setFirstTokenAddress,
    isSingle,
    secondTokenAddress,
    marketInfo,
    secondTokenAmount,
    setFocusedInput,
    setSecondTokenAddress,
    setSecondTokenInputValue,
    isPair,
    chainId,
  });

  useBestGmPoolAddressForGlv({
    isDeposit,
    glvInfo,
    selectedMarketForGlv,
    fees,
    uiFeeFactor,
    focusedInput,
    marketTokenAmount,
    isMarketTokenDeposit,
    isMarketForGlvSelectedManually,
    glvTokenAmount,
    onSelectedMarketForGlv,
    longTokenInputState,
    shortTokenInputState,
    fromMarketTokenInputState,
    marketTokensData,
  });
  // #endregion

  // #region Render
  const submitButton = useMemo(() => {
    const btn = (
      <Button className="w-full" variant="primary-action" type="submit" disabled={submitState.disabled}>
        {submitState.text}
      </Button>
    );

    if (submitState.errorDescription) {
      return (
        <TooltipWithPortal content={submitState.errorDescription} variant="none">
          {btn}
        </TooltipWithPortal>
      );
    }

    return btn;
  }, [submitState]);

  /**
   * Placeholder eligible for the first token in the pair,
   * additional check added to prevent try render GM token placeholder
   * until useUpdateTokens switch GM to long token
   */
  const firstTokenPlaceholder = useMemo(() => {
    if (firstToken?.symbol === "GM") {
      return null;
    }

    return (
      <div className="selected-token">
        <TokenWithIcon
          symbol={firstToken?.symbol}
          displaySize={20}
          chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
        />
      </div>
    );
  }, [firstToken?.symbol, paySource, srcChainId]);

  return (
    <>
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        <div className="flex flex-col rounded-b-8 bg-slate-900">
          <div className="flex flex-col gap-12 p-12">
            <div className={cx("flex gap-4", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
              <div>
                <BuyInputSection
                  topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
                  bottomLeftValue={formatUsd(firstTokenUsd ?? 0n)}
                  bottomRightLabel={t`Balance`}
                  bottomRightValue={payTokenBalanceFormatted}
                  onClickTopRightLabel={isDeposit ? onMaxClickFirstToken : undefined}
                  inputValue={firstTokenInputValue}
                  onInputValueChange={handleFirstTokenInputValueChange}
                  onClickMax={firstTokenShowMaxButton ? onMaxClickFirstToken : undefined}
                  className={isPair ? "rounded-b-0" : undefined}
                >
                  {firstTokenAddress && isSingle && isDeposit && tokenOptions.length > 1 ? (
                    <MultichainTokenSelector
                      chainId={chainId}
                      srcChainId={srcChainId}
                      tokenAddress={firstTokenAddress}
                      payChainId={paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined}
                      tokensData={tokensData}
                      onSelectTokenAddress={async (tokenAddress, isGmxAccount, newSrcChainId) => {
                        if (newSrcChainId !== srcChainId && newSrcChainId !== undefined) {
                          await switchNetwork(newSrcChainId, true);
                        }

                        setPaySource(
                          isSourceChain(newSrcChainId) ? "sourceChain" : isGmxAccount ? "gmxAccount" : "settlementChain"
                        );
                        handleFirstTokenSelect(tokenAddress);
                      }}
                      multichainTokens={tokenChainDataArray}
                      includeMultichainTokensInPay
                      onDepositTokenAddress={noop}
                    />
                  ) : (
                    firstTokenPlaceholder
                  )}
                </BuyInputSection>

                {isPair && secondTokenAddress && (
                  <div className="border-t-1/2 border-slate-600">
                    <BuyInputSection
                      topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
                      bottomLeftValue={formatUsd(secondTokenUsd ?? 0n)}
                      bottomRightLabel={t`Balance`}
                      bottomRightValue={
                        secondToken && secondToken.balance !== undefined
                          ? formatBalanceAmount(secondToken.balance, secondToken.decimals, undefined, {
                              isStable: secondToken.isStable,
                            })
                          : undefined
                      }
                      inputValue={secondTokenInputValue}
                      onInputValueChange={secondTokenInputValueChange}
                      onClickTopRightLabel={onMaxClickSecondToken}
                      onClickMax={secondTokenShowMaxButton ? onMaxClickSecondToken : undefined}
                      className={isPair ? "rounded-t-0" : undefined}
                    >
                      <div className="selected-token">
                        <TokenWithIcon
                          symbol={secondToken?.symbol}
                          displaySize={20}
                          chainIdBadge={
                            paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined
                          }
                        />
                      </div>
                    </BuyInputSection>
                  </div>
                )}
              </div>

              <div className={cx("flex", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
                <BuyInputSection
                  topLeftLabel={isWithdrawal ? t`Pay` : t`Receive`}
                  bottomLeftValue={formatUsd(receiveTokenUsd ?? 0n)}
                  bottomRightLabel={t`Balance`}
                  bottomRightValue={receiveTokenFormatted}
                  inputValue={marketOrGlvTokenInputValue}
                  onInputValueChange={marketOrGlvTokenInputValueChange}
                  onClickTopRightLabel={marketTokenInputClickTopRightLabel}
                  onClickMax={marketTokenInputShowMaxButton ? marketTokenInputClickMax : undefined}
                >
                  {selectedGlvOrMarketAddress && (
                    <MultichainMarketTokenSelector
                      chainId={chainId}
                      label={isWithdrawal ? t`Pay` : t`Receive`}
                      srcChainId={srcChainId}
                      paySource={paySource}
                      onSelectTokenAddress={async (newChainId) => {
                        if (newChainId === 0) {
                          setPaySource("gmxAccount");
                        } else if (newChainId === chainId) {
                          if (srcChainId !== undefined) {
                            await switchNetwork(chainId, true);
                          }
                          setPaySource("settlementChain");
                        } else {
                          await switchNetwork(newChainId, true);
                          setPaySource("sourceChain");
                        }
                      }}
                      marketInfo={glvInfo ?? marketInfo}
                      tokenBalancesData={marketTokenBalancesData}
                      marketTokenPrice={
                        glvToken
                          ? getMidPrice(glvToken.prices)
                          : marketToken
                            ? getMidPrice(marketToken.prices)
                            : undefined
                      }
                    />
                  )}
                </BuyInputSection>
              </div>
            </div>

            <div className="flex flex-col gap-14">
              <GmSwapBoxPoolRow
                indexName={indexName}
                marketAddress={selectedGlvOrMarketAddress}
                marketTokensData={marketTokensData}
                isDeposit={isDeposit}
                glvInfo={glvInfo}
                selectedMarketForGlv={selectedMarketForGlv}
                disablePoolSelector={fromMarketTokenInputState !== undefined}
                onMarketChange={glvInfo ? onMarketChange : onGlvOrMarketChange}
              />

              <GmSwapWarningsRow
                shouldShowWarning={shouldShowWarning}
                shouldShowWarningForPosition={shouldShowWarningForPosition}
                shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
              />
            </div>
          </div>
          <div className="border-t border-slate-600 p-12">{submitButton}</div>
        </div>

        <InfoRows fees={fees} executionFee={executionFee} isDeposit={isDeposit} />
      </form>
    </>
  );
}
