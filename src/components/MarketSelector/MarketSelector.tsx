import { t } from "@lingui/macro";
import cx from "classnames";
import { MarketInfo, MarketsInfoData, getMarketIndexName } from "domain/synthetics/markets";
import { TokensData, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import searchIcon from "img/search.svg";
import { importImage } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { ReactNode, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";
import Modal from "../Modal/Modal";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import "./MarketSelector.scss";

type Props = {
  label?: string;
  className?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  disabled?: boolean;
  showBalances?: boolean;
  selectedMarketLabel?: ReactNode | string;
  isSideMenu?: boolean;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (indexName: string, market: MarketInfo) => void;
};

type MarketState = {
  disabled?: boolean;
  message?: string;
};

type MarketOption = {
  indexName: string;
  marketInfo: MarketInfo;
  balance: BigNumber;
  balanceUsd: BigNumber;
  state?: MarketState;
};

export function MarketSelector({
  selectedIndexName,
  className,
  selectedMarketLabel,
  label,
  markets,
  isSideMenu,
  marketTokensData,
  showBalances,
  onSelectMarket,
  getMarketState,
}: Props) {
  const isSmallerScreen = useMedia("(max-width: 700px)");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const marketsOptions: MarketOption[] = useMemo(() => {
    const optionsByIndexName: { [indexName: string]: MarketOption } = {};

    markets
      .filter((market) => !market.isDisabled)
      .forEach((marketInfo) => {
        const indexName = getMarketIndexName(marketInfo);
        const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);

        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(marketInfo);

        const option = optionsByIndexName[indexName];

        if (option) {
          option.balance = option.balance.add(gmBalance || BigNumber.from(0));
          option.balanceUsd = option.balanceUsd.add(gmBalanceUsd || BigNumber.from(0));
        }

        optionsByIndexName[indexName] = optionsByIndexName[indexName] || {
          indexName,
          marketInfo,
          balance: gmBalance || BigNumber.from(0),
          balanceUsd: gmBalanceUsd || BigNumber.from(0),
          state,
        };
      });

    return Object.values(optionsByIndexName);
  }, [getMarketState, marketTokensData, markets]);

  const marketInfo = marketsOptions.find((option) => option.indexName === selectedIndexName)?.marketInfo;

  const filteredOptions = marketsOptions.filter((option) => {
    return (
      option.indexName.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1 ||
      (!option.marketInfo.isSpotOnly &&
        option.marketInfo.indexToken.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1)
    );
  });

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.indexName, option.marketInfo);
    setIsModalVisible(false);
  }

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      onSelectOption(filteredOptions[0]);
    }
  };

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        headerContent={() => (
          <div className="TokenSelector-token-row TokenSelector-token-input-row">
            <input
              type="text"
              placeholder={t`Search Market`}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={_handleKeyDown}
              autoFocus={!isSmallerScreen}
              className="Tokenselector-search-input"
              style={{
                backgroundImage: `url(${searchIcon})`,
              }}
            />
          </div>
        )}
      >
        <div className="TokenSelector-tokens">
          {filteredOptions.map((option, marketIndex) => {
            const { marketInfo, balance, balanceUsd, indexName, state = {} } = option;
            const assetImage = importImage(
              `ic_${marketInfo.isSpotOnly ? "swap" : marketInfo.indexToken.symbol.toLowerCase()}_40.svg`
            );

            const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);

            return (
              <div
                key={indexName}
                className={cx("TokenSelector-token-row", { disabled: state.disabled })}
                onClick={() => !state.disabled && onSelectOption(option)}
              >
                {state.disabled && state.message && (
                  <TooltipWithPortal
                    className="TokenSelector-tooltip"
                    handle={<div className="TokenSelector-tooltip-backing" />}
                    position={marketIndex < filteredOptions.length / 2 ? "center-bottom" : "center-top"}
                    disableHandleStyle
                    closeOnDoubleClick
                    fitHandleWidth
                    renderContent={() => state.message}
                  />
                )}
                <div className="Token-info">
                  <img src={assetImage} alt={indexName} className="token-logo" />
                  <div className="Token-symbol">
                    <div className="Token-text">{indexName}</div>
                  </div>
                </div>
                <div className="Token-balance">
                  {showBalances && balance && (
                    <div className="Token-text">
                      {balance.gt(0) &&
                        formatTokenAmount(balance, marketToken?.decimals, "", {
                          useCommas: true,
                        })}
                      {balance.eq(0) && "-"}
                    </div>
                  )}
                  <span className="text-accent">
                    {showBalances && balanceUsd && balanceUsd.gt(0) && <div>{formatUsd(balanceUsd)}</div>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      {selectedMarketLabel ? (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {selectedMarketLabel}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      ) : (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {marketInfo ? getMarketIndexName(marketInfo) : "..."}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      )}
    </div>
  );
}
