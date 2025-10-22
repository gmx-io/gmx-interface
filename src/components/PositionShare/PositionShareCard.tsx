import { Trans } from "@lingui/macro";
import cx from "classnames";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";

import { Token } from "domain/tokens";
import { getHomeUrl } from "lib/legacy";
import { calculateDisplayDecimals } from "lib/numbers";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import SpinningLoader from "components/Loader/SpinningLoader";
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
  userAffiliateCode: any;
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
      userAffiliateCode,
      showPnlAmounts,
      pnlAfterFeesUsd,
    },
    ref
  ) => {
    const { isMobile } = useBreakpoints();
    const { code, success } = userAffiliateCode;
    const homeURL = getHomeUrl();
    const style = useMemo(() => ({ backgroundImage: `url(${sharePositionBgImg})` }), [sharePositionBgImg]);

    const priceDecimals = calculateDisplayDecimals(markPrice, undefined, indexToken.visualMultiplier);

    return (
      <div className="relative max-w-[460px] grow overflow-hidden rounded-9">
        <div
          ref={ref}
          className="flex aspect-[460/240] w-full justify-between rounded-9 bg-contain bg-no-repeat p-20 pb-28 max-md:p-16"
          style={style}
        >
          <img src={coinImg} alt="coin" className="z-1 absolute bottom-0 right-0 size-[100px] max-md:size-[70px]" />
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
                  {isLong ? "Long" : "Short"} {formatAmount(leverage, 4, 2, true)}x
                </div>
                <div className="flex items-center gap-4 font-medium text-white">
                  <TokenIcon symbol={indexToken.symbol} displaySize={14} importSize={24} />
                  <span>
                    {getTokenVisualMultiplier(indexToken)}
                    {indexToken.symbol} / USD
                  </span>
                </div>
              </div>
              <div className="flex items-end gap-6">
                <h3
                  className={cx(
                    "text-[40px] font-medium max-md:text-[32px]",
                    pnlAfterFeesPercentage < 0 ? "text-[#FF506A]" : "text-[#0FDE8D]"
                  )}
                >
                  {formatPercentage(pnlAfterFeesPercentage, { signed: true })}
                </h3>
                {showPnlAmounts && (
                  <p
                    className={cx(
                      "pb-8 text-14 font-medium",
                      pnlAfterFeesPercentage < 0 ? "text-[#FF506A]" : "text-[#0FDE8D]"
                    )}
                  >
                    {formatUsd(pnlAfterFeesUsd, { displayPlus: true })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-20 max-md:gap-10">
              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">Entry Price</p>
                <p className="text-13 font-medium text-white">
                  {formatUsd(entryPrice, {
                    displayDecimals: priceDecimals,
                    visualMultiplier: indexToken.visualMultiplier,
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">Mark Price</p>
                <p className="text-13 font-medium text-white">
                  {formatUsd(markPrice, {
                    displayDecimals: priceDecimals,
                    visualMultiplier: indexToken.visualMultiplier,
                  })}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">Referral Code:</p>
                {success && code ? (
                  <p className="text-13 font-medium text-white">{code}</p>
                ) : (
                  <p className="text-13 font-medium text-[#A0A3C4]">-</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-between">
            <QRCodeSVG
              size={isMobile ? 40 : 52}
              value={success && code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`}
              className="rounded-4 bg-white p-4"
            />
            <div className="size-80 max-md:size-50"></div>
          </div>
        </div>
        {loading && (
          <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center gap-8 rounded-b-8 bg-[#22243a] px-8 py-6 text-12">
            <SpinningLoader className="size-14" />
            <p className="font-medium text-white">
              <Trans>Generating shareable image...</Trans>
            </p>
          </div>
        )}
      </div>
    );
  }
);
