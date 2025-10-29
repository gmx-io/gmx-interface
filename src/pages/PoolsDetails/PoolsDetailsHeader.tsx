import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useState } from "react";

import { USD_DECIMALS } from "config/factors";
import {
  getGlvMarketShortening,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmountHuman, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

type Props = {
  glvOrMarketInfo: GlvOrMarketInfo | undefined;
  marketToken: TokenData | undefined;
};

export function PoolsDetailsHeader({ glvOrMarketInfo, marketToken }: Props) {
  const { chainId, srcChainId } = useChainId();
  const isGlv = glvOrMarketInfo && isGlvInfo(glvOrMarketInfo);
  const iconName = glvOrMarketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(glvOrMarketInfo.longToken.symbol) +
      getNormalizedTokenSymbol(glvOrMarketInfo.shortToken.symbol)
    : isGlv
      ? glvOrMarketInfo?.glvToken.symbol
      : glvOrMarketInfo?.indexToken.symbol;

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const userEarnings = useUserEarnings(chainId, srcChainId);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, marketToken?.address);

  const isMobile = usePoolsIsMobilePage();

  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = useCallback(() => {
    setIsOpen((isOpen) => !isOpen);
  }, []);

  return (
    <div
      className={cx("flex rounded-8 bg-slate-900 px-16 py-20 max-md:px-12 max-md:py-12", {
        "flex-col gap-18": isMobile,
        "items-center gap-28": !isMobile,
      })}
    >
      {glvOrMarketInfo ? (
        <>
          <div
            className={cx("flex items-center justify-between ", {
              "border-b-1/2 border-slate-600 pb-18": isOpen && isMobile,
            })}
          >
            <div className="flex items-center gap-20">
              {iconName ? (
                <TokenIcon
                  symbol={iconName}
                  displaySize={40}
                  badge={
                    isGlv
                      ? getGlvMarketShortening(chainId, getGlvOrMarketAddress(glvOrMarketInfo))
                      : ([glvOrMarketInfo.longToken.symbol, glvOrMarketInfo.shortToken.symbol] as const)
                  }
                />
              ) : null}
              <div className={cx("flex flex-col gap-4 pr-20 font-medium")}>
                <div className="text-body-large">{isGlv ? "GLV" : `GM: ${getMarketIndexName(glvOrMarketInfo)}`}</div>
                <div className="text-body-small text-typography-secondary">{`[${getMarketPoolName(glvOrMarketInfo)}]`}</div>
              </div>
            </div>
            {isMobile ? (
              <Button className="flex h-32 w-32 items-center justify-center" variant="secondary" onClick={handleToggle}>
                <ChevronDownIcon className={cx({ "rotate-180": isOpen })} />
              </Button>
            ) : null}
          </div>
          {!isOpen && isMobile ? null : (
            <div className="flex gap-14 max-md:flex-col">
              <PoolsDetailsMarketAmount
                label={<Trans>TVL (Supply)</Trans>}
                value={formatAmountHuman(marketTotalSupplyUsd, USD_DECIMALS, true, 2)}
                secondaryValue={
                  typeof marketTotalSupply === "bigint" && typeof marketToken?.decimals === "number"
                    ? `${formatAmountHuman(marketTotalSupply, marketToken?.decimals, false, 2)} ${isGlv ? "GLV" : "GM"}`
                    : undefined
                }
              />

              {typeof marketBalance === "bigint" && typeof marketToken?.decimals === "number" ? (
                <PoolsDetailsMarketAmount
                  label={<Trans>Wallet</Trans>}
                  value={formatUsd(marketBalanceUsd)}
                  secondaryValue={`${formatBalanceAmount(marketBalance, marketToken?.decimals, undefined, {
                    showZero: true,
                  })} ${isGlv ? "GLV" : "GM"}`}
                />
              ) : null}

              {marketEarnings ? (
                <PoolsDetailsMarketAmount
                  label={<Trans>Total Earned Fees</Trans>}
                  value={formatUsd(marketEarnings?.total)}
                />
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div>...</div>
      )}
    </div>
  );
}
