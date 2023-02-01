// import { Trans, t } from "@lingui/macro";
// import cx from "classnames";
// import BuyInputSection from "components/BuyInputSection/BuyInputSection";
// import Checkbox from "components/Checkbox/Checkbox";
// import { InfoRow } from "components/InfoRow/InfoRow";
// import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
// import { SubmitButton } from "components/SubmitButton/SubmitButton";
// import Tab from "components/Tab/Tab";
// import TokenSelector from "components/TokenSelector/TokenSelector";
// import {
//   KEEP_LEVERAGE_FOR_DECREASE_KEY,
//   LEVERAGE_ENABLED_KEY,
//   LEVERAGE_OPTION_KEY,
//   SYNTHETICS_SWAP_COLLATERAL_KEY,
//   SYNTHETICS_SWAP_FROM_TOKEN_KEY,
//   SYNTHETICS_SWAP_MODE_KEY,
//   SYNTHETICS_SWAP_OPERATION_KEY,
//   SYNTHETICS_SWAP_TO_TOKEN_KEY,
// } from "config/localStorage";
// import { convertTokenAddress } from "config/tokens";
// import { useSelectableSwapTokens, useTokenInputState } from "domain/synthetics/exchange";
// import { convertToTokenAmount, convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
// import { BigNumber } from "ethers";

// import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
// import {
//   getMarket,
//   getMarketByTokens,
//   useMarketsData,
//   useMarketsPoolsData,
//   useOpenInterestData,
// } from "domain/synthetics/markets";
// import {
//   OrderType,
//   getCollateralDeltaUsdForDecreaseOrder,
//   getCollateralOutForDecreaseOrder,
//   getNextCollateralUsdForDecreaseOrder,
// } from "domain/synthetics/orders";
// import {
//   AggregatedPositionData,
//   AggregatedPositionsData,
//   formatLeverage,
//   getLeverage,
//   getLiquidationPrice,
//   getPosition,
//   getPositionKey,
// } from "domain/synthetics/positions";
// import { useChainId } from "lib/chains";
// import { BASIS_POINTS_DIVISOR, DUST_USD, PRECISION, USD_DECIMALS } from "lib/legacy";
// import { useLocalStorageSerializeKey } from "lib/localStorage";
// import {
//   applyFactor,
//   bigNumberify,
//   formatAmount,
//   formatTokenAmount,
//   formatUsd,
//   getBasisPoints,
//   parseValue,
// } from "lib/numbers";
// import { useEffect, useMemo, useState } from "react";
// import { IoMdSwap } from "react-icons/io";
// import { OrderStatus } from "../../OrderStatus/OrderStatus";
// import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";
// import { MarketCard } from "../../MarketCard/MarketCard";
// import {
//   TradeMode,
//   TradeType,
//   avaialbleModes,
//   getNextTokenAmount,
//   getSubmitError,
//   tradeModeLabels,
//   tradeTypeIcons,
//   tradeTypeLabels,
//   useSwapTriggerRatioState,
// } from "../utils";

// import { useWeb3React } from "@web3-react/core";
// import { ValueTransition } from "components/ValueTransition/ValueTransition";
// import {
//   FeeItem,
//   getExecutionFee,
//   getMarketFeesConfig,
//   getPriceImpactForPosition,
//   getTotalInvertedSwapFees,
//   getTotalSwapFees,
// } from "domain/synthetics/fees";
// import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
// import { useSwapRoute } from "domain/synthetics/routing/useSwapRoute";
// import { SwapCard } from "../../SwapCard/SwapCard";
// import { TradeFees } from "components/Synthetics/TradeFees/TradeFees";
// import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";

// import "./SwapBox.scss";

// enum FocusedInput {
//   From = "From",
//   To = "To",
// }

// type Props = {
//   onConnectWallet: () => void;
//   selectedMarketAddress?: string;
//   selectedCollateralAddress?: string;
//   positionsData: AggregatedPositionsData;
//   onSelectMarketAddress: (marketAddress: string) => void;
//   onSelectCollateralAddress: (collateralAddress: string) => void;
// };

// export function SwapBox(p: Props) {
//   const { onSelectMarketAddress } = p;

//   const { chainId } = useChainId();
//   const { account } = useWeb3React();
//   const { tokensData } = useAvailableTokensData(chainId);
//   const { marketsData } = useMarketsData(chainId);
//   const { poolsData } = useMarketsPoolsData(chainId);
//   const { openInterestData } = useOpenInterestData(chainId);
//   const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);

//   const [operationTab, setOperationTab] = useLocalStorageSerializeKey(
//     [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
//     TradeType.Long
//   );
//   const [modeTab, setModeTab] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], TradeMode.Market);

//   const isLong = operationTab === TradeType.Long;
//   const isShort = operationTab === TradeType.Short;
//   const isSwap = operationTab === TradeType.Swap;
//   const isPosition = !isSwap;
//   const isLimit = modeTab === TradeMode.Limit;
//   const isMarket = modeTab === TradeMode.Market;
//   const isTrigger = modeTab === TradeMode.Trigger;

//   const [isConfirming, setIsConfirming] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

//   const [focusedInput, setFocusedInput] = useState<FocusedInput>();

