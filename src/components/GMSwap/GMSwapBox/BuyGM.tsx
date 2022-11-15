import { t } from "@lingui/macro";
import arrowIcon from "img/ic_convert_down.svg";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import glp24Icon from "img/ic_glp_24.svg";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";
import { Mode, OperationType } from "./constants";
import TokenSelector from "components/Exchange/TokenSelector";
import { useChainId } from "lib/chains";
import { getTokenAmountFromUsd, getTokenInfo, getUsd, InfoTokens, Token, TokenInfo } from "domain/tokens";

type Props = {
  onSwapArrowClick: () => void;
  mode: Mode;
  operationType: OperationType;
  infoTokens: InfoTokens;
  availableTokens: Token[];
};

enum FocusInputId {
  swapFirst = "swapFirst",
  swapSecond = "swapSecod",
  gm = "gm",
}

function formatTokenBalance(tokenInfo: TokenInfo) {
  const balance = tokenInfo && tokenInfo.balance ? tokenInfo.balance : bigNumberify(0);
  return `${formatAmount(balance, tokenInfo.decimals, 4, true)}`;
}

export function BuyGM(p: Props) {
  const { chainId } = useChainId();

  const [swapInputValue, setSwapInputValue] = useState<{ first?: string; second?: string }>({
    first: undefined,
    second: undefined,
  });
  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();

  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>(p.availableTokens[0].address);
  const [GMInputValue, setGMInputValue] = useState<string | undefined>();

  const swapTokensInfo = {
    first: getTokenInfo(p.infoTokens, selectedTokenAddress || p.availableTokens[0].address),
    second: getTokenInfo(p.infoTokens, p.availableTokens[1].address),
  };

  const swapTokensAmount = {
    first: parseValue(swapInputValue.first || "0", swapTokensInfo.first.decimals)!,
    second: parseValue(swapInputValue.second || "0", swapTokensInfo.second.decimals)!,
  };

  const swapTokensAmountUsd = {
    first: getUsd(swapTokensAmount.first, swapTokensInfo.first.address, false, p.infoTokens) || bigNumberify(0)!,
    second: getUsd(swapTokensAmount.second, swapTokensInfo.second.address, false, p.infoTokens) || bigNumberify(0)!,
  };

  const gmAmount = parseValue(GMInputValue || "0", GM_DECIMALS)!;
  const gmPrice = parseValue("100", USD_DECIMALS)!;
  const gmAmountUsd = gmAmount.mul(gmPrice).div(expandDecimals(1, GM_DECIMALS));

  useEffect(
    function onModeChangedEff() {
      if (p.mode === Mode.single && swapInputValue.second) {
        setSwapInputValue((val) => ({ ...val, second: undefined }));
        setFocusedInput(FocusInputId.swapFirst);
      }
    },
    [p.mode, swapInputValue.second]
  );

  useEffect(
    function onSwapValuesChangedEff() {
      if ([FocusInputId.swapFirst, FocusInputId.swapSecond].includes(focusedInput!)) {
        const swapSumUsd = swapTokensAmountUsd.first.add(swapTokensAmountUsd.second);
        const newGmAmount = swapSumUsd.mul(expandDecimals(1, GM_DECIMALS)).div(gmPrice);

        const nextValue = formatAmountFree(newGmAmount, GM_DECIMALS, GM_DECIMALS);
        setGMInputValue(nextValue);
        return;
      }

      if (focusedInput === FocusInputId.gm) {
        if (p.mode === Mode.pair) {
          let firstShare;
          let secondShare;

          if (!swapTokensAmountUsd.first.gt(0)) {
            firstShare = bigNumberify(0);
            secondShare = bigNumberify(1);
          } else if (!swapTokensAmountUsd.second.gt(0)) {
            firstShare = bigNumberify(1);
            secondShare = bigNumberify(0);
          } else {
            const swapTokensRatio = swapTokensAmountUsd.first.div(swapTokensAmountUsd.second);

            firstShare = swapTokensRatio.gt(1)
              ? bigNumberify(1)!.sub(bigNumberify(1)!.div(swapTokensRatio))
              : swapTokensRatio;

            secondShare = swapTokensRatio.gt(1) ? bigNumberify(1)!.sub(swapTokensRatio) : swapTokensRatio;
          }

          const newFirstUsd = gmAmountUsd.mul(firstShare);
          const newSecondUsd = gmAmountUsd.mul(secondShare);

          const newFirstAmount = getTokenAmountFromUsd(p.infoTokens, swapTokensInfo.first.address, newFirstUsd)!;
          const newSecondAmount = getTokenAmountFromUsd(p.infoTokens, swapTokensInfo.second.address, newSecondUsd)!;

          const nextFirstValue = formatAmountFree(
            newFirstAmount,
            swapTokensInfo.first.decimals,
            swapTokensInfo.first.decimals
          );

          const nextSecondtValue = formatAmountFree(
            newSecondAmount,
            swapTokensInfo.second.decimals,
            swapTokensInfo.second.decimals
          );

          if (swapInputValue.first !== nextFirstValue) {
            setSwapInputValue({ first: nextFirstValue, second: nextSecondtValue });
          }
        } else {
          const newSwapTokenAmount = getTokenAmountFromUsd(p.infoTokens, selectedTokenAddress, gmAmountUsd)!;

          const nextValue = formatAmountFree(
            newSwapTokenAmount,
            swapTokensInfo.first.decimals,
            swapTokensInfo.first.decimals
          );

          if (swapInputValue.first !== nextValue) {
            setSwapInputValue({ first: nextValue });
          }

          return;
        }
      }
    },
    [
      p.infoTokens,
      gmAmountUsd,
      gmPrice,
      swapTokensAmountUsd.first,
      swapTokensAmountUsd.second,
      focusedInput,
      p.mode,
      swapTokensAmount.first,
      swapTokensAmount.second,
      selectedTokenAddress,
      swapTokensInfo.first.decimals,
      gmAmount,
      swapInputValue.first,
      swapTokensInfo.first.address,
      swapTokensInfo.second.address,
      swapTokensInfo.second.decimals,
    ]
  );

  return p.operationType === OperationType.deposit ? (
    <>
      <BuyInputSection
        topLeftLabel={t`Pay`}
        topRightLabel={t`Balance:`}
        tokenBalance={formatTokenBalance(swapTokensInfo.first)}
        inputValue={swapInputValue.first}
        onInputValueChange={(e) => {
          setFocusedInput(FocusInputId.swapFirst);
          setSwapInputValue((val) => ({ ...val, first: e.target.value }));
        }}
        showMaxButton={false}
        onClickTopRightLabel={() => null}
        onClickMax={() => null}
        balance={`$${formatAmount(swapTokensAmountUsd.first, USD_DECIMALS, 2, true)}`}
      >
        {p.mode === Mode.single ? (
          <TokenSelector
            label={t`Pay`}
            chainId={chainId}
            tokenAddress={selectedTokenAddress}
            onSelectToken={(token) => setSelectedTokenAddress(token.address)}
            tokens={p.availableTokens}
            infoTokens={p.infoTokens}
            className="GlpSwap-from-token"
            showSymbolImage={true}
            showTokenImgInDropdown={true}
          />
        ) : (
          <div className="selected-token">{p.availableTokens[0].symbol}</div>
        )}
      </BuyInputSection>

      {p.mode === Mode.pair && (
        <BuyInputSection
          topLeftLabel={t`Pay`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenBalance(swapTokensInfo.second)}
          inputValue={swapInputValue.second}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.swapSecond);
            setSwapInputValue((val) => ({ ...val, second: e.target.value }));
          }}
          showMaxButton={false}
          onClickTopRightLabel={() => null}
          onClickMax={() => null}
          balance={`$${formatAmount(swapTokensAmountUsd.second, USD_DECIMALS, 2, true)}`}
        >
          <div className="selected-token">{p.availableTokens[1].symbol}</div>
        </BuyInputSection>
      )}

      <div className="AppOrder-ball-container">
        <div className="AppOrder-ball">
          <img src={arrowIcon} alt="arrowIcon" onClick={p.onSwapArrowClick} />
        </div>
      </div>

      <div className={p.mode === Mode.pair ? "disabled" : ""}>
        <BuyInputSection
          topLeftLabel={t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={`${formatAmount(bigNumberify(1000), GM_DECIMALS, 4, true)}`}
          inputValue={GMInputValue}
          onInputValueChange={(e) => {
            if (p.mode === Mode.pair) return;
            setFocusedInput(FocusInputId.gm);
            setGMInputValue(e.target.value);
          }}
          balance={`$${formatAmount(gmAmountUsd, USD_DECIMALS, 2, true)}`}
        >
          <div className="selected-token">
            GM <img src={glp24Icon} alt="glp24Icon" />
          </div>
        </BuyInputSection>
      </div>
    </>
  ) : (
    <>
      <div className={p.mode === Mode.pair ? "disabled" : ""}>
        <BuyInputSection
          topLeftLabel={t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={`${formatAmount(bigNumberify(1000), GM_DECIMALS, 4, true)}`}
          inputValue={GMInputValue}
          onInputValueChange={(e) => {
            if (p.mode === Mode.pair) return;
            setFocusedInput(FocusInputId.gm);
            setGMInputValue(e.target.value);
          }}
          balance={`$${formatAmount(gmAmountUsd, USD_DECIMALS, 2, true)}`}
        >
          <div className="selected-token">
            GM <img src={glp24Icon} alt="glp24Icon" />
          </div>
        </BuyInputSection>
      </div>

      <div className="AppOrder-ball-container">
        <div className="AppOrder-ball">
          <img src={arrowIcon} alt="arrowIcon" onClick={p.onSwapArrowClick} />
        </div>
      </div>

      <BuyInputSection
        topLeftLabel={t`Receive`}
        topRightLabel={t`Balance:`}
        tokenBalance={formatTokenBalance(swapTokensInfo.first)}
        inputValue={swapInputValue.first}
        onInputValueChange={(e) => {
          setFocusedInput(FocusInputId.swapFirst);
          setSwapInputValue((val) => ({ ...val, first: e.target.value }));
        }}
        showMaxButton={false}
        onClickTopRightLabel={() => null}
        onClickMax={() => null}
        balance={`$${formatAmount(swapTokensAmountUsd.first, USD_DECIMALS, 2, true)}`}
      >
        {p.mode === Mode.single ? (
          <TokenSelector
            label={t`Pay`}
            chainId={chainId}
            tokenAddress={selectedTokenAddress}
            onSelectToken={(token) => setSelectedTokenAddress(token.address)}
            tokens={p.availableTokens}
            infoTokens={p.infoTokens}
            className="GlpSwap-from-token"
            showSymbolImage={true}
            showTokenImgInDropdown={true}
          />
        ) : (
          <div className="selected-token">{p.availableTokens[0].symbol}</div>
        )}
      </BuyInputSection>

      {p.mode === Mode.pair && (
        <BuyInputSection
          topLeftLabel={t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenBalance(swapTokensInfo.second)}
          inputValue={swapInputValue.second}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.swapSecond);
            setSwapInputValue((val) => ({ ...val, second: e.target.value }));
          }}
          showMaxButton={false}
          onClickTopRightLabel={() => null}
          onClickMax={() => null}
          balance={`$${formatAmount(swapTokensAmountUsd.second, USD_DECIMALS, 2, true)}`}
        >
          <div className="selected-token">{p.availableTokens[1].symbol}</div>
        </BuyInputSection>
      )}
    </>
  );
}
