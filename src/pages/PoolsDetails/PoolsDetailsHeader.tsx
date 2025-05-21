import { Trans } from "@lingui/macro";
import cx from "classnames";

import { USD_DECIMALS } from "config/factors";
import {
  MarketInfo,
  getGlvMarketShortening,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvInfo } from "domain/synthetics/markets/types";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { formatAmountHuman, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePoolsIsMobilePage } from "pages/Pools/usePoolsIsMobilePage";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";

import { PoolsDetailsMarketAmount } from "./PoolsDetailsMarketAmount";

type Props = {
  marketInfo: MarketInfo | GlvInfo | undefined;
  marketToken: TokenData | undefined;
};

export function PoolsDetailsHeader({ marketInfo, marketToken }: Props) {
  const { chainId } = useChainId();
  const isGlv = marketInfo && isGlvInfo(marketInfo);
  const iconName = marketInfo?.isSpotOnly
    ? getNormalizedTokenSymbol(marketInfo.longToken.symbol) + getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
    : isGlv
      ? marketInfo?.glvToken.symbol
      : marketInfo?.indexToken.symbol;

  const marketPrice = marketToken?.prices?.maxPrice;
  const marketBalance = marketToken?.balance;
  const marketBalanceUsd = convertToUsd(marketBalance, marketToken?.decimals, marketPrice);

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const userEarnings = useUserEarnings(chainId);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, marketToken?.address);

  const isMobile = usePoolsIsMobilePage();

  return (
    <div
      className={cx("flex rounded-4 bg-slate-800 px-16 py-20", {
        "flex-col gap-10": isMobile,
        "items-center gap-28": !isMobile,
      })}
    >
      {marketInfo ? (
        <>
          <div
            className={cx("flex items-center gap-20 border-stroke-primary", {
              "border-r": !isMobile,
              "mb-12 border-b pb-14": isMobile,
            })}
          >
            {iconName ? (
              <TokenIcon
                symbol={iconName}
                displaySize={40}
                importSize={40}
                badge={
                  isGlv
                    ? getGlvMarketShortening(chainId, getGlvOrMarketAddress(marketInfo))
                    : ([marketInfo.longToken.symbol, marketInfo.shortToken.symbol] as const)
                }
              />
            ) : null}
            <div className={cx("flex flex-col gap-4 pr-20")}>
              <div className="text-body-large">{getMarketIndexName(marketInfo)}</div>
              <div className="text-body-small text-slate-100">{`[${getMarketPoolName(marketInfo)}]`}</div>
            </div>
          </div>

          <PoolsDetailsMarketAmount
            label={<Trans>TVL (Supply)</Trans>}
            value={formatAmountHuman(marketTotalSupplyUsd, USD_DECIMALS, true, 2)}
            secondaryValue={
              typeof marketTotalSupply === "bigint" && typeof marketToken?.decimals === "number"
                ? `${formatAmountHuman(marketTotalSupply, marketToken?.decimals, false, 2)} ${isGlv ? "GLV" : "GM"}`
                : undefined
            }
          />

          <PoolsDetailsMarketAmount
            label={<Trans>Wallet</Trans>}
            value={formatUsd(marketBalanceUsd)}
            secondaryValue={
              typeof marketBalance === "bigint" && typeof marketToken?.decimals === "number"
                ? `${formatBalanceAmount(marketBalance, marketToken?.decimals, undefined, true)} ${isGlv ? "GLV" : "GM"}`
                : undefined
            }
          />

          {marketEarnings ? (
            <PoolsDetailsMarketAmount
              label={<Trans>All time Earned in Fees</Trans>}
              value={formatUsd(marketEarnings?.total)}
            />
          ) : null}
        </>
      ) : (
        <div>...</div>
      )}
    </div>
  );
}