//   const [savedFromToken, setSavedFromToken] = useLocalStorageSerializeKey<string | undefined>(
//     [chainId, SYNTHETICS_SWAP_FROM_TOKEN_KEY],
//     undefined
//   );
//   const [savedToToken, setSavedToToken] = useLocalStorageSerializeKey<string | undefined>(
//     [chainId, SYNTHETICS_SWAP_TO_TOKEN_KEY],
//     undefined
//   );
//   const fromTokenInput = useTokenInputState(tokensData, {
//     initialTokenAddress: savedFromToken,
//     priceType: "minPrice",
//   });
//   const toTokenInput = useTokenInputState(tokensData, {
//     initialTokenAddress: savedToToken,
//     priceType: isShort ? "minPrice" : "maxPrice",
//   });

//   const [closeSizeInput, setCloseSizeInput] = useState("");
//   const closeSizeUsd = parseValue(closeSizeInput || "0", USD_DECIMALS)!;

//   const [triggerPriceValue, setTriggerPriceValue] = useState<string>("");
//   const triggerPrice = parseValue(triggerPriceValue, USD_DECIMALS);

//   const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey([chainId, LEVERAGE_OPTION_KEY], 2);
//   const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);
//   const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
//   const leverageMultiplier = bigNumberify(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));

//   const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);
//   const marketOptions: DropdownOption[] = Object.values(marketsData).map((market) => ({
//     label: `${getTokenData(tokensData, market.indexTokenAddress, "native")?.symbol}/${market.perp}`,
//     value: market.marketTokenAddress,
//   }));

//   const [collateralTokenAddress, setCollateralTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
//     [chainId, SYNTHETICS_SWAP_COLLATERAL_KEY],
//     p.selectedCollateralAddress
//   );
//   const collateralToken = getTokenData(tokensData, collateralTokenAddress);
//   const receiveTokenAddress = collateralTokenAddress;
//   const receiveToken = getTokenData(tokensData, receiveTokenAddress);

//   const { availableFromTokens, availableToTokens, availableCollaterals, infoTokens } = useSelectableSwapTokens({
//     isSwap,
//     indexTokenAddress: isPosition ? toTokenInput.tokenAddress : undefined,
//   });

//   const entryPrice = triggerPrice?.gt(0) ? triggerPrice : toTokenInput.price;
//   const markPrice = toTokenInput.price;
//   const triggerPricePrefix = getTriggerPricePrefix();

//   const sizeDeltaUsd = useMemo(() => {
//     return toTokenInput.usdAmount;
//   }, [toTokenInput.usdAmount]);

//   toTokenInput.token && entryPrice
//     ? convertToUsd(toTokenInput.tokenAmount, toTokenInput.token?.decimals, entryPrice)
//     : BigNumber.from(0);

//   const positionKey = getPositionKey(
//     account || undefined,
//     p.selectedMarketAddress,
//     collateralTokenAddress,
//     operationTab === TradeType.Long
//   );

//   // TODO: request
//   const existingPosition = getPosition(p.positionsData, positionKey) as AggregatedPositionData | undefined;

//   const swapRatio = useSwapTriggerRatioState({
//     isAllowed: true,
//     fromTokenPrice: fromTokenInput.price,
//     toTokenPrice: toTokenInput.price,
//   });

//   const swapRoute = useSwapRoute({
//     initialColltaralAddress: fromTokenInput.tokenAddress,
//     initialCollateralAmount: fromTokenInput.tokenAmount,
//     targetCollateralAddress: isSwap ? toTokenInput.tokenAddress : collateralTokenAddress,
//     indexTokenAddress: isPosition ? toTokenInput.tokenAddress : undefined,
//     sizeDeltaUsd: isPosition ? toTokenInput.usdAmount : undefined,
//     isLong: isPosition ? isLong : undefined,
//   });

//   const feesConfig = getMarketFeesConfig(
//     marketsFeesConfigs,
//     swapRoute.positionMarketAddress || p.selectedMarketAddress
//   );

//   const fees = useMemo(() => {
//     const executionFee = getExecutionFee(tokensData);

//     if (!fromTokenInput.usdAmount.gt(0)) {
//       return {
//         executionFee,
//       };
//     }

//     // const swapFees = getTotalSwapFees(
//     //   marketsData,
//     //   poolsData,
//     //   tokensData,
//     //   marketsFeesConfigs,
//     //   swapRoute.swapPath,
//     //   fromTokenInput.tokenAddress,
//     //   fromTokenInput.usdAmount
//     // );

//     // if (isSwap) {
//     //   const isHighPriceImpact =
//     //     swapFees?.totalPriceImpact.deltaUsd.lt(0) && swapFees?.totalPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BP);

//     //   return {
//     //     isHighPriceImpact,
//     //     totalFee: swapFees?.totalFee,
//     //     totalPriceImpact: swapFees?.totalPriceImpact,
//     //     swapFees,
//     //     executionFee,
//     //   };
//     // }

//   //   if (isPosition) {
//   //     let positionFee: FeeItem | undefined;
//   //     const collateralDeltaUsd = fromTokenInput.usdAmount;

//   //     const positionFeeUsd =
//   //       sizeDeltaUsd && feesConfig?.positionFeeFactor
//   //         ? applyFactor(sizeDeltaUsd, feesConfig.positionFeeFactor)
//   //         : undefined;

//   //     if (positionFeeUsd) {
//   //       // positionFee = {
//   //       //   deltaUsd: positionFeeUsd.mul(-1),
//   //       //   bps: getBasisPoints(positionFeeUsd.mul(-1), collateralDeltaUsd),
//   //       // };
//   //     }

//   //     let positionPriceImpact: FeeItem | undefined;

