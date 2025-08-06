import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useMemo } from "react";
import { ImSpinner2 } from "react-icons/im";

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
import { AnyChainId, getChainName } from "sdk/configs/chains";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { useMultichainMarketTokenBalancesRequest } from "components/Synthetics/GmxAccountModal/hooks";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";

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

  const marketTotalSupply = marketToken?.totalSupply;
  const marketTotalSupplyUsd = convertToUsd(marketTotalSupply, marketToken?.decimals, marketPrice);

  const userEarnings = useUserEarnings(chainId, srcChainId);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, marketToken?.address);

  const isMobile = usePoolsIsMobilePage();

  const { totalBalance, tokenBalancesData, isBalanceDataLoading } = useMultichainMarketTokenBalancesRequest(
    marketToken?.address
  );

  const sortedTokenBalancesDataArray = useMemo(() => {
    return Object.entries(tokenBalancesData)
      .sort((a, b) => {
        const aBalance = a[1];
        const bBalance = b[1];

        return aBalance > bBalance ? -1 : 1;
      })
      .map(([chainId, balance]) => ({
        chainId: parseInt(chainId) as AnyChainId | 0,
        balance,
      }));
  }, [tokenBalancesData]);

  const marketBalanceUsd = convertToUsd(totalBalance, marketToken?.decimals, marketPrice);

  return (
    <div
      className={cx("flex rounded-4 bg-slate-800 px-16 py-20", {
        "flex-col gap-10": isMobile,
        "items-center gap-28": !isMobile,
      })}
    >
      {glvOrMarketInfo ? (
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
                    ? getGlvMarketShortening(chainId, getGlvOrMarketAddress(glvOrMarketInfo))
                    : ([glvOrMarketInfo.longToken.symbol, glvOrMarketInfo.shortToken.symbol] as const)
                }
              />
            ) : null}
            <div className={cx("flex flex-col gap-4 pr-20")}>
              <div className="text-body-large">{isGlv ? "GLV" : `GM: ${getMarketIndexName(glvOrMarketInfo)}`}</div>
              <div className="text-body-small text-slate-100">{`[${getMarketPoolName(glvOrMarketInfo)}]`}</div>
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

          {typeof totalBalance === "bigint" && typeof marketToken?.decimals === "number" ? (
            <PoolsDetailsMarketAmount
              label={<Trans>Balance</Trans>}
              value={
                <>
                  {isBalanceDataLoading ? <ImSpinner2 className="mr-4 inline-block animate-spin" /> : null}
                  {formatUsd(marketBalanceUsd)}
                </>
              }
              secondaryValue={`${formatBalanceAmount(totalBalance, marketToken?.decimals, undefined, {
                showZero: true,
              })} ${isGlv ? "GLV" : "GM"}`}
              tooltipContent={
                <div>
                  {sortedTokenBalancesDataArray.map(({ chainId, balance }) => {
                    const chainName = chainId === 0 ? t`GMX Account` : getChainName(chainId);

                    return (
                      <SyntheticsInfoRow
                        key={chainId}
                        label={chainName}
                        value={formatBalanceAmount(balance, marketToken?.decimals, undefined, {
                          showZero: true,
                        })}
                      />
                    );
                  })}
                  {isBalanceDataLoading ? <ImSpinner2 className="animate-spin" /> : null}
                </div>
              }
            />
          ) : null}

          {marketEarnings ? (
            <PoolsDetailsMarketAmount
              label={<Trans>Total Earned Fees</Trans>}
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
