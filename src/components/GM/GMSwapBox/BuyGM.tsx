import { t } from "@lingui/macro";
import arrowIcon from "img/ic_convert_down.svg";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { GM_DECIMALS, PRECISION, USD_DECIMALS } from "lib/legacy";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";
import { Mode, OperationType } from "./constants";
import TokenSelector from "components/Exchange/TokenSelector";
import { useChainId } from "lib/chains";
import { getTokenAmountFromUsd, getTokenInfo, getUsd, InfoTokens, Token } from "domain/tokens";
import { BigNumber } from "ethers";

type Props = {
  onSwapArrowClick: () => void;
  mode: Mode;
  operationType: OperationType;
  infoTokens: InfoTokens;
  availableTokens: Token[];
  onAmountsChange: (p: { longAmountUsd?: BigNumber; shortAmountUsd?: BigNumber }) => void;
};

enum FocusInputId {
  swapFirst = "swapFirst",
  swapSecond = "swapSecod",
  gm = "gm",
}

// TODO
export function useGmTokenState() {
  const [inputValue, setInputValue] = useState<string | undefined>();

  const gmPrice = parseValue("100", USD_DECIMALS)!;

  const tokenAmount = parseValue(inputValue || "0", GM_DECIMALS) || BigNumber.from(0);
  const usdAmount = tokenAmount.mul(gmPrice).div(expandDecimals(1, GM_DECIMALS));
  const balance = bigNumberify(0);

  const tokenAmountFormatted = formatAmount(tokenAmount, GM_DECIMALS, 4);
  const usdAmountFormatted = `${formatAmount(usdAmount, USD_DECIMALS, 2, true)}`;
  const balanceFormatted = formatAmount(balance, GM_DECIMALS, 4);

  return {
    inputValue: inputValue !== "0" ? inputValue : undefined,
    setInputValue,
    tokenAmount,
    usdAmount,
    balance,
    gmPrice,
    tokenAmountFormatted,
    usdAmountFormatted,
    balanceFormatted,
  };
}

function useSwapTokenState(infoTokens: InfoTokens, initial: { tokenAddress?: string } = {}) {
  const [inputValue, setInputValue] = useState<string | undefined>();
  const [tokenAddress, setTokenAddress] = useState<string | undefined>(initial.tokenAddress);

  if (!tokenAddress) {
    return {
      info: undefined,
      inputValue: inputValue !== "0" ? inputValue : undefined,
      setInputValue,
      setTokenAddress,
      tokenAmount: BigNumber.from(0),
      usdAmount: BigNumber.from(0),
      balance: BigNumber.from(0),
      tokenAmountFormatted: formatAmount(BigNumber.from(0), 4, 4),
      usdAmountFormatted: formatAmount(BigNumber.from(0), 2, 2, true),
      balanceFormatted: formatAmount(BigNumber.from(0), 4, 4),
    };
  }

  const info = getTokenInfo(infoTokens, tokenAddress);

  const tokenAmount = parseValue(inputValue || "0", info.decimals) || BigNumber.from(0);
  const usdAmount = getUsd(tokenAmount, tokenAddress, false, infoTokens) || BigNumber.from(0);
  const balance = info.balance;

  const tokenAmountFormatted = formatAmount(tokenAmount, info.decimals, 4);
  const usdAmountFormatted = `${formatAmount(usdAmount, USD_DECIMALS, 2, true)}`;
  const balanceFormatted = formatAmount(balance, info.decimals, 4);

  return {
    inputValue: inputValue !== "0" ? inputValue : undefined,
    setInputValue,
    setTokenAddress,
    info,
    tokenAddress,
    tokenAmount,
    usdAmount,
    balance,
    tokenAmountFormatted,
    usdAmountFormatted,
    balanceFormatted,
  };
}