//   //     const positionPriceImpactDeltaUsd = getPriceImpactForPosition(
//   //       openInterestData,
//   //       marketsFeesConfigs,
//   //       swapRoute.positionMarketAddress,
//   //       sizeDeltaUsd,
//   //       isLong
//   //     );

//   //     if (positionPriceImpactDeltaUsd) {
//   //       // positionPriceImpact = {
//   //       //   deltaUsd: positionPriceImpactDeltaUsd,
//   //       //   bps: getBasisPoints(positionPriceImpactDeltaUsd, collateralDeltaUsd),
//   //       // };
//   //     }

//   //     let totalPriceImpact: FeeItem | undefined;

//   //     if (swapFees?.totalPriceImpact || positionPriceImpact) {
//   //       totalPriceImpact = {
//   //         deltaUsd: BigNumber.from(0)
//   //           .add(swapFees?.totalPriceImpact?.deltaUsd || 0)
//   //           .add(positionPriceImpact?.deltaUsd || 0),

//   //         bps: BigNumber.from(0)
//   //           .add(swapFees?.totalPriceImpact?.bps || 0)
//   //           .add(positionPriceImpact?.bps || 0),
//   //       };
//   //     }

//   //     const isHighPriceImpact =
//   //       totalPriceImpact?.deltaUsd.lt(0) && totalPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BP);

//   //     let totalFeeDeltaUsd = BigNumber.from(0);

//   //     if (swapFees) {
//   //       totalFeeDeltaUsd = totalFeeDeltaUsd.add(swapFees.totalFee.deltaUsd);
//   //     }

//   //     if (positionFee) {
//   //       totalFeeDeltaUsd = totalFeeDeltaUsd.add(positionFee.deltaUsd);
//   //     }

//   //     if (positionPriceImpact) {
//   //       totalFeeDeltaUsd = totalFeeDeltaUsd.add(positionPriceImpact.deltaUsd);
//   //     }

//   //     const totalFee = {
//   //       deltaUsd: totalFeeDeltaUsd,
//   //       bps: getBasisPoints(totalFeeDeltaUsd, fromTokenInput.usdAmount),
//   //     };

//   //     return {
//   //       totalFeeDeltaUsd,
//   //       swapFees,
//   //       positionPriceImpact,
//   //       totalPriceImpact,
//   //       isHighPriceImpact,
//   //       totalFee,
//   //       positionFee,
//   //       executionFee,
//   //     };
//   //   }
//   // }, [
//   //   feesConfig?.positionFeeFactor,
//   //   fromTokenInput.tokenAddress,
//   //   fromTokenInput.usdAmount,
//   //   isLong,
//   //   isPosition,
//   //   isSwap,
//   //   marketsData,
//   //   marketsFeesConfigs,
//   //   openInterestData,
//   //   poolsData,
//   //   sizeDeltaUsd,
//   //   swapRoute.positionMarketAddress,
//   //   swapRoute.swapPath,
//   //   tokensData,
//   // ]);

//   const isClosing = existingPosition?.sizeInUsd.sub(closeSizeUsd).lt(DUST_USD);

//   const nextSizeUsd = isTrigger
//     ? isClosing
//       ? BigNumber.from(0)
//       : existingPosition?.sizeInUsd.sub(closeSizeUsd)
//     : sizeDeltaUsd?.add(existingPosition?.sizeInUsd || BigNumber.from(0));

//   const collateralDeltaUsd =
//     isTrigger && existingPosition
//       ? getCollateralDeltaUsdForDecreaseOrder({
//           isClosing,
//           keepLeverage,
//           sizeDeltaUsd: closeSizeUsd,
//           positionCollateralUsd: existingPosition.collateralUsd,
//           positionSizeInUsd: existingPosition.sizeInUsd,
//         })
//       : BigNumber.from(0);

//   const collateralDeltaAmount = convertToTokenAmount(
//     collateralDeltaUsd,
//     existingPosition?.collateralToken?.decimals,
//     existingPosition?.collateralToken?.prices?.maxPrice
//   );

//   const nextCollateralUsd = isTrigger
//     ? getNextCollateralUsdForDecreaseOrder({
//         isClosing,
//         collateralUsd: existingPosition?.collateralUsd,
//         collateralDeltaUsd,
//         sizeDeltaUsd,
//         pnl: existingPosition?.pnl,
//       })
//     : fromTokenInput.usdAmount?.add(existingPosition?.collateralUsd || BigNumber.from(0));

//   const collateralOutAmount = isTrigger
//     ? getCollateralOutForDecreaseOrder({
//         position: existingPosition,
//         indexToken: existingPosition?.indexToken,
//         collateralToken: existingPosition?.collateralToken,
//         sizeDeltaUsd: closeSizeUsd,
//         collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
//         pnlToken: existingPosition?.pnlToken,
//         feesUsd: BigNumber.from(0),
//         priceImpactUsd: BigNumber.from(0),
//       })
//     : undefined;

//   const receiveUsd = convertToUsd(collateralOutAmount, collateralToken?.decimals, collateralToken?.prices?.minPrice);
//   const receiveTokenAmount = convertToTokenAmount(
//     collateralOutAmount,
//     collateralToken?.decimals,
//     collateralToken?.prices?.minPrice
//   );

//   const nextLiqPrice = getLiquidationPrice({
//     sizeUsd: nextSizeUsd,
//     collateralUsd: nextCollateralUsd,
//     feesUsd: BigNumber.from(0),
//     averagePrice: triggerPrice || markPrice,
//     isLong: operationTab === TradeType.Long,
//   });

