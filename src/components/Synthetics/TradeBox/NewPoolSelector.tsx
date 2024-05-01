import { FloatingPortal, autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { Trans } from "@lingui/macro";
import cx from "classnames";
import { BigNumber } from "ethers";
import { AnimatePresence, Variants, motion } from "framer-motion";
import React, { startTransition, useCallback, useState } from "react";
import { BiChevronDown } from "react-icons/bi";
import { useMedia } from "react-use";

import { getMarketPoolName } from "domain/synthetics/markets/utils";
import type { MarketStat } from "domain/synthetics/stats/marketsInfoDataToIndexTokensStats";
import { TradeType } from "domain/synthetics/trade";
import { formatPercentage, formatRatePercentage, formatUsd } from "lib/numbers";

import { numberToState } from "../TradeHistory/TradeHistoryRow/utils/shared";

import Modal from "components/Modal/Modal";
import TokenIcon from "components/TokenIcon/TokenIcon";

import "./NewPoolSelector.scss";

type Props = {
  selectedPoolName: string | undefined;
  options: MarketStat[] | undefined;
  openFees: { [marketTokenAddress: string]: BigNumber | undefined };
  tradeType: TradeType;
  onSelect: (marketAddress: string) => void;
};

export function NewPoolSelector(props: Props) {
  const isMobile = useMedia("(max-width: 1100px)");

  if (isMobile) {
    return <NewPoolSelectorMobile {...props} />;
  }

  return <NewPoolSelectorDesktop {...props} />;
}

const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: "none" },
  visible: { opacity: 1, pointerEvents: "auto" },
};

const TRANSITION = { duration: 0.1 };

