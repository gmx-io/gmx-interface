import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { forwardRef, useMemo } from "react";

import { getHomeUrl } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import { useBreakpoints } from "lib/useBreakpoints";

import SpinningLoader from "components/Loader/SpinningLoader";

import LogoIcon from "img/logo-icon.svg?react";

type Props = {
  rank: number;
  pointsEarned: bigint;
  rewardsEarned: bigint;
  loading: boolean;
  shareBgImg: string | null;
  code: string | undefined;
  referralCodeOwnerKind: "created" | "used" | undefined;
};

const START_TRADING_TEXT_STYLES = {
  backgroundImage: "linear-gradient(162.5deg, rgb(164, 195, 249) 15.3%, rgb(45, 66, 252) 205%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

export const PointsShareCard = forwardRef<HTMLDivElement, Props>(
  ({ rank, pointsEarned, rewardsEarned, loading, shareBgImg, code, referralCodeOwnerKind }, ref) => {
    const { isMobile } = useBreakpoints();
    const homeURL = getHomeUrl();
    const style = useMemo(() => ({ backgroundImage: `url(${shareBgImg})` }), [shareBgImg]);

    const qrCodeUrl = code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`;

    return (
      <div className="relative max-w-[460px] grow overflow-hidden rounded-12">
        <div
          ref={ref}
          className="flex aspect-[460/240] w-full justify-between rounded-12 bg-cover bg-no-repeat p-20 max-md:p-16"
          style={style}
        >
          <div className="z-3 relative flex flex-col justify-between gap-12 max-md:gap-4">
            <div className="flex items-center gap-4 text-16 font-medium">
              <LogoIcon className="size-22" />
              GMX
            </div>

            <div className="flex flex-col gap-12 max-md:gap-8">
              <h3 className="text-[28px] font-medium leading-[1.08] tracking-[-0.032em] max-md:text-[22px]">
                <span className="block text-white">
                  <Trans>I'm ranked #{rank} on GMX.</Trans>
                </span>
                <span className="block" style={START_TRADING_TEXT_STYLES}>
                  <Trans>Start trading with me.</Trans>
                </span>
              </h3>

              <div className="flex gap-16 max-md:gap-10">
                <div className="flex flex-col gap-4">
                  <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                    <Trans>Earned points</Trans>
                  </p>
                  <p className="whitespace-nowrap text-13 font-medium text-white">
                    {formatAmount(pointsEarned, 18, 2, true)}
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                    <Trans>Earned rewards</Trans>
                  </p>
                  <p className="whitespace-nowrap text-13 font-medium text-white">
                    {formatAmount(rewardsEarned, 18, 2, true)} GMX
                  </p>
                </div>
                {referralCodeOwnerKind && code && (
                  <div className="flex flex-col gap-4">
                    <p className="text-11 font-medium uppercase tracking-[0.08em] text-[#A0A3C4]">
                      {referralCodeOwnerKind === "created" ? <Trans>Referral code</Trans> : <Trans>Used Code</Trans>}
                    </p>
                    <p className="whitespace-nowrap text-13 font-medium text-white">{code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="z-3 relative shrink-0">
            <QRCodeSVG size={isMobile ? 40 : 52} value={qrCodeUrl} className="rounded-4 bg-white p-4" />
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