//   const nextLeverage = !isTrigger
//     ? bigNumberify(leverageMultiplier || 0)
//     : getLeverage({
//         sizeUsd: nextSizeUsd,
//         collateralUsd: nextCollateralUsd,
//       });

//   function getTriggerPricePrefix() {
//     if (!triggerPrice || !markPrice) return "";

//     if (isTrigger) {
//       if (isLong) {
//         return triggerPrice.gt(markPrice) ? ">" : "<";
//       } else {
//         return triggerPrice.lt(markPrice) ? ">" : "<";
//       }
//     } else {
//       if (isLong) {
//         return triggerPrice.lt(markPrice) ? ">" : "<";
//       } else {
//         return triggerPrice.gt(markPrice) ? ">" : "<";
//       }
//     }
//   }

//   const submitButtonState = getSubmitButtonState();

//   function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
//     const error = getSubmitError({
//       operationType: operationTab!,
//       mode: modeTab!,
//       tokensData,
//       markPrice: toTokenInput.price,
//       fromTokenAddress: fromTokenInput.tokenAddress,
//       toTokenAddress: toTokenInput.tokenAddress,
//       fromTokenAmount: fromTokenInput.tokenAmount,
//       swapPath: swapRoute?.swapPath,
//       isHighPriceImpact: fees?.isHighPriceImpact,
//       isHighPriceImpactAccepted,
//       triggerPrice,
//       swapTriggerRatio: swapRatio?.ratio,
//       closeSizeUsd,
//     });

//     if (error) {
//       return {
//         text: error,
//         disabled: true,
//       };
//     }

//     let text = `${tradeTypeLabels[operationTab!]} ${toTokenInput.token?.symbol}`;

//     if (isTrigger) {
//       text = `Create Trigger order`;
//     }

//     return {
//       text,
//       onClick: () => setIsConfirming(true),
//     };
//   }

//   function onSwitchTokens() {
//     const fromToken = fromTokenInput.tokenAddress;
//     const toToken = toTokenInput.tokenAddress;

//     fromTokenInput.setTokenAddress(toToken);
//     fromTokenInput.setInputValue(toTokenInput.inputValue || "");

//     toTokenInput.setTokenAddress(fromToken);
//     toTokenInput.setInputValue(fromTokenInput.inputValue || "");

//     setFocusedInput((old) => (old === FocusedInput.From ? FocusedInput.To : FocusedInput.From));
//   }

//   function onSelectToToken(tokenAddress: string) {
//     toTokenInput.setTokenAddress(tokenAddress);

//     if (isPosition && collateralTokenAddress) {
//       const indexAddress = convertTokenAddress(chainId, tokenAddress, "wrapped");

//       const shouldUpdateMarket = !selectedMarket || selectedMarket.indexTokenAddress !== indexAddress;

//       if (shouldUpdateMarket) {
//         const market = getMarketByTokens(marketsData, indexAddress);

//         if (market) {
//           p.onSelectMarketAddress(market.marketTokenAddress);
//         }
//       }
//     }
//   }

//   const d = useMemo(() => {
//     if (!fromTokenInput.token || !toTokenInput.token || !toTokenInput.price || !fromTokenInput.price) return {};

//     if (focusedInput === FocusedInput.From) {
//       const swapPath = swapRoute.findSwapPath(fromTokenInput.usdAmount);

//       const swapFees = getTotalSwapFees(
//         marketsData,
//         poolsData,
//         tokensData,
//         marketsFeesConfigs,
//         swapPath,
//         fromTokenInput.tokenAddress,
//         fromTokenInput.usdAmount
//       );

//       let nextToUsd = fromTokenInput.usdAmount;

//       let nextToAmount: BigNumber;

//       if (isPosition) {
//         const indexPrice = triggerPrice || markPrice;

//         nextToAmount = convertToTokenAmount(nextToUsd, toTokenInput.token.decimals, indexPrice)!;
//       } else {
//         nextToAmount = convertToTokenAmount(nextToUsd, toTokenInput.token.decimals, toTokenInput.price)!;
//       }

//       return {
//         sizeDeltaUsd: nextToUsd,
//         nextToAmount,
//         swapFees,
//       };
//     }
//   }, [
//     focusedInput,
//     fromTokenInput.price,
//     fromTokenInput.token,
//     fromTokenInput.tokenAddress,
//     fromTokenInput.usdAmount,
//     isPosition,
//     markPrice,
//     marketsData,
//     marketsFeesConfigs,
//     poolsData,
//     swapRoute,
//     toTokenInput.price,
//     toTokenInput.token,
//     tokensData,
//     triggerPrice,
//   ]);

//   useEffect(() => {}, []);

//   // useEffect(
//   //   // TODO: fees
//   //   function updateInputs() {
//   //     if (!fromTokenInput.token || !toTokenInput.token || !toTokenInput.price || !fromTokenInput.price) return;

//   //     if (focusedInput === FocusedInput.From) {
//   //       // What if swapPath not specified?
//   //       const swapPath = swapRoute.findSwapPath(fromTokenInput.usdAmount);

//   //       // apply swap fees
//   //       const swapFees = getTotalSwapFees(
//   //         marketsData,
//   //         poolsData,
//   //         tokensData,
//   //         marketsFeesConfigs,
//   //         swapPath,
//   //         fromTokenInput.tokenAddress,
//   //         fromTokenInput.usdAmount
//   //       );