function NewPoolSelectorDesktop(props: Props) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(), flip(), shift()],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  const suppressPointerDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <Popover className="SwapBox-info-dropdown">
      {(popoverProps) => (
        <>
          <Popover.Button as="button" className="NewPoolSelector-button" ref={refs.setReference}>
            {props.selectedPoolName}
            <BiChevronDown className="TokenSelector-caret" />
          </Popover.Button>
          <FloatingPortal>
            {/* @ts-ignore */}
            <AnimatePresence>
              {popoverProps.open && (
                <Popover.Panel
                  static
                  className="NewPoolSelector-panel"
                  as={motion.div}
                  ref={refs.setFloating}
                  style={floatingStyles}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={FADE_VARIANTS}
                  transition={TRANSITION}
                  onPointerDown={suppressPointerDown}
                >
                  <table className="NewPoolSelector-table">
                    <thead>
                      <tr>
                        <th>
                          <Trans>Pool</Trans>
                        </th>
                        <th>
                          <Trans>Liquidity</Trans>
                        </th>
                        <th>
                          <Trans>Net rate</Trans>
                        </th>
                        <th>
                          <Trans>Open fees</Trans>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {props.options?.map((option) => (
                        <PoolListItemDesktop
                          key={option.marketInfo.marketTokenAddress}
                          marketStat={option}
                          tradeType={props.tradeType}
                          openFees={props.openFees[option.marketInfo.marketTokenAddress]}
                          isSelected={getMarketPoolName(option.marketInfo) === props.selectedPoolName}
                          onSelect={() => {
                            props.onSelect(option.marketInfo.marketTokenAddress);
                            startTransition(() => {
                              popoverProps.close();
                            });
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </Popover.Panel>
              )}
            </AnimatePresence>
          </FloatingPortal>
        </>
      )}
    </Popover>
  );
}

function PoolListItemDesktop({
  marketStat,
  tradeType,
  openFees,
  isSelected,
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  openFees: BigNumber | undefined;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(marketStat.maxLiquidity);
  const formattedNetRate = formatRatePercentage(
    tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort
  );
  const netRateState = numberToState(tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort);
  const formattedOpenFees = openFees ? formatPercentage(openFees, { signed: true }) : "-";
  const openFeesState = numberToState(openFees);
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  return (
    <tr
      className={cx("NewPoolSelector-row", {
        "NewPoolSelector-row-selected": isSelected,
      })}
      onClick={handleClick}
    >
      <td className="NewPoolSelector-column-pool">
        <div className="NewPoolSelector-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={24}
              importSize={24}
              className="NewPoolSelector-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={24}
                importSize={24}
                className="NewPoolSelector-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </td>
      <td>{formattedLiquidity}</td>
      <td
        className={cx({
          "text-red": netRateState === "error",
          "text-green": netRateState === "success",
        })}
      >
        <Trans>{formattedNetRate} / 1h</Trans>
      </td>
      <td
        className={cx("NewPoolSelector-column-open-fees", {
          "text-red": openFeesState === "error",
          "text-green": openFeesState === "success",
        })}
      >
        {formattedOpenFees}
      </td>
    </tr>
  );
}

function NewPoolSelectorMobile(props: Props) {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    <>
      <button className="SwapBox-info-dropdown NewPoolSelector-button" onClick={toggleVisibility}>
        {props.selectedPoolName}
        <BiChevronDown className="TokenSelector-caret" />
      </button>
      <Modal setIsVisible={setIsVisible} isVisible={isVisible} label={<Trans>Select pool</Trans>}>
        <div className="NewPoolSelector-mobile-list">
          {props.options?.map((option) => (
            <PoolListItemMobile
              key={option.marketInfo.marketTokenAddress}
              marketStat={option}
              tradeType={props.tradeType}
              openFees={props.openFees[option.marketInfo.marketTokenAddress]}
              isSelected={getMarketPoolName(option.marketInfo) === props.selectedPoolName}
              onSelect={() => {
                props.onSelect(option.marketInfo.marketTokenAddress);
                startTransition(() => {
                  setIsVisible(false);
                });
              }}
            />
          ))}
        </div>
      </Modal>
    </>
  );
}

function PoolListItemMobile({
  marketStat,
  tradeType,
  openFees,
  isSelected,
  onSelect,
}: {
  marketStat: MarketStat;
  tradeType: TradeType;
  openFees: BigNumber | undefined;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const longTokenSymbol = marketStat.marketInfo.longToken.symbol;
  const shortTokenSymbol = marketStat.marketInfo.shortToken.symbol;
  const poolName = getMarketPoolName(marketStat.marketInfo);
  const formattedLiquidity = formatUsd(marketStat.maxLiquidity);
  const formattedNetRate = formatRatePercentage(
    tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort
  );
  const netRateState = numberToState(tradeType === TradeType.Long ? marketStat.netFeeLong : marketStat.netFeeShort);
  const formattedOpenFees = openFees ? formatPercentage(openFees, { signed: true }) : "-";
  const openFeesState = numberToState(openFees);

  return (
    <button
      key={marketStat.marketInfo.marketTokenAddress}
      className={cx("NewPoolSelector-mobile-row", {
        "NewPoolSelector-mobile-row-selected": isSelected,
      })}
      onClick={onSelect}
    >
      <div className="NewPoolSelector-column-pool">
        <div className="NewPoolSelector-collateral-logos">
          <>
            <TokenIcon
              symbol={longTokenSymbol}
              displaySize={24}
              importSize={24}
              className="NewPoolSelector-collateral-logo-first"
            />
            {shortTokenSymbol && (
              <TokenIcon
                symbol={shortTokenSymbol}
                displaySize={24}
                importSize={24}
                className="NewPoolSelector-collateral-logo-second"
              />
            )}
          </>
        </div>
        <div>{poolName}</div>
      </div>
      <dl className="NewPoolSelector-mobile-info">
        <dt>
          <Trans>Liquidity</Trans>
        </dt>
        <dd>{formattedLiquidity}</dd>
        <dt>
          <Trans>Net rate</Trans>
        </dt>
        <dd
          className={cx({
            "text-red": netRateState === "error",
            "text-green": netRateState === "success",
          })}
        >
          {formattedNetRate} / 1h
        </dd>
        <dt>
          <Trans>Open fees</Trans>
        </dt>
        <dd
          className={cx({
            "text-red": openFeesState === "error",
            "text-green": openFeesState === "success",
          })}
        >
          {formattedOpenFees}
        </dd>
      </dl>
    </button>
  );
}
