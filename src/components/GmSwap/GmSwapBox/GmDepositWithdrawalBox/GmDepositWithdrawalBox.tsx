import { t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import pickBy from "lodash/pickBy";
import uniqBy from "lodash/uniqBy";
import { useCallback, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import { SettlementChainId, SourceChainId } from "config/chains";
import { getContract } from "config/contracts";
import { isSourceChain } from "config/multichain";
import {
  usePoolsDetailsFirstTokenAddress,
  usePoolsDetailsFirstTokenInputValue,
  usePoolsDetailsFocusedInput,
  usePoolsDetailsMarketOrGlvTokenInputValue,
  usePoolsDetailsPaySource,
  usePoolsDetailsSecondTokenAddress,
  usePoolsDetailsSecondTokenInputValue,
} from "context/PoolsDetailsContext/hooks";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvTokenData,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketAndTradeTokensData,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenData,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsMultichainTokensArray,
  selectPoolsDetailsOperation,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsSetIsMarketForGlvSelectedManually,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsTradeTokensDataWithSourceChainBalances,
} from "context/PoolsDetailsContext/selectors";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { paySourceToTokenBalanceType } from "domain/multichain/paySourceToTokenBalanceType";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets";
import { estimatePureLpActionExecutionFee } from "domain/synthetics/markets/feeEstimation/estimatePureLpActionExecutionFee";
import { estimateSourceChainDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainDepositFees";
import { estimateSourceChainGlvDepositFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvDepositFees";
import { estimateSourceChainGlvWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainGlvWithdrawalFees";
import { estimateSourceChainWithdrawalFees } from "domain/synthetics/markets/feeEstimation/estimateSourceChainWithdrawalFees";
import {
  getAvailableUsdLiquidityForCollateral,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { convertToUsd, getMidPrice, getTokenData } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { ERC20Address, NativeTokenSupportedAddress, Token } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useThrottledAsync } from "lib/useThrottledAsync";
import { switchNetwork } from "lib/wallets";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getNativeToken, getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { WithdrawalAmounts } from "sdk/types/trade";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useMultichainMarketTokenBalancesRequest } from "components/GmxAccountModal/hooks";
import { useBestGmPoolAddressForGlv } from "components/MarketStats/hooks/useBestGmPoolForGlv";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { GmSwapBoxProps } from "../GmSwapBox";
import { GmSwapBoxPoolRow } from "../GmSwapBoxPoolRow";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { Operation } from "../types";
import { useGmWarningState } from "../useGmWarningState";
import { InfoRows } from "./InfoRows";
import { selectPoolsDetailsParams } from "./lpTxn/selectPoolsDetailsParams";
import { selectDepositWithdrawalAmounts } from "./selectDepositWithdrawalAmounts";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useGmSwapSubmitState } from "./useGmSwapSubmitState";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";

export function GmSwapBoxDepositWithdrawal(p: GmSwapBoxProps) {
  const {
    // selectedGlvOrMarketAddress,
    onSelectGlvOrMarket,
    onSelectedMarketForGlv,
  } = p;
  const selectedGlvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  // const [, setSettlementChainId] = useGmxAccountSettlementChainId();
  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

  // #region Requests

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);
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
  const marketTokensData = useSelector(selectPoolsDetailsMarketTokensData);

  const { marketsInfo: sortedGlvOrMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    marketTokensData
  );

  const { isDeposit, isWithdrawal, isPair, isSingle } = useSelector(selectPoolsDetailsFlags);

  const tokenChainDataArray = useSelector(selectPoolsDetailsMultichainTokensArray);

  // #region State
  const operation = useSelector(selectPoolsDetailsOperation);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketForGlv);
  const [, setFocusedInput] = usePoolsDetailsFocusedInput();
  const [paySource, setPaySource] = usePoolsDetailsPaySource();
  const [firstTokenAddress, setFirstTokenAddress] = usePoolsDetailsFirstTokenAddress();
  const [secondTokenAddress, setSecondTokenAddress] = usePoolsDetailsSecondTokenAddress();
  const [firstTokenInputValue, setFirstTokenInputValue] = usePoolsDetailsFirstTokenInputValue();
  const [secondTokenInputValue, setSecondTokenInputValue] = usePoolsDetailsSecondTokenInputValue();

  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = usePoolsDetailsMarketOrGlvTokenInputValue();
  // #endregion
  // #region Derived state

  const tradeTokensData = useSelector(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);

  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

  const nativeToken = getByKey(tradeTokensData, NATIVE_TOKEN_ADDRESS);

  const indexName = useMemo(() => marketInfo && getMarketIndexName(marketInfo), [marketInfo]);
  const routerAddress = useMemo(() => getContract(chainId, "SyntheticsRouter"), [chainId]);

  const marketAndTradeTokensData = useSelector(selectPoolsDetailsMarketAndTradeTokensData);

  let firstToken = getTokenData(marketAndTradeTokensData, firstTokenAddress);
  let firstTokenAmount = parseValue(firstTokenInputValue, firstToken?.decimals || 0);
  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  let secondToken = getTokenData(marketAndTradeTokensData, secondTokenAddress);
  let secondTokenAmount = parseValue(secondTokenInputValue, secondToken?.decimals || 0);
  const secondTokenUsd = convertToUsd(
    secondTokenAmount,
    secondToken?.decimals,
    isDeposit ? secondToken?.prices?.minPrice : secondToken?.prices?.maxPrice
  );

  const glvToken = useSelector(selectPoolsDetailsGlvTokenData);

  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);
  const marketOrGlvTokenData = useSelector(selectPoolsDetailsMarketOrGlvTokenData);
  const setIsMarketForGlvSelectedManually = useSelector(selectPoolsDetailsSetIsMarketForGlvSelectedManually);

  // TODO MLTCH: remove dependecy from dynamic market info as this hook can more static
  const tokenOptions: (Token & { isMarketToken?: boolean })[] = useMemo(
    function getTokenOptions(): Token[] {
      // const { longToken, shortToken } = marketInfo || {};

      if (!longTokenAddress || !shortTokenAddress) return [];

      const nativeToken = getNativeToken(chainId);

      const result: Token[] = [];

      for (const sideTokeAddress of [longTokenAddress, shortTokenAddress]) {
        const sideToken = getToken(chainId, sideTokeAddress);
        if (paySource === "sourceChain" && sideToken.isWrapped) {
          result.push(nativeToken);
        } else if (paySource !== "gmxAccount" && paySource !== "sourceChain" && sideToken.isWrapped) {
          result.push(sideToken, nativeToken);
        } else {
          result.push(sideToken);
        }
      }

      if (glvInfo && !isPair && isDeposit) {
        const options = [longTokenAddress, shortTokenAddress].map((address) => getToken(chainId, address));

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

      return uniqBy(result, (token) => token.address);
    },
    [
      longTokenAddress,
      shortTokenAddress,
      chainId,
      glvInfo,
      isPair,
      isDeposit,
      paySource,
      marketTokensData,
      marketsInfoData,
    ]
  );

  const availableTokensData = useMemo(() => {
    return pickBy(marketAndTradeTokensData, (token) => {
      return tokenOptions.find((t) => t.address === token.address);
    });
  }, [marketAndTradeTokensData, tokenOptions]);

  const { longCollateralLiquidityUsd, shortCollateralLiquidityUsd } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    return {
      longCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, true),
      shortCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, false),
    };
  }, [marketInfo]);

  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);

  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const isGlv = glvInfo !== undefined && selectedMarketForGlv !== undefined;

  const params = useSelector(selectPoolsDetailsParams);

  const prevPaySource = usePrevious(paySource);
  const prevOperation = usePrevious(operation);
  const prevIsPair = usePrevious(isPair);
  const forceRecalculate = prevPaySource !== paySource || prevOperation !== operation || prevIsPair !== isPair;

  const technicalFeesAsyncResult = useThrottledAsync(
    async (p) => {
      if (p.params.paySource === "gmxAccount" || p.params.paySource === "settlementChain") {
        if (!p.params.globalExpressParams) {
          return undefined;
        }
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.params as RawCreateGlvDepositParams;
            return estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
                isMarketTokenDeposit: castedParams.isMarketTokenDeposit,
              },
              chainId: p.params.chainId,
              globalExpressParams: p.params.globalExpressParams,
            });
          } else {
            const castedParams = p.params.params as RawCreateDepositParams;
            return estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Deposit,
                isGlv: false,
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              globalExpressParams: p.params.globalExpressParams,
            });
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.params as RawCreateGlvWithdrawalParams;
            return estimatePureLpActionExecutionFee({
              action: {
                operation: Operation.Withdrawal,
                isGlv: true,
                marketsCount: BigInt(p.params.glvInfo!.markets.length),
                swapsCount: BigInt(
                  castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
                ),
              },
              chainId: p.params.chainId,
              globalExpressParams: p.params.globalExpressParams,
            });
          }
          const castedParams = p.params.params as RawCreateWithdrawalParams;
          return estimatePureLpActionExecutionFee({
            action: {
              operation: Operation.Withdrawal,
              isGlv: false,
              swapsCount: BigInt(
                castedParams.addresses.longTokenSwapPath.length + castedParams.addresses.shortTokenSwapPath.length
              ),
            },
            chainId: p.params.chainId,
            globalExpressParams: p.params.globalExpressParams,
          });
        }
      } else if (p.params.paySource === "sourceChain") {
        if (p.params.tokenAddress === undefined || p.params.tokenAmount === undefined) {
          // throw new Error("Token address or token amount is not defined");
          return undefined;
        }
        if (p.params.operation === Operation.Deposit) {
          if (p.params.isGlv) {
            const castedParams = p.params.params as RawCreateGlvDepositParams;
            return await estimateSourceChainGlvDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.tokenAddress,
              tokenAmount: p.params.tokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              glvMarketCount: BigInt(p.params.glvInfo!.markets.length),
            });
          } else {
            const castedParams = p.params.params as RawCreateDepositParams;
            return await estimateSourceChainDepositFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.tokenAddress,
              tokenAmount: p.params.tokenAmount,
              globalExpressParams: p.params.globalExpressParams,
            });
          }
        } else if (p.params.operation === Operation.Withdrawal) {
          if (p.params.isGlv) {
            const castedParams = p.params.params as RawCreateGlvWithdrawalParams;
            const glvWithdrawalAmounts = p.params.amounts as WithdrawalAmounts;
            const outputLongTokenAddress =
              glvWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.longTokenAddress;
            const outputShortTokenAddress =
              glvWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ?? glvInfo!.shortTokenAddress;

            return await estimateSourceChainGlvWithdrawalFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: castedParams.addresses.glv,
              tokenAmount: p.params.marketTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              marketsCount: BigInt(p.params.glvInfo!.markets.length),
              outputLongTokenAddress,
              outputShortTokenAddress,
            });
          } else {
            const castedParams = p.params.params as RawCreateWithdrawalParams;
            if (!p.params.amounts) {
              // throw new Error("Amounts are not defined");
              return undefined;
            }

            const gmWithdrawalAmounts = p.params.amounts as WithdrawalAmounts;

            const outputLongTokenAddress =
              gmWithdrawalAmounts.longTokenSwapPathStats?.tokenOutAddress ??
              MARKETS[p.params.chainId][p.params.params.addresses.market].longTokenAddress;
            const outputShortTokenAddress =
              gmWithdrawalAmounts.shortTokenSwapPathStats?.tokenOutAddress ??
              MARKETS[p.params.chainId][p.params.params.addresses.market].shortTokenAddress;

            return await estimateSourceChainWithdrawalFees({
              chainId: p.params.chainId as SettlementChainId,
              srcChainId: p.params.srcChainId as SourceChainId,
              params: castedParams,
              tokenAddress: p.params.params.addresses.market,
              tokenAmount: p.params.marketTokenAmount,
              globalExpressParams: p.params.globalExpressParams,
              outputLongTokenAddress,
              outputShortTokenAddress,
            });
          }
        }
      }
    },
    {
      params:
        globalExpressParams && params
          ? {
              chainId,
              globalExpressParams,
              params,
              isGlv,
              glvInfo,
              paySource,
              srcChainId,
              tokenAddress: firstTokenAddress,
              marketTokenAmount: marketOrGlvTokenAmount,
              tokenAmount: firstTokenAmount,
              operation,
              amounts,
            }
          : undefined,
      withLoading: false,
      forceRecalculate,
    }
  );

  const { logicalFees } = useDepositWithdrawalFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData: tradeTokensData,
    glvInfo,
    isMarketTokenDeposit,
    technicalFees: technicalFeesAsyncResult.data,
    srcChainId,
  });

  const { shouldShowWarning, shouldShowWarningForExecutionFee, shouldShowWarningForPosition } = useGmWarningState({
    logicalFees,
  });

  const submitState = useGmSwapSubmitState({
    routerAddress,
    logicalFees,
    technicalFees: technicalFeesAsyncResult.data,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData: tradeTokensData,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketsInfoData,
    glvAndMarketsInfoData,
  });

  const firstTokenMaxDetails = useMaxAvailableAmount({
    fromToken: firstToken,
    fromTokenAmount: firstTokenAmount ?? 0n,
    fromTokenInputValue: firstTokenInputValue || "",
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
    srcChainId,
    tokenBalanceType: paySourceToTokenBalanceType(paySource),
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
    // TODO make glv balances work on source chain
    fromToken: marketOrGlvTokenData,
    fromTokenAmount: marketOrGlvTokenAmount,
    fromTokenInputValue: marketOrGlvTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
    tokenBalanceType: paySourceToTokenBalanceType(paySource),
  });

  const marketTokenInputShowMaxButton = isWithdrawal && marketTokenMaxDetails.showClickMax;

  const receiveTokenUsd = glvInfo
    ? amounts?.glvTokenUsd ?? 0n
    : convertToUsd(
        marketOrGlvTokenAmount,
        marketToken?.decimals,
        isDeposit ? marketToken?.prices?.maxPrice : marketToken?.prices?.minPrice
      )!;

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
    [onSelectGlvOrMarket, resetInputs, setIsMarketForGlvSelectedManually]
  );

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      setIsMarketForGlvSelectedManually(true);
      onSelectedMarketForGlv?.(marketAddress);
    },
    [onSelectedMarketForGlv, setIsMarketForGlvSelectedManually]
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
    (tokenAddress: ERC20Address | NativeTokenSupportedAddress): void => {
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
  useUpdateInputAmounts();

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
    fees: logicalFees,
    uiFeeFactor,
    marketTokenAmount: marketOrGlvTokenAmount,
    onSelectedMarketForGlv,
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
      return (
        <div className="selected-token">
          {/* <TokenWithIcon
            symbol={firstToken?.symbol}
            displaySize={20}
            chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
          /> */}
          <TokenIcon
            symbol={
              getToken(
                chainId,
                convertTokenAddress(chainId, MARKETS[chainId]?.[firstToken.address]?.indexTokenAddress, "native")
              ).symbol
            }
            displaySize={20}
            chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
          />
        </div>
      );
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
  }, [chainId, firstToken?.address, firstToken?.symbol, paySource, srcChainId]);

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
                  bottomRightValue={firstTokenMaxDetails.formattedBalance}
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
                      tokensData={availableTokensData}
                      onSelectTokenAddress={async (tokenAddress, isGmxAccount, newSrcChainId) => {
                        if (newSrcChainId !== srcChainId && newSrcChainId !== undefined) {
                          await switchNetwork(newSrcChainId, true);
                        }

                        setPaySource(
                          isSourceChain(newSrcChainId) ? "sourceChain" : isGmxAccount ? "gmxAccount" : "settlementChain"
                        );
                        handleFirstTokenSelect(tokenAddress as ERC20Address | NativeTokenSupportedAddress);
                      }}
                      multichainTokens={tokenChainDataArray}
                      includeMultichainTokensInPay
                      onDepositTokenAddress={noop}
                    />
                  ) : isWithdrawal && firstTokenAddress && isSingle && tokenOptions.length > 1 ? (
                    <TokenSelector
                      chainId={chainId}
                      tokenAddress={firstTokenAddress}
                      onSelectToken={(token) => {
                        handleFirstTokenSelect(token.address as ERC20Address | NativeTokenSupportedAddress);
                      }}
                      showSymbolImage
                      showTokenImgInDropdown
                      tokens={tokenOptions}
                      chainIdBadge={
                        paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined
                      }
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
                  bottomRightValue={marketTokenMaxDetails.formattedBalance}
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
                      paySource={paySource || "settlementChain"}
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
                selectedMarketForGlv={isMarketTokenDeposit ? firstTokenAddress : selectedMarketForGlv}
                disablePoolSelector={isMarketTokenDeposit}
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

        <InfoRows fees={logicalFees} isLoading={!technicalFeesAsyncResult.data} isDeposit={isDeposit} />
      </form>
    </>
  );
}