//   //       let nextToUsd = fromTokenInput.usdAmount;

//   //       let nextToAmount: BigNumber;

//   //       if (isPosition) {
//   //         const indexPrice = triggerPrice || markPrice;

//   //         nextToAmount = convertToTokenAmount(nextToUsd, toTokenInput.token.decimals, indexPrice)!;
//   //         toTokenInput.setValueByTokenAmount(nextToAmount);
//   //       }

//   //       // if (isPosition && leverageMultiplier && feesConfig?.positionFeeFactor) {
//   //       //   let newLeverage = leverageMultiplier.sub(applyFactor(leverageMultiplier, feesConfig.positionFeeFactor));

//   //       //   nextToUsd = nextToUsd.mul(newLeverage).div(BASIS_POINTS_DIVISOR);
//   //       // }

//   //       return;
//   //     }

//   //     if (focusedInput === FocusedInput.To) {
//   //       let nextFromUsd = toTokenInput.usdAmount;

//   //       // apply leverage
//   //       if (isPosition && leverageMultiplier && feesConfig?.positionFeeFactor) {
//   //         let newLeverage = leverageMultiplier.sub(applyFactor(leverageMultiplier, feesConfig.positionFeeFactor));

//   //         newLeverage = BigNumber.from(BASIS_POINTS_DIVISOR).mul(BASIS_POINTS_DIVISOR).div(newLeverage);

//   //         nextFromUsd = nextFromUsd.mul(newLeverage).div(BASIS_POINTS_DIVISOR);
//   //       }

//   //       let swapPath = swapRoute.findSwapPath(nextFromUsd);

//   //       let swapFees = getTotalSwapFees(
//   //         marketsData,
//   //         poolsData,
//   //         tokensData,
//   //         marketsFeesConfigs,
//   //         swapPath,
//   //         fromTokenInput.tokenAddress,
//   //         nextFromUsd
//   //       );

//   //       if (!swapFees) return;

//   //       let baseOut = swapFees.usdOut;

//   //       nextFromUsd = nextFromUsd.mul(nextFromUsd).div(baseOut);

//   //       fromTokenInput.setValueByUsdAmount(nextFromUsd);
//   //     }
//   //   },
//   //   [
//   //     feesConfig?.positionFeeFactor,
//   //     focusedInput,
//   //     fromTokenInput,
//   //     isPosition,
//   //     leverageMultiplier,
//   //     marketsData,
//   //     marketsFeesConfigs,
//   //     poolsData,
//   //     swapRoute,
//   //     toTokenInput,
//   //     tokensData,
//   //   ]
//   // );

//   useEffect(
//     function updateMode() {
//       if (operationTab && modeTab && !avaialbleModes[operationTab].includes(modeTab)) {
//         setModeTab(avaialbleModes[operationTab][0]);
//       }
//     },
//     [modeTab, operationTab, setModeTab]
//   );

//   useEffect(
//     function updateTokenInputs() {
//       if (isPosition && selectedMarket && toTokenInput.tokenAddress) {
//         const convetedIndexAddress = convertTokenAddress(chainId, toTokenInput.tokenAddress, "wrapped");

//         if (selectedMarket.indexTokenAddress !== convetedIndexAddress) {
//           toTokenInput.setTokenAddress(convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native"));
//         }
//       }

//       if (fromTokenInput.tokenAddress !== savedFromToken) {
//         setSavedFromToken(fromTokenInput.tokenAddress);
//       }

//       if (toTokenInput.tokenAddress !== savedToToken) {
//         setSavedToToken(toTokenInput.tokenAddress);
//       }

//       if (
//         availableFromTokens.length &&
//         !availableFromTokens.find((token) => token.address === fromTokenInput.tokenAddress)
//       ) {
//         fromTokenInput.setTokenAddress(availableFromTokens[0].address);
//       }

//       if (availableToTokens.length && !availableToTokens.find((token) => token.address === toTokenInput.tokenAddress)) {
//         toTokenInput.setTokenAddress(availableToTokens[0].address);
//       }
//     },
//     [
//       availableFromTokens,
//       availableToTokens,
//       fromTokenInput,
//       savedFromToken,
//       savedToToken,
//       setSavedFromToken,
//       setSavedToToken,
//       toTokenInput,
//       selectedMarket,
//       isPosition,
//       chainId,
//     ]
//   );

//   useEffect(
//     function updateMarket() {
//       if (!p.selectedMarketAddress && toTokenInput.tokenAddress) {
//         const market = getMarketByTokens(
//           marketsData,
//           convertTokenAddress(chainId, toTokenInput.tokenAddress, "wrapped"),
//           collateralTokenAddress ? convertTokenAddress(chainId, collateralTokenAddress, "wrapped") : undefined
//         );

//         if (market) {
//           onSelectMarketAddress(market.marketTokenAddress);
//         }
//       }
//     },
//     [
//       chainId,
//       collateralTokenAddress,
//       marketsData,
//       onSelectMarketAddress,
//       p.selectedMarketAddress,
//       swapRoute?.positionMarketAddress,
//       toTokenInput.tokenAddress,
//     ]
//   );

//   useEffect(
//     function updateCollateral() {
//       if (!isPosition || !availableCollaterals?.length) return;

