import { Trans } from "@lingui/macro";
import SpinningLoader from "components/Common/SpinningLoader";
import { Token } from "domain/tokens";
import gmxLogo from "img/gmx-logo-with-name.svg";
import { getHomeUrl } from "lib/legacy";
import { formatAmount, formatPercentage, formatUsd } from "lib/numbers";
import { calculateDisplayDecimals } from "lib/numbers";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";
import { useMedia } from "react-use";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";

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
      <div className="relative">
        <div ref={ref} className="position-share" style={style}>
          <img className="logo" src={gmxLogo} alt="GMX Logo" />
          <ul className="info">
            <li className="side">{isLong ? "LONG" : "SHORT"}</li>
            <li>{formatAmount(leverage, 4, 2, true)}x&nbsp;</li>
            <li>
              {getTokenVisualMultiplier(indexToken)}
              {indexToken.symbol} USD
            </li>
          </ul>
          <h3 className="pnl">{formatPercentage(pnlAfterFeesPercentage, { signed: true })}</h3>
          <div className="prices">
            <div>
              <p>Entry Price</p>
              <p className="price">
                {formatUsd(entryPrice, {
                  displayDecimals: priceDecimals,
                  visualMultiplier: indexToken.visualMultiplier,
                })}
              </p>
            </div>
            <div>
              <p>Mark Price</p>
              <p className="price">
                {formatUsd(markPrice, {
                  displayDecimals: priceDecimals,
                  visualMultiplier: indexToken.visualMultiplier,
                })}
              </p>
            </div>
          </div>
          <div className="referral-code">
            <div>
              <QRCodeSVG
                size={isMobile ? 24 : 32}
                value={success && code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`}
              />
            </div>
            <div className="referral-code-info">
              {success && code ? (
                <>
                  <p className="label">Referral Code:</p>
                  <p className="code">{code}</p>
                </>
              ) : (
                <p className="code">https://gmx.io</p>
              )}
            </div>
          </div>
        </div>
        {loading && (
          <div className="image-overlay-wrapper">
            <div className="image-overlay">
              <SpinningLoader />
              <p className="loading-text">
                <Trans>Generating shareable image...</Trans>
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);
