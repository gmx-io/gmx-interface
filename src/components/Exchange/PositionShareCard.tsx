import { Trans } from "@lingui/macro";
import SpinningLoader from "components/Common/SpinningLoader";
import { getPriceDecimals } from "config/tokens";
import { Token } from "domain/tokens";
import gmxLogo from "img/gmx-logo-with-name.svg";
import { useChainId } from "lib/chains";
import { USD_DECIMALS, getHomeUrl } from "lib/legacy";
import { formatAmount, formatPercentage } from "lib/numbers";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";
import { useMedia } from "react-use";

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
    const { chainId } = useChainId();
    const isMobile = useMedia("(max-width: 400px)");
    const { code, success } = userAffiliateCode;
    const positionPriceDecimal = getPriceDecimals(chainId, indexToken.symbol);
    const homeURL = getHomeUrl();
    const style = useMemo(() => ({ backgroundImage: `url(${sharePositionBgImg})` }), [sharePositionBgImg]);

    return (
      <div className="relative">
        <div ref={ref} className="position-share" style={style}>
          <img className="logo" src={gmxLogo} alt="GMX Logo" />
          <ul className="info">
            <li className="side">{isLong ? "LONG" : "SHORT"}</li>
            <li>{formatAmount(leverage, 4, 2, true)}x&nbsp;</li>
            <li>{indexToken.symbol} USD</li>
          </ul>
          <h3 className="pnl">{formatPercentage(pnlAfterFeesPercentage, { signed: true })}</h3>
          <div className="prices">
            <div>
              <p>Entry Price</p>
              <p className="price">${formatAmount(entryPrice, USD_DECIMALS, positionPriceDecimal, true)}</p>
            </div>
            <div>
              <p>Mark Price</p>
              <p className="price">${formatAmount(markPrice, USD_DECIMALS, positionPriceDecimal, true)}</p>
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