//       if (!collateralTokenAddress || !availableCollaterals.find((token) => token.address === collateralTokenAddress)) {
//         if (
//           p.selectedCollateralAddress &&
//           availableCollaterals.find((token) => token.address === p.selectedCollateralAddress)
//         ) {
//           setCollateralTokenAddress(p.selectedCollateralAddress);
//           return;
//         } else {
//           p.onSelectCollateralAddress(availableCollaterals[0].address);
//           setCollateralTokenAddress(availableCollaterals[0].address);
//         }
//       }
//     },
//     [
//       availableCollaterals,
//       chainId,
//       collateralTokenAddress,
//       isPosition,
//       marketsData,
//       onSelectMarketAddress,
//       p,
//       p.selectedCollateralAddress,
//       selectedMarket,
//       setCollateralTokenAddress,
//       toTokenInput.tokenAddress,
//     ]
//   );

//   return (
//     <>
//       <div className={`App-box SwapBox`}>
//         <Tab
//           icons={tradeTypeIcons}
//           options={Object.values(TradeType)}
//           optionLabels={tradeTypeLabels}
//           option={operationTab}
//           onChange={setOperationTab}
//           className="SwapBox-option-tabs"
//         />

//         <Tab
//           options={Object.values(avaialbleModes[operationTab!])}
//           optionLabels={tradeModeLabels}
//           className="SwapBox-asset-options-tabs"
//           type="inline"
//           option={modeTab}
//           onChange={setModeTab}
//         />

//         <div className={cx("SwapBox-form-layout")}>
//           {!isTrigger && (
//             <>
//               <BuyInputSection
//                 topLeftLabel={t`Pay:`}
//                 topLeftValue={formatUsd(fromTokenInput.usdAmount)}
//                 topRightLabel={t`Balance:`}
//                 topRightValue={formatTokenAmount(fromTokenInput.balance, fromTokenInput.token?.decimals)}
//                 inputValue={fromTokenInput.inputValue}
//                 onInputValueChange={(e) => {
//                   setFocusedInput(FocusedInput.From);
//                   fromTokenInput.setInputValue(e.target.value);
//                 }}
//                 showMaxButton={fromTokenInput.isNotMatchBalance}
//                 onClickMax={() => {
//                   setFocusedInput(FocusedInput.From);
//                   fromTokenInput.setValueByTokenAmount(fromTokenInput.balance);
//                 }}
//               >
//                 {fromTokenInput.tokenAddress && (
//                   <TokenSelector
//                     label={t`Pay`}
//                     chainId={chainId}
//                     tokenAddress={fromTokenInput.tokenAddress}
//                     onSelectToken={(token) => fromTokenInput.setTokenAddress(token.address)}
//                     tokens={availableFromTokens}
//                     infoTokens={infoTokens}
//                     className="GlpSwap-from-token"
//                     showSymbolImage={true}
//                     showTokenImgInDropdown={true}
//                   />
//                 )}
//               </BuyInputSection>

//               <div className="AppOrder-ball-container" onClick={onSwitchTokens}>
//                 <div className="AppOrder-ball">
//                   <IoMdSwap className="Exchange-swap-ball-icon" />
//                 </div>
//               </div>

//               <BuyInputSection
//                 topLeftLabel={operationTab === TradeType.Swap ? t`Receive:` : `${tradeTypeLabels[operationTab!]}:`}
//                 topLeftValue={formatUsd(sizeDeltaUsd)}
//                 topRightLabel={operationTab === TradeType.Swap ? t`Balance:` : t`Leverage:`}
//                 topRightValue={
//                   operationTab === TradeType.Swap
//                     ? formatTokenAmount(toTokenInput.balance, toTokenInput.token?.decimals)
//                     : `${leverageOption?.toFixed(2)}x`
//                 }
//                 inputValue={toTokenInput.inputValue}
//                 onInputValueChange={(e) => {
//                   setFocusedInput(FocusedInput.To);
//                   toTokenInput.setInputValue(e.target.value);
//                 }}
//                 showMaxButton={false}
//               >
//                 {toTokenInput.tokenAddress && (
//                   <TokenSelector
//                     label={operationTab === TradeType.Swap ? t`Receive:` : tradeTypeLabels[operationTab!]}
//                     chainId={chainId}
//                     tokenAddress={toTokenInput.tokenAddress}
//                     onSelectToken={(token) => onSelectToToken(token.address)}
//                     tokens={availableToTokens}
//                     infoTokens={infoTokens}
//                     className="GlpSwap-from-token"
//                     showSymbolImage={true}
//                     showBalances={operationTab === TradeType.Swap}
//                     showTokenImgInDropdown={true}
//                   />
//                 )}
//               </BuyInputSection>
//             </>
//           )}

//           {isTrigger && (
//             <BuyInputSection
//               topLeftLabel={t`Close`}
//               topRightLabel={existingPosition?.sizeInUsd ? `Max:` : undefined}
//               topRightValue={existingPosition?.sizeInUsd ? formatUsd(existingPosition.sizeInUsd) : undefined}
//               inputValue={closeSizeInput}
//               onInputValueChange={(e) => setCloseSizeInput(e.target.value)}
//               showMaxButton={existingPosition?.sizeInUsd.gt(0) && !closeSizeUsd?.eq(existingPosition.sizeInUsd)}
//               onClickMax={() => setCloseSizeInput(formatAmount(existingPosition?.sizeInUsd, USD_DECIMALS, 2))}
//             >
//               USD
//             </BuyInputSection>
//           )}

