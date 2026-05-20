import { Trans } from "@lingui/macro";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useMarkets } from "domain/synthetics/markets";
import { getMarketBaseName } from "domain/synthetics/markets/utils";
import { convertTokenAddress, getNormalizedTokenSymbol, getToken, isValidTokenSafe } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";

import NewLinkIcon from "img/ic_new_link.svg?react";

type Props = {
  chainId: number;
  featuredMarketTokens: string[];
};

export function FeaturedMarketsTooltipContent({ chainId, featuredMarketTokens }: Props) {
  const { marketsData } = useMarkets(chainId);

  const items = useMemo(() => {
    return featuredMarketTokens
      .map((marketAddress) => {
        const market = marketsData?.[marketAddress];
        if (!market || market.isSpotOnly) return null;

        const indexTokenAddress = convertTokenAddress(chainId, market.indexTokenAddress, "native");
        if (!isValidTokenSafe(chainId, indexTokenAddress)) {
          return null;
        }

        const indexToken = getToken(chainId, indexTokenAddress);
        return {
          marketAddress,
          indexTokenSymbol: indexToken.symbol,
          symbol: getNormalizedTokenSymbol(indexToken.symbol),
          baseName: getMarketBaseName({ indexToken, isSpotOnly: market.isSpotOnly }),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [chainId, featuredMarketTokens, marketsData]);

  if (items.length === 0) return null;

  return (
    <div>
      <div className="mb-4 text-13 font-medium text-typography-primary">
        <Trans>Featured markets</Trans>
      </div>
      <div className="mt-8 flex flex-col gap-8">
        {items.map((item) => (
          <Link
            key={item.marketAddress}
            to={`/trade/long?market=${item.indexTokenSymbol}`}
            className="flex items-center gap-8 text-typography-secondary !no-underline"
          >
            <TokenIcon symbol={item.symbol} displaySize={20} />
            <span>
              <span className="font-medium text-typography-primary">{item.baseName}</span>
              /USD
            </span>
            <NewLinkIcon className="size-12" />
          </Link>
        ))}
      </div>
    </div>
  );
}
