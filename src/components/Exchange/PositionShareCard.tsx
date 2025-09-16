import { Trans } from "@lingui/macro";
import cx from "classnames";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";
import { useMedia } from "react-use";

import { Token } from "domain/tokens";
import { getHomeUrl } from "lib/legacy";
import { calculateDisplayDecimals } from "lib/numbers";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

import SpinningLoader from "components/Common/SpinningLoader";
import TokenIcon from "components/TokenIcon/TokenIcon";

import coinImg from "img/coin.png";

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
    },
    ref
  ) => {
    const isMobile = useMedia("(max-width: 400px)");
    const { code, success } = userAffiliateCode;
    const homeURL = getHomeUrl();
    const style = useMemo(() => ({ backgroundImage: `url(${sharePositionBgImg})` }), [sharePositionBgImg]);

    const priceDecimals = calculateDisplayDecimals(markPrice, undefined, indexToken.visualMultiplier);

    return (
      <div className="relative overflow-hidden rounded-9">
        <div
          ref={ref}
          className="flex h-[240px] w-[460px] justify-between rounded-9 bg-contain bg-no-repeat p-20"
          style={style}
        >
          <div className="flex flex-col justify-end gap-12">
            <div className="flex gap-8">
              <div className={cx("text-13 font-medium", isLong ? "text-green-500" : "text-red-500")}>
                {isLong ? "LONG" : "SHORT"} {formatAmount(leverage, 4, 2, true)}x&nbsp;
              </div>
              <div className="flex items-center gap-4 font-medium">
                <TokenIcon symbol={indexToken.symbol} displaySize={16} importSize={24} />
                <span>
                  {getTokenVisualMultiplier(indexToken)}
                  {indexToken.symbol} / USD
                </span>
              </div>
            </div>
            <h3
              className={cx("text-[40px] font-medium", pnlAfterFeesPercentage < 0 ? "text-red-500" : "text-green-500")}
            >
              {formatPercentage(pnlAfterFeesPercentage, { signed: true })}
            </h3>
            <div className="flex gap-20">
              <div className="flex flex-col gap-4">
                <p className="text-caption">Entry Price</p>
                <p className="text-13 font-medium text-white">
                  {formatUsd(entryPrice, {
                    displayDecimals: priceDecimals,
                    visualMultiplier: indexToken.visualMultiplier,
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-caption">Mark Price</p>
                <p className="text-13 font-medium text-white">
                  {formatUsd(markPrice, {
                    displayDecimals: priceDecimals,
                    visualMultiplier: indexToken.visualMultiplier,
                  })}
                </p>
              </div>

              {success && code ? (
                <div className="flex flex-col gap-4">
                  <p className="text-caption">Referral Code:</p>
                  <p className="text-13 font-medium text-white">{code}</p>
                </div>
              ) : null}
            </div>
          </div>

          <QRCodeSVG size={isMobile ? 24 : 32} value={success && code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`} />
        </div>
        {loading && (
          <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center gap-8 bg-slate-800/90 px-8 py-6">
            <SpinningLoader />
            <p className="loading-text">
              <Trans>Generating shareable image...</Trans>
            </p>
          </div>
        )}
        <img src={coinImg} alt="coin" className="absolute bottom-0 right-0 size-[100px]" />
      </div>
    );
  }
);