//           {isPosition && (isLimit || isTrigger) && (
//             <BuyInputSection
//               topLeftLabel={t`Price`}
//               topRightLabel={t`Mark:`}
//               topRightValue={formatUsd(toTokenInput.price)}
//               onClickTopRightLabel={() => {
//                 setTriggerPriceValue(formatAmount(toTokenInput.price, USD_DECIMALS, 2));
//               }}
//               inputValue={triggerPriceValue}
//               onInputValueChange={(e) => {
//                 setTriggerPriceValue(e.target.value);
//               }}
//             >
//               USD
//             </BuyInputSection>
//           )}

//           {isSwap && isLimit && swapRatio && (
//             <BuyInputSection
//               topLeftLabel={t`Price`}
//               topRightValue={formatAmount(swapRatio.markRatio, USD_DECIMALS, 4)}
//               onClickTopRightLabel={() => {
//                 swapRatio.setInputValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 10));
//               }}
//               inputValue={swapRatio.inputValue}
//               onInputValueChange={(e) => {
//                 swapRatio.setInputValue(e.target.value);
//               }}
//             >
//               {swapRatio.biggestSide === "from"
//                 ? `${toTokenInput.token?.symbol} per ${fromTokenInput.token?.symbol}`
//                 : `${fromTokenInput.token?.symbol} per ${toTokenInput.token?.symbol}`}
//             </BuyInputSection>
//           )}
//         </div>

//         <div className="SwapBox-info-section">
//           {isPosition && (
//             <>
//               {!isTrigger && (
//                 <>
//                   <div className="Exchange-leverage-slider-settings">
//                     <Checkbox isChecked={isLeverageEnabled} setIsChecked={setIsLeverageEnabled}>
//                       <span className="muted">
//                         <Trans>Leverage slider</Trans>
//                       </span>
//                     </Checkbox>
//                   </div>
//                   {isLeverageEnabled && (
//                     <LeverageSlider value={leverageOption} onChange={setLeverageOption} isPositive={isLong} />
//                   )}
//                 </>
//               )}

//               <InfoRow
//                 label={t`Market`}
//                 className="SwapBox-info-row SwapBox-market-selector"
//                 value={
//                   isTrigger ? (
//                     <Dropdown
//                       selectedOption={
//                         p.selectedMarketAddress
//                           ? marketOptions.find((o) => o.value === p.selectedMarketAddress)
//                           : undefined
//                       }
//                       placeholder={t`Select a market`}
//                       options={marketOptions}
//                       onSelect={(option) => {
//                         p.onSelectMarketAddress(option.value);
//                       }}
//                     />
//                   ) : selectedMarket ? (
//                     `${getTokenData(tokensData, selectedMarket?.indexTokenAddress, "native")?.symbol}/${
//                       selectedMarket?.perp
//                     }`
//                   ) : (
//                     "..."
//                   )
//                 }
//               />

//               {collateralTokenAddress && availableCollaterals && (
//                 <InfoRow
//                   label={t`Collateral In`}
//                   className="SwapBox-info-row"
//                   value={
//                     <TokenSelector
//                       label={t`Collateral In`}
//                       className="GlpSwap-from-token"
//                       chainId={chainId}
//                       tokenAddress={collateralTokenAddress}
//                       onSelectToken={(token) => {
//                         p.onSelectCollateralAddress(token.address);
//                         setCollateralTokenAddress(token.address);
//                       }}
//                       tokens={availableCollaterals}
//                       showTokenImgInDropdown={true}
//                     />
//                   }
//                 />
//               )}

//               {isTrigger && existingPosition?.leverage && (
//                 <div className="Exchange-leverage-slider-settings">
//                   <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
//                     <span className="muted font-sm">
//                       <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)} </Trans>
//                     </span>
//                   </Checkbox>
//                 </div>
//               )}

//               <div className="App-card-divider" />
//             </>
//           )}

//           {isPosition && !isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Leverage`}
//               value={leverageOption ? `${leverageOption.toFixed(2)}x` : "..."}
//             />
//           )}

//           {isPosition && isTrigger && !keepLeverage && existingPosition?.leverage && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Leverage`}
//               value={
//                 nextSizeUsd?.gt(0) ? (
//                   <ValueTransition
//                     from={formatLeverage(existingPosition.leverage)}
//                     to={nextLeverage ? formatLeverage(nextLeverage) : "..."}
//                   />
//                 ) : (
//                   "..."
//                 )
//               }
//             />
//           )}

//           {isPosition && isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
//               value={
//                 existingPosition?.sizeInUsd ? (
//                   <ValueTransition from={formatUsd(existingPosition.sizeInUsd)!} to={formatUsd(nextSizeUsd)} />
//                 ) : closeSizeUsd ? (
//                   formatUsd(closeSizeUsd)
//                 ) : (
//                   "..."
//                 )
//               }
//             />
//           )}

//           {isPosition && isTrigger && existingPosition && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Collateral (${existingPosition?.collateralToken?.symbol})`}
//               value={
//                 <ValueTransition from={formatUsd(existingPosition.collateralUsd)!} to={formatUsd(nextCollateralUsd)} />
//               }
//             />
//           )}

//           {isPosition && isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Mark Price`}
//               value={markPrice ? formatUsd(markPrice) : "..."}
//             />
//           )}

//           {isPosition && isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Trigger Price`}
//               value={triggerPrice ? `${triggerPricePrefix}${formatUsd(triggerPrice)}` : "..."}
//             />
//           )}

