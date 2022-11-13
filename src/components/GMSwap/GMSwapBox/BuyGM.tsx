import { t } from "@lingui/macro";
import arrowIcon from "img/ic_convert_down.svg";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import glp24Icon from "img/ic_glp_24.svg";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { bigNumberify, formatAmount, parseValue } from "lib/numbers";
import { useState } from "react";
import { Mode } from "./constants";
import TokenSelector from "components/Exchange/TokenSelector";
import { useChainId } from "lib/chains";
import { getTokenInfo, getUsd, InfoTokens, Token, TokenInfo } from "domain/tokens";

type Props = {
  onSwapArrowClick: () => void;
  mode: Mode;
  infoTokens: InfoTokens;
  availableTokens: Token[];
};

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
    first: getUsd(swapTokensAmount.first, swapTokensInfo.first.address, false, p.infoTokens),
    second: getUsd(swapTokensAmount.second, swapTokensInfo.second.address, false, p.infoTokens),
  };

  return (
    <>
      <BuyInputSection
        topLeftLabel={t`Pay`}
        topRightLabel={t`Balance:`}
        tokenBalance={formatTokenBalance(swapTokensInfo.first)}
        inputValue={swapInputValue.first}
        onInputValueChange={(e) => setSwapInputValue((val) => ({ ...val, first: e.target.value }))}
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
          onInputValueChange={(e) => setSwapInputValue((val) => ({ ...val, second: e.target.value }))}
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

      <BuyInputSection
        topLeftLabel={t`Receive`}
        topRightLabel={t`Balance:`}
        tokenBalance={`${formatAmount(bigNumberify(1000), GM_DECIMALS, 4, true)}`}
        inputValue={GMInputValue}
        onInputValueChange={(e) => setGMInputValue(e.target.value)}
        balance={"0.0$"}
      >
        <div className="selected-token">
          GM <img src={glp24Icon} alt="glp24Icon" />
        </div>
      </BuyInputSection>
    </>
  );
}
