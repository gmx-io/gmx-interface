import { Trans } from "@lingui/macro";
import { forwardRef } from "react";

import { ES_GMX_DECIMALS, GT_DECIMALS } from "domain/synthetics/incentives/v2/constants";
import { formatAmount } from "lib/numbers";

import { ShareCardFrame } from "components/ShareModal/ShareCardFrame";
import { ShareCardQRCode } from "components/ShareModal/ShareCardQRCode";
import { ShareCardReferralCodeStat } from "components/ShareModal/ShareCardReferralCodeStat";
import { ShareCardStat } from "components/ShareModal/ShareCardStat";

type Props = {
  rank: number;
  esGmxRewards: bigint;
  gtRewards: bigint;
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

export const RewardsShareCard = forwardRef<HTMLDivElement, Props>(
  ({ rank, esGmxRewards, gtRewards, loading, shareBgImg, code, referralCodeOwnerKind }, ref) => {
    return (
      <ShareCardFrame
        ref={ref}
        bgImgUrl={shareBgImg}
        loading={loading}
        cardClassName="flex justify-between bg-slate-950"
      >
        <div className="z-3 relative flex min-w-0 flex-col justify-end gap-12 max-md:gap-8">
          <h3 className="text-[28px] font-medium leading-[1.08] tracking-[-0.032em] max-md:text-[22px]">
            <span className="block text-white">
              <Trans>I'm ranked #{rank} on GMX.</Trans>
            </span>
            <span className="block" style={START_TRADING_TEXT_STYLES}>
              <Trans>Start trading with me.</Trans>
            </span>
          </h3>

          <div className="flex gap-16 max-md:gap-10">
            <ShareCardStat label={<Trans>esGMX accrued</Trans>}>
              {formatAmount(esGmxRewards, ES_GMX_DECIMALS, 4, true, { trimTrailingZeros: true })} esGMX
            </ShareCardStat>
            <ShareCardStat label={<Trans>GT allocated</Trans>}>
              {formatAmount(gtRewards, GT_DECIMALS, 4, true, { trimTrailingZeros: true })} GT
            </ShareCardStat>
            <ShareCardReferralCodeStat referralCodeOwnerKind={referralCodeOwnerKind} code={code} />
          </div>
        </div>

        <ShareCardQRCode code={code} className="z-3 relative shrink-0" />
      </ShareCardFrame>
    );
  }
);