//           {isPosition && !isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Entry Price`}
//               value={entryPrice ? formatUsd(entryPrice) : "..."}
//             />
//           )}

//           {isPosition && !isTrigger && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Liq. Price`}
//               value={
//                 existingPosition?.liqPrice ? (
//                   <ValueTransition
//                     from={formatUsd(existingPosition.liqPrice)!}
//                     to={nextLiqPrice ? formatUsd(nextLiqPrice) : undefined}
//                   />
//                 ) : nextLiqPrice ? (
//                   formatUsd(nextLiqPrice)
//                 ) : (
//                   "..."
//                 )
//               }
//             />
//           )}

//           {isPosition && isTrigger && existingPosition && (
//             <InfoRow
//               className="SwapBox-info-row"
//               label={t`Liq. Price`}
//               value={
//                 nextSizeUsd?.gt(0) ? (
//                   <ValueTransition
//                     from={formatUsd(existingPosition.liqPrice)!}
//                     to={nextLiqPrice ? formatUsd(nextLiqPrice) : undefined}
//                   />
//                 ) : (
//                   "..."
//                 )
//               }
//             />
//           )}

//           <TradeFees
//             totalFee={fees?.totalFee}
//             positionFee={fees?.positionFee}
//             swapFees={fees?.swapFees}
//             positionPriceImpact={fees?.positionPriceImpact}
//           />
//         </div>

//         {fees && fees.isHighPriceImpact && (
//           <div className="SwapBox-warnings">
//             <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
//               <span className="muted font-sm">
//                 <Trans>I am aware of the high price impact</Trans>
//               </span>
//             </Checkbox>
//           </div>
//         )}

//         <div className="Exchange-swap-button-container">
//           <SubmitButton
//             authRequired
//             onConnectWallet={p.onConnectWallet}
//             onClick={submitButtonState.onClick}
//             disabled={submitButtonState.disabled}
//           >
//             {submitButtonState.text}
//           </SubmitButton>
//         </div>
//       </div>

//       <div className="SwapBox-section">
//         {isSwap &&
//           fromTokenInput.tokenAddress &&
//           toTokenInput.tokenAddress &&
//           swapRoute.mostLiquidMarketAddressForSwap && (
//             <SwapCard
//               fromTokenAddress={fromTokenInput.tokenAddress}
//               toTokenAddress={toTokenInput.tokenAddress}
//               swapPath={swapRoute.swapPath || []}
//               mostAbundantMarketAddress={swapRoute.mostLiquidMarketAddressForSwap}
//             />
//           )}

//         {isPosition && (swapRoute.positionMarketAddress || p.selectedMarketAddress) && (
//           <MarketCard isLong={isLong} marketAddress={swapRoute.positionMarketAddress! || p.selectedMarketAddress!} />
//         )}
//       </div>

//       {isConfirming && (
//         <ConfirmationBox
//           fromTokenAddress={fromTokenInput.tokenAddress!}
//           fromTokenAmount={fromTokenInput.tokenAmount}
//           fromTokenPrice={fromTokenInput.price}
//           toTokenAddress={toTokenInput.tokenAddress!}
//           toTokenAmount={toTokenInput.tokenAmount}
//           toTokenPrice={toTokenInput.price}
//           collateralTokenAddress={collateralTokenAddress}
//           selectedMarketAddress={p.selectedMarketAddress}
//           collateralDeltaAmount={collateralDeltaAmount}
//           triggerPricePrefix={triggerPricePrefix}
//           triggerPrice={triggerPrice}
//           entryPrice={entryPrice}
//           existingPosition={existingPosition}
//           markPrice={markPrice}
//           nextLiqPrice={nextLiqPrice}
//           swapTriggerRatio={swapRatio?.ratio}
//           nextLeverage={nextLeverage}
//           keepLeverage={keepLeverage}
//           nextSizeUsd={nextSizeUsd}
//           nextCollateralUsd={nextCollateralUsd}
//           acceptablePrice={toTokenInput.price!}
//           closeSizeUsd={closeSizeUsd}
//           sizeDeltaUsd={sizeDeltaUsd}
//           collateralDeltaUsd={collateralDeltaUsd}
//           receiveToken={receiveToken}
//           receiveTokenAmount={receiveTokenAmount}
//           receiveUsd={receiveUsd}
//           // fees={fees}
//           fees={fees as any}
//           swapRoute={swapRoute}
//           mode={modeTab!}
//           operationType={operationTab!}
//           onSubmitted={() => {
//             setIsConfirming(false);
//             if (isMarket) {
//               setIsProcessing(true);
//             }
//           }}
//           onClose={() => setIsConfirming(false)}
//           setKeepLeverage={setKeepLeverage}
//         />
//       )}

//       {isProcessing && (
//         <OrderStatus
//           orderType={isSwap ? OrderType.MarketSwap : OrderType.MarketIncrease}
//           marketAddress={swapRoute?.positionMarketAddress}
//           initialCollateralAddress={isSwap ? fromTokenInput.tokenAddress : undefined}
//           initialCollateralAmount={isSwap ? fromTokenInput.tokenAmount : undefined}
//           toSwapTokenAddress={isSwap ? toTokenInput.tokenAddress : undefined}
//           sizeDeltaUsd={sizeDeltaUsd}
//           isLong={isSwap ? undefined : isLong}
//           onClose={() => setIsProcessing(false)}
//         />
//       )}
//     </>
//   );
// }
// import React from "react";
