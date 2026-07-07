import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { forwardRef } from "react";

import { Token } from "domain/tokens";
import { calculateDisplayDecimals } from "lib/numbers";
import { formatAmount, formatUsd } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import { ShareCardFrame } from "components/ShareModal/ShareCardFrame";
import { ShareCardPnlValue } from "components/ShareModal/ShareCardPnlValue";
import { ShareCardQRCode } from "components/ShareModal/ShareCardQRCode";
import { ShareCardReferralCodeStat } from "components/ShareModal/ShareCardReferralCodeStat";
import { ShareCardStat } from "components/ShareModal/ShareCardStat";
import TokenIcon from "components/TokenIcon/TokenIcon";

import coinImg from "img/coin.png";
import VectorCircleIcon from "img/ic_vector_circle.svg?react";

type Props = {
  entryPrice: bigint | undefined;
  indexToken: Token;
  isLong: boolean;
  leverage: bigint | undefined;
  loading: boolean;
  markPrice: bigint;
  pnlAfterFeesPercentage: bigint;
  sharePositionBgImg: string | null;
  referralCodeOwnerKind: "created" | "used" | undefined;
  code: string | undefined;
  showPnlAmounts: boolean;
  pnlAfterFeesUsd: bigint;
};

export const PositionShareCard = forwardRef<HTMLDivElement, Props>(
  (
    {
      entryPrice,
      indexToken,
      isLong,
      leverage,
      loading,
      markPrice,
      pnlAfterFeesPercentage,
      sharePositionBgImg,
      referralCodeOwnerKind,
      code,
      showPnlAmounts,
      pnlAfterFeesUsd,
    },
    ref
  ) => {
    const priceDecimals = calculateDisplayDecimals(markPrice, undefined, indexToken.visualMultiplier);

    return (
      <ShareCardFrame ref={ref} bgImgUrl={sharePositionBgImg} loading={loading} cardClassName="flex justify-between">
        <img src={coinImg} alt={t`Coin`} className="z-1 absolute bottom-0 right-0 size-[100px] max-md:size-[70px]" />
        <div className="z-3 relative flex flex-col justify-end gap-12 max-md:gap-4 max-smallMobile:gap-0">
          <div className="flex flex-col gap-4 max-md:gap-0">
            <div className="flex gap-8">
              <div
                className={cx(
                  "inline-flex items-center gap-4 text-13 font-medium",
                  isLong ? "text-[#0FDE8D]" : "text-[#FF506A]"
                )}
              >
                <VectorCircleIcon className={cx("size-14", { "rotate-180": !isLong })} />

                <span className="ml-2">
                  {isLong ? <Trans>Long</Trans> : <Trans>Short</Trans>} {formatAmount(leverage, 4, 2, true)}x
                </span>
              </div>
              <div className="flex items-center gap-4 font-medium text-white">
                <TokenIcon symbol={indexToken.symbol} displaySize={14} />
                <span>
                  {getTokenVisualMultiplier(indexToken)}
                  {indexToken.symbol} / USD
                </span>
              </div>
            </div>
            <ShareCardPnlValue
              pnlPercentage={pnlAfterFeesPercentage}
              pnlUsd={pnlAfterFeesUsd}
              showPnlAmounts={showPnlAmounts}
            />
          </div>
          <div className="flex gap-20 max-md:gap-10">
            <ShareCardStat label={<Trans>Entry price</Trans>}>
              {formatUsd(entryPrice, {
                displayDecimals: priceDecimals,
                visualMultiplier: indexToken.visualMultiplier,
              })}
            </ShareCardStat>
            <ShareCardStat label={<Trans>Mark price</Trans>}>
              {formatUsd(markPrice, {
                displayDecimals: priceDecimals,
                visualMultiplier: indexToken.visualMultiplier,
              })}
            </ShareCardStat>

            <ShareCardReferralCodeStat referralCodeOwnerKind={referralCodeOwnerKind} code={code} />
          </div>
        </div>

        <div className="flex flex-col items-end justify-between">
          <ShareCardQRCode code={code} />
          <div className="size-80 max-md:size-50"></div>
        </div>
      </ShareCardFrame>
    );
  }
);
