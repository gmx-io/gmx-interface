import { Trans, t } from "@lingui/macro";
import React, { useMemo } from "react";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectGlvAndMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  MarketTokensAPRData,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketBadge,
  getMarketIndexName,
  getMarketPoolName,
  getMintableMarketTokens,
} from "domain/synthetics/markets";
import { getMintableInfoGlv, isGlvInfo } from "domain/synthetics/markets/glv";
import { useDaysConsideredInMarketsApr } from "domain/synthetics/markets/useDaysConsideredInMarketsApr";
import { useUserEarnings } from "domain/synthetics/markets/useUserEarnings";
import { TokenData, TokensData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { formatUsdPrice } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import { AprInfo } from "components/AprInfo/AprInfo";
import Button from "components/Button/Button";
import FavoriteStar from "components/FavoriteStar/FavoriteStar";
import { TableTd, TableTr } from "components/Table/Table";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import GmAssetDropdown from "../GmAssetDropdown/GmAssetDropdown";
import { GmTokensBalanceInfo } from "./GmTokensTotalBalanceInfo";
import { MintableAmount } from "./MintableAmount";

export const tokenAddressStyle = { fontSize: 5 };

export function GmListItem({
  token,
  marketsTokensApyData,
  marketsTokensIncentiveAprData,
  glvTokensIncentiveAprData,
  marketsTokensLidoAprData,
  glvTokensApyData,
  shouldScrollToTop,
  isShiftAvailable,
  marketTokensData,
  isFavorite,
  onFavoriteClick,
}: {
  token: TokenData;
  marketsTokensApyData: MarketTokensAPRData | undefined;
  marketsTokensIncentiveAprData: MarketTokensAPRData | undefined;
  glvTokensIncentiveAprData: MarketTokensAPRData | undefined;
  marketsTokensLidoAprData: MarketTokensAPRData | undefined;
  glvTokensApyData: MarketTokensAPRData | undefined;
  shouldScrollToTop: boolean | undefined;
  isShiftAvailable: boolean;
  marketTokensData: TokensData | undefined;
  isFavorite: boolean | undefined;
  onFavoriteClick: ((address: string) => void) | undefined;
}) {
  const chainId = useSelector(selectChainId);
  const marketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const tokensData = useTokensData();
  const userEarnings = useUserEarnings(chainId);
  const daysConsidered = useDaysConsideredInMarketsApr();
  const { showDebugValues } = useSettings();

  const marketOrGlv = getByKey(marketsInfoData, token?.address);

  const isGlv = isGlvInfo(marketOrGlv);

  const indexToken = isGlv ? marketOrGlv.glvToken : getTokenData(tokensData, marketOrGlv?.indexTokenAddress, "native");
  const longToken = getTokenData(tokensData, marketOrGlv?.longTokenAddress);
  const shortToken = getTokenData(tokensData, marketOrGlv?.shortTokenAddress);

  const marketOrGlvTokenAddress = marketOrGlv && getGlvOrMarketAddress(marketOrGlv);

  const mintableInfo = useMemo(() => {
    if (!marketOrGlv || !token || isGlv) {
      return undefined;
    }

    return getMintableMarketTokens(marketOrGlv, token);
  }, [marketOrGlv, token, isGlv]);

  const shiftButton = useMemo(() => {
    const btn = (
      <Button
        className="w-full"
        variant="secondary"
        disabled={!isShiftAvailable}
        to={`/pools/?market=${marketOrGlvTokenAddress}&operation=shift&scroll=${shouldScrollToTop ? "1" : "0"}`}
      >
        <Trans>Shift</Trans>
      </Button>
    );

    if (isGlv) {
      return (
        <TooltipWithPortal
          content={
            <Trans>
              Shifting from GLV to another pool is not possible, as GLV can only be sold into the backing tokens.
              However, you can buy GLV tokens without incurring buying fees by using eligible GM pool tokens.
            </Trans>
          }
          handle={btn}
          disableHandleStyle
        />
      );
    }

    return (
      <TooltipWithPortal
        disabled={isShiftAvailable}
        content={t`Shift is only applicable to GM pools when there are other pools with the same backing tokens, allowing liquidity to be moved without incurring buy or sell fees.`}
        disableHandleStyle
        handleClassName="block"
        position="bottom-end"
      >
        {btn}
      </TooltipWithPortal>
    );
  }, [isShiftAvailable, marketOrGlvTokenAddress, shouldScrollToTop, isGlv]);

  const apy = isGlv
    ? getByKey(glvTokensApyData, marketOrGlvTokenAddress)
    : getByKey(marketsTokensApyData, token?.address);
  const incentiveApr = isGlv
    ? getByKey(glvTokensIncentiveAprData, token?.address)
    : getByKey(marketsTokensIncentiveAprData, token?.address);
  const lidoApr = getByKey(marketsTokensLidoAprData, token?.address);
  const marketEarnings = getByKey(userEarnings?.byMarketAddress, token?.address);

  if (!token || !indexToken || !longToken || !shortToken) {
    return null;
  }

  const totalSupply = token?.totalSupply;
  const totalSupplyUsd = convertToUsd(totalSupply, token?.decimals, token?.prices?.minPrice);
  const tokenIconName = marketOrGlv?.isSpotOnly
    ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
    : getNormalizedTokenSymbol(indexToken.symbol);

  const tokenIconBadge = getMarketBadge(chainId, marketOrGlv);

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!marketOrGlvTokenAddress) return;
    onFavoriteClick?.(marketOrGlvTokenAddress);
  };

  return (
    <TableTr key={token.address} hoverable={false} bordered={false}>
      <TableTd>
        <div className="flex items-start">
          {onFavoriteClick && (
            <div
              className="-ml-8 mr-4 cursor-pointer self-center rounded-4 p-8 text-16 hover:bg-cold-blue-700 active:bg-cold-blue-500"
              onClick={handleFavoriteClick}
            >
              <FavoriteStar isFavorite={isFavorite} />
            </div>
          )}
          <div className="mr-12 flex shrink-0 items-center">
            <TokenIcon
              symbol={tokenIconName}
              displaySize={40}
              importSize={40}
              badge={tokenIconBadge}
              className="min-h-40 min-w-40"
            />
          </div>
          <div>
            <div className="flex text-16">
              {isGlv
                ? getGlvDisplayName(marketOrGlv)
                : getMarketIndexName({ indexToken, isSpotOnly: Boolean(marketOrGlv?.isSpotOnly) })}

              <div className="inline-block">
                <GmAssetDropdown token={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
              </div>
            </div>
            <div className="text-12 tracking-normal text-slate-100">
              [{getMarketPoolName({ longToken, shortToken })}]
            </div>
          </div>
        </div>
        {showDebugValues && <span style={tokenAddressStyle}>{marketOrGlvTokenAddress}</span>}
      </TableTd>
      <TableTd>{formatUsdPrice(token.prices?.minPrice)}</TableTd>
      <TableTd>
        <AmountWithUsdHuman multiline amount={totalSupply} decimals={token.decimals} usd={totalSupplyUsd} />
      </TableTd>
      <TableTd>
        {isGlv ? (
          <MintableAmount
            mintableInfo={getMintableInfoGlv(marketOrGlv, marketTokensData)}
            market={marketOrGlv}
            token={token}
          />
        ) : (
          marketOrGlv && (
            <MintableAmount
              mintableInfo={mintableInfo}
              market={marketOrGlv}
              token={token}
              longToken={longToken}
              shortToken={shortToken}
            />
          )
        )}
      </TableTd>

      <TableTd>
        <GmTokensBalanceInfo
          token={token}
          daysConsidered={daysConsidered}
          earnedRecently={marketEarnings?.recent}
          earnedTotal={marketEarnings?.total}
          isGlv={isGlv}
        />
      </TableTd>

      <TableTd>
        <AprInfo apy={apy} incentiveApr={incentiveApr} lidoApr={lidoApr} marketAddress={token.address} />
      </TableTd>

      <TableTd className="w-[350px]">
        <div className="grid grid-cols-3 gap-10">
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${marketOrGlvTokenAddress}&operation=buy&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Buy</Trans>
          </Button>
          <Button
            className="flex-grow"
            variant="secondary"
            to={`/pools/?market=${marketOrGlvTokenAddress}&operation=sell&scroll=${shouldScrollToTop ? "1" : "0"}`}
          >
            <Trans>Sell</Trans>
          </Button>
          <div className="flex-grow">{shiftButton}</div>
        </div>
      </TableTd>
    </TableTr>
  );
}