export function BuyGM(p: Props) {
  const { chainId } = useChainId();

  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();
  const firstTokenState = useSwapTokenState(p.infoTokens, { tokenAddress: p.availableTokens[0].address });
  const secondTokenState = useSwapTokenState(p.infoTokens);
  const gmTokenState = useGmTokenState();

  useEffect(
    function updateInputsByModeEff() {
      if (p.mode === Mode.pair && !secondTokenState.tokenAddress) {
        const secondToken = p.availableTokens.filter((token) => token.address !== firstTokenState.tokenAddress)[0];

        secondTokenState.setTokenAddress(secondToken.address);
      } else if (p.mode === Mode.single && secondTokenState.tokenAddress) {
        secondTokenState.setInputValue(undefined);
        secondTokenState.setTokenAddress(undefined);
      }
    },
    [firstTokenState.tokenAddress, p.availableTokens, p.mode, secondTokenState]
  );

  // const [firstTokenInput, setFirstTokenInput] = useState<TokenInputState>({});
  // const [secondTokenInput, setSecondTokenInput] = useState<TokenInputState>({});

  // const swapTokensInfo = {
  //   first: getTokenInfo(p.infoTokens, selectedTokenAddress || p.availableTokens[0].address),
  //   second: getTokenInfo(p.infoTokens, p.availableTokens[1].address),
  // };

  // const swapTokensAmount = {
  //   first: parseValue(swapInputValue.first || "0", swapTokensInfo.first.decimals)!,
  //   second: parseValue(swapInputValue.second || "0", swapTokensInfo.second.decimals)!,
  // };

  // const swapTokensAmountUsd = {
  //   first: getUsd(swapTokensAmount.first, swapTokensInfo.first.address, false, p.infoTokens) || bigNumberify(0)!,
  //   second: getUsd(swapTokensAmount.second, swapTokensInfo.second.address, false, p.infoTokens) || bigNumberify(0)!,
  // };

  // const gmAmount = parseValue(GMInputValue || "0", GM_DECIMALS)!;
  // const gmPrice = parseValue("100", USD_DECIMALS)!;
  // const gmAmountUsd = gmAmount.mul(gmPrice).div(expandDecimals(1, GM_DECIMALS));

  const setGmValue = gmTokenState.setInputValue;
  const setFirstTokenValue = firstTokenState.setInputValue;
  const setSecondTokenValue = secondTokenState.setInputValue;

  useEffect(
    function syncInputValuesEff() {
      if (!focusedInput) return;

      if ([FocusInputId.swapFirst, FocusInputId.swapSecond].includes(focusedInput)) {
        const swapSumUsd = firstTokenState.usdAmount.add(secondTokenState.usdAmount);
        const nextGmAmount = swapSumUsd.div(gmTokenState.gmPrice).mul(expandDecimals(1, GM_DECIMALS));

        console.log(Number(nextGmAmount));

        const nextGmInputValue = formatAmountFree(nextGmAmount, GM_DECIMALS, GM_DECIMALS);

        if (gmTokenState.inputValue !== nextGmInputValue) {
          setGmValue(nextGmInputValue);
        }

        return;
      }

      if (focusedInput === FocusInputId.gm) {
        if (p.mode === Mode.single && firstTokenState.tokenAddress) {
          const newSwapTokenAmount = getTokenAmountFromUsd(
            p.infoTokens,
            firstTokenState.tokenAddress,
            gmTokenState.usdAmount
          )!;

          const nextTokenValue = formatAmountFree(
            newSwapTokenAmount,
            firstTokenState.info.decimals,
            firstTokenState.info.decimals
          );

          if (firstTokenState.inputValue !== nextTokenValue) {
            setFirstTokenValue(nextTokenValue);
          }

          return;
        }

        if (p.mode === Mode.pair && firstTokenState.tokenAddress && secondTokenState.tokenAddress) {
          const biggestToken = firstTokenState.usdAmount.gt(secondTokenState.usdAmount)
            ? firstTokenState
            : secondTokenState;

          const lowestToken = firstTokenState.usdAmount.lte(secondTokenState.usdAmount)
            ? firstTokenState
            : secondTokenState;

          const ratio = biggestToken.usdAmount.div(lowestToken.usdAmount || bigNumberify(1));

          const lowestUsd = gmTokenState.usdAmount.mul(PRECISION).div(ratio);
          const bigestUsd = gmTokenState.usdAmount.sub(lowestUsd.div(PRECISION));

          const nextBiggestTokenAmount = getTokenAmountFromUsd(p.infoTokens, biggestToken.tokenAddress, bigestUsd)!;
          const nextLowestTokenAmount = getTokenAmountFromUsd(p.infoTokens, lowestToken.tokenAddress, lowestUsd)!;

          const nextBiggestTokenValue = formatAmountFree(
            nextBiggestTokenAmount,
            biggestToken.info.decimals,
            biggestToken.info.decimals
          );

          const nextLowestTokenValue = formatAmountFree(
            nextLowestTokenAmount,
            lowestToken.info.decimals,
            lowestToken.info.decimals
          );

          if (biggestToken.inputValue !== nextBiggestTokenValue && lowestToken.inputValue !== nextLowestTokenValue) {
            biggestToken.setInputValue(nextBiggestTokenValue);
            lowestToken.setInputValue(nextBiggestTokenValue);
          }

          return;
        }
      }
    },
    [
      firstTokenState.inputValue,
      secondTokenState.inputValue,
      gmTokenState.inputValue,
      focusedInput,
      firstTokenState.usdAmount,
      secondTokenState.usdAmount,
      gmTokenState.gmPrice,
      setGmValue,
      setFirstTokenValue,
      setSecondTokenValue,
      p.mode,
      firstTokenState,
      secondTokenState,
      gmTokenState.usdAmount,
      p.infoTokens,
    ]
  );

  // useEffect(
  //   function onSwapValuesChangedEff() {
  //     if ([FocusInputId.swapFirst, FocusInputId.swapSecond].includes(focusedInput!)) {
  //       const swapSumUsd = swapTokensAmountUsd.first.add(swapTokensAmountUsd.second);
  //       const newGmAmount = swapSumUsd.mul(expandDecimals(1, GM_DECIMALS)).div(gmPrice);

  //       const nextValue = formatAmountFree(newGmAmount, GM_DECIMALS, GM_DECIMALS);
  //       setGMInputValue(nextValue);
  //       return;
  //     }

  //     if (focusedInput === FocusInputId.gm) {
  //       if (p.mode === Mode.pair) {
  //         let firstShare;
  //         let secondShare;

  //         if (!swapTokensAmountUsd.first.gt(0)) {
  //           firstShare = bigNumberify(0);
  //           secondShare = bigNumberify(1);
  //         } else if (!swapTokensAmountUsd.second.gt(0)) {
  //           firstShare = bigNumberify(1);
  //           secondShare = bigNumberify(0);
  //         } else {
  //           const swapTokensRatio = swapTokensAmountUsd.first.div(swapTokensAmountUsd.second);

  //           firstShare = swapTokensRatio.gt(1)
  //             ? bigNumberify(1)!.sub(bigNumberify(1)!.div(swapTokensRatio))
  //             : swapTokensRatio;

  //           secondShare = swapTokensRatio.gt(1) ? bigNumberify(1)!.sub(swapTokensRatio) : swapTokensRatio;
  //         }

  //         const newFirstUsd = gmAmountUsd.mul(firstShare);
  //         const newSecondUsd = gmAmountUsd.mul(secondShare);

  //         const newFirstAmount = getTokenAmountFromUsd(p.infoTokens, swapTokensInfo.first.address, newFirstUsd)!;
  //         const newSecondAmount = getTokenAmountFromUsd(p.infoTokens, swapTokensInfo.second.address, newSecondUsd)!;

  //         const nextFirstValue = formatAmountFree(
  //           newFirstAmount,
  //           swapTokensInfo.first.decimals,
  //           swapTokensInfo.first.decimals
  //         );

  //         const nextSecondtValue = formatAmountFree(
  //           newSecondAmount,
  //           swapTokensInfo.second.decimals,
  //           swapTokensInfo.second.decimals
  //         );

  //         if (swapInputValue.first !== nextFirstValue) {
  //           setSwapInputValue({ first: nextFirstValue, second: nextSecondtValue });
  //         }
  //       } else {
  //         const newSwapTokenAmount = getTokenAmountFromUsd(p.infoTokens, selectedTokenAddress, gmAmountUsd)!;

  //         const nextValue = formatAmountFree(
  //           newSwapTokenAmount,
  //           swapTokensInfo.first.decimals,
  //           swapTokensInfo.first.decimals
  //         );

  //         if (swapInputValue.first !== nextValue) {
  //           setSwapInputValue({ first: nextValue });
  //         }

  //         return;
  //       }
  //     }
  //   },
  //   [
  //     p.infoTokens,
  //     gmAmountUsd,
  //     gmPrice,
  //     swapTokensAmountUsd.first,
  //     swapTokensAmountUsd.second,
  //     focusedInput,
  //     p.mode,
  //     swapTokensAmount.first,
  //     swapTokensAmount.second,
  //     selectedTokenAddress,
  //     swapTokensInfo.first.decimals,
  //     gmAmount,
  //     swapInputValue.first,
  //     swapTokensInfo.first.address,
  //     swapTokensInfo.second.address,
  //     swapTokensInfo.second.decimals,
  //   ]
  // );

  // useEffect(
  //   function onAmountsChangeEff() {
  //     p.onAmountsChange({ longAmountUsd: swapTokensAmountUsd.first, shortAmountUsd: swapTokensAmountUsd.second });
  //   },
  //   [p.onAmountsChange, Number(swapTokensAmountUsd.first), Number(swapTokensAmountUsd.second)]
  // );

  return (
    <>
      {firstTokenState.tokenAddress && (
        <BuyInputSection
          topLeftLabel={p.operationType === OperationType.deposit ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={firstTokenState.balanceFormatted}
          inputValue={firstTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.swapFirst);
            firstTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
          onClickTopRightLabel={() => null}
          onClickMax={() => null}
          balance={firstTokenState.usdAmountFormatted}
        >
          {p.mode === Mode.single ? (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={firstTokenState.tokenAddress}
              onSelectToken={(token) => firstTokenState.setTokenAddress(token.address)}
              tokens={p.availableTokens}
              infoTokens={p.infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          ) : (
            <div className="selected-token">{firstTokenState.info?.symbol}</div>
          )}
        </BuyInputSection>
      )}

      {secondTokenState.tokenAddress && (
        <BuyInputSection
          topLeftLabel={p.operationType === OperationType.deposit ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={secondTokenState.balanceFormatted}
          inputValue={secondTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.swapSecond);
            secondTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
          onClickTopRightLabel={() => null}
          onClickMax={() => null}
          balance={secondTokenState.usdAmountFormatted}
        >
          <div className="selected-token">{secondTokenState.info?.symbol}</div>
        </BuyInputSection>
      )}

      <div className="AppOrder-ball-container">
        <div className="AppOrder-ball">
          <img src={arrowIcon} alt="arrowIcon" onClick={p.onSwapArrowClick} />
        </div>
      </div>

      <div className={p.mode === Mode.pair ? "disabled" : ""}>
        <BuyInputSection
          topLeftLabel={p.operationType === OperationType.withdraw ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={gmTokenState.balanceFormatted}
          inputValue={gmTokenState.inputValue}
          onInputValueChange={(e) => {
            if (p.mode === Mode.pair) return;

            setFocusedInput(FocusInputId.gm);
            gmTokenState.setInputValue(e.target.value);
          }}
          balance={gmTokenState.usdAmountFormatted}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>
    </>
  );
}
