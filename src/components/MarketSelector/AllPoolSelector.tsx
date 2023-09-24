import { t } from "@lingui/macro";
import cx from "classnames";
import { MarketInfo, MarketsInfoData, getMarketIndexName } from "domain/synthetics/markets";
import { TokensData, convertToUsd } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { importImage } from "lib/legacy";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { ReactNode, useMemo, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import Modal from "../Modal/Modal";
import TooltipWithPortal from "../Tooltip/TooltipWithPortal";
import "./MarketSelector.scss";
import SearchInput from "components/SearchInput/SearchInput";
import TokenIcon from "components/TokenIcon/TokenIcon";

type Props = {
  label?: string;
  className?: string;
  selectedMarketAddress?: string;
  selectedIndexName?: string;
  markets: MarketInfo[];
  marketsInfoData?: MarketsInfoData;
  marketTokensData?: TokensData;
  disabled?: boolean;
  showBalances?: boolean;
  selectedMarketLabel?: ReactNode | string;
  isSideMenu?: boolean;
  getMarketState?: (market: MarketInfo) => MarketState | undefined;
  onSelectMarket: (market: MarketInfo) => void;
};

type MarketState = {
  disabled?: boolean;
  message?: string;
};

type MarketOption = {
  name: string;
  marketInfo: MarketInfo;
  balance: BigNumber;
  balanceUsd: BigNumber;
  state?: MarketState;
};

export function AllPoolSelector({
  selectedMarketAddress,
  className,
  selectedMarketLabel,
  selectedIndexName,
  label,
  markets,
  isSideMenu,
  marketTokensData,
  showBalances,
  onSelectMarket,
  getMarketState,
}: Props) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  const marketsOptions: MarketOption[] = useMemo(() => {
    return markets
      .filter((market) => !market.isDisabled)
      .map((marketInfo) => {
        const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);
        const gmBalance = marketToken?.balance;
        const gmBalanceUsd = convertToUsd(marketToken?.balance, marketToken?.decimals, marketToken?.prices.minPrice);
        const state = getMarketState?.(marketInfo);

        return {
          name: marketInfo.name,
          marketInfo,
          balance: gmBalance || BigNumber.from(0),
          balanceUsd: gmBalanceUsd || BigNumber.from(0),
          state,
        };
      });
  }, [getMarketState, marketTokensData, markets]);

  const marketInfo = marketsOptions.find(
    (option) => option.marketInfo.marketTokenAddress === selectedMarketAddress
  )?.marketInfo;

  const filteredOptions = marketsOptions.filter((option) => {
    return option.name.toLowerCase().indexOf(searchKeyword.toLowerCase()) > -1;
  });

  function onSelectOption(option: MarketOption) {
    onSelectMarket(option.marketInfo);
    setIsModalVisible(false);
  }

  const _handleKeyDown = (e) => {
    if (e.key === "Enter" && filteredOptions.length > 0) {
      onSelectOption(filteredOptions[0]);
    }
  };

  function displayPoolLabel(marketInfo: MarketInfo | undefined) {
    if (!marketInfo) return "...";
    const marketIndexName = getMarketIndexName(marketInfo);

    if (filteredOptions?.length > 1) {
      return (
        <div className="TokenSelector-box" onClick={() => setIsModalVisible(true)}>
          {marketIndexName ? `GM ${marketIndexName}` : "..."}
          <BiChevronDown className="TokenSelector-caret" />
        </div>
      );
    }

    return <div>{marketIndexName ? `GM ${marketIndexName}` : "..."}</div>;
  }

  return (
    <div className={cx("TokenSelector", "MarketSelector", { "side-menu": isSideMenu }, className)}>
      <Modal
        isVisible={isModalVisible}
        setIsVisible={setIsModalVisible}
        label={label}
        headerContent={() => (
          <SearchInput
            className="mt-md"
            value={searchKeyword}
            setValue={(e) => setSearchKeyword(e.target.value)}
            placeholder={t`Search Pool`}
            onKeyDown={_handleKeyDown}
          />
        )}
      >
        <div className="TokenSelector-tokens">
          {filteredOptions.map((option, marketIndex) => {
            const { marketInfo, balance, balanceUsd, name, state = {} } = option;

            const indexTokenImage = importImage(`ic_${marketInfo.indexToken.symbol.toLowerCase()}_40.svg`);

            const marketToken = getByKey(marketTokensData, marketInfo.marketTokenAddress);

            return (
              <div
                key={name}
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
                  <div className="collaterals-logo">
                    <img src={indexTokenImage} alt={name} className="collateral-logo collateral-logo-first" />
                  </div>
                  <div className="Token-symbol">
                    <div className="Token-text">{name}</div>
                  </div>
                </div>
                <div className="Token-balance">
                  {showBalances && balance && (
                    <div className="Token-text">
                      {balance.gt(0) &&
                        formatTokenAmount(balance, marketToken?.decimals, "GM", {
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

      <span className="inline-items-center TokenSelector-box" onClick={() => setIsModalVisible(true)}>
        {marketInfo && (
          <>
            <TokenIcon className="mr-xs" symbol={marketInfo?.indexToken.symbol} importSize={24} displaySize={20} />
            {displayPoolLabel(marketInfo)}
          </>
        )}
      </span>
    </div>
  );
}
