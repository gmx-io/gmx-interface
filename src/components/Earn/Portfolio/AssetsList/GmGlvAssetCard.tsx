import { Trans } from "@lingui/macro";

import {
  GlvOrMarketInfo,
  getGlvDisplayName,
  getGlvOrMarketAddress,
  getMarketBadge,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData, convertToUsd } from "domain/synthetics/tokens";
import { formatPercentage } from "lib/numbers";
import { sendEarnPortfolioItemClickEvent, EarnPagePortfolioItemType } from "lib/userAnalytics/earnAnalytics";
import { ContractsChainId } from "sdk/configs/chains";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import { Mode, Operation } from "components/GmSwap/GmSwapBox/types";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import TokenIcon from "components/TokenIcon/TokenIcon";

import MinusCircleIcon from "img/ic_minus_circle.svg?react";
import NewLinkIcon from "img/ic_new_link.svg?react";
import PlusCircleIcon from "img/ic_plus_circle.svg?react";

import { BaseAssetCard } from "./BaseAssetCard";

type Props = {
  token: TokenData | undefined;
  marketInfo: GlvOrMarketInfo;
  chainId: ContractsChainId;
  totalFeeApy: bigint | undefined;
  feeApy30d: bigint | undefined;
};

export function GmGlvAssetCard({ token, marketInfo, chainId, totalFeeApy, feeApy30d }: Props) {
  const marketAddress = getGlvOrMarketAddress(marketInfo);

  const isGlv = isGlvInfo(marketInfo);
  const indexToken = isGlv ? marketInfo.glvToken : marketInfo.indexToken;
  const longToken = marketInfo.longToken;
  const shortToken = marketInfo.shortToken;

  const title = isGlv
    ? getGlvDisplayName(marketInfo)
    : getMarketIndexName({ indexToken, isSpotOnly: marketInfo.isSpotOnly });
  const subtitle = `[${getMarketPoolName({ longToken, shortToken })}]`;

  const iconTokenSymbol = isGlv
    ? "GLV"
    : marketInfo.isSpotOnly
      ? getNormalizedTokenSymbol(longToken.symbol) + getNormalizedTokenSymbol(shortToken.symbol)
      : getNormalizedTokenSymbol(indexToken.symbol);

  const detailsPath = `/pools/details?market=${marketAddress}`;
  const buyPath = `${detailsPath}&operation=${Operation.Deposit}&mode=${Mode.Single}`;
  const sellPath = `${detailsPath}&operation=${Operation.Withdrawal}&mode=${Mode.Single}`;

  const makeHandleClick = (type: EarnPagePortfolioItemType) => {
    return () => {
      sendEarnPortfolioItemClickEvent({ item: isGlv ? "GLV" : "GM", type });
    };
  };

  return (
    <BaseAssetCard
      icon={
        <TokenIcon
          symbol={iconTokenSymbol}
          displaySize={40}
          importSize={40}
          badge={getMarketBadge(chainId, marketInfo)}
          badgeClassName={isGlv ? "left-[50%] -translate-x-1/2 right-[unset] -bottom-1" : undefined}
        />
      }
      title={title}
      subtitle={subtitle}
      headerButton={
        <Button variant="secondary" className="w-32 !p-0" to={detailsPath} onClick={makeHandleClick("details")}>
          <NewLinkIcon className="size-16" />
        </Button>
      }
      footer={
        <div className="grid w-full grid-cols-2 gap-8">
          <Button variant="secondary" to={buyPath} onClick={makeHandleClick("buy")}>
            <PlusCircleIcon className="size-16" />
            <Trans>Buy</Trans>
          </Button>
          <Button variant="secondary" to={sellPath} onClick={makeHandleClick("sell")}>
            <MinusCircleIcon className="size-16" />
            <Trans>Sell</Trans>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-12">
        <SyntheticsInfoRow label={<Trans>Total Fee APY</Trans>} value={formatPercentage(totalFeeApy, { bps: false })} />
        <SyntheticsInfoRow label={<Trans>30d Fee APY</Trans>} value={formatPercentage(feeApy30d, { bps: false })} />
        <SyntheticsInfoRow
          label={<Trans>Balance</Trans>}
          value={
            token?.balance ? (
              <AmountWithUsdBalance
                amount={token.balance}
                decimals={token.decimals}
                usd={
                  token.prices?.minPrice && typeof token.balance === "bigint"
                    ? convertToUsd(token.balance, token.decimals, token.prices.minPrice)
                    : undefined
                }
                symbol={token.symbol}
              />
            ) : (
              <span>-</span>
            )
          }
        />
      </div>
    </BaseAssetCard>
  );
}

export default GmGlvAssetCard;
