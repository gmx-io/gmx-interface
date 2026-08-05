import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import {
  GRADIENT_TEXT_CLASS,
  VIP_CALL_BOOKING_URL,
  VIP_CONTACT_FORM_URL,
  VIP_TELEGRAM_URL,
} from "landing/components/TraderAffiliateWidget/constants";
import { useHomePageContext } from "landing/pages/Home/contexts/HomePageContext";
import { RedirectChainIds } from "landing/pages/Home/hooks/useGoToTrade";
import { getLandingReferralCode } from "landing/utils/referralCode";
import { useCallback } from "react";

import { REFERRAL_CODE_QUERY_PARAM } from "lib/legacy";
import { userAnalytics } from "lib/userAnalytics/UserAnalytics";
import { ARBITRUM } from "sdk/configs/chainIds";

import contactBg from "img/trader_affiliate_contact_bg.svg";
import icContactCall from "img/trader_affiliate_contact_call.svg";
import icContactChat from "img/trader_affiliate_contact_chat.svg";
import icContactTelegram from "img/trader_affiliate_contact_telegram.svg";
import footerLogo from "img/trader_affiliate_footer_logo.svg";

function useOpenLiveChat() {
  const { redirectWithWarning } = useHomePageContext();
  return useCallback(() => {
    const refCode = getLandingReferralCode();
    const refParam = refCode ? `&${REFERRAL_CODE_QUERY_PARAM}=${encodeURIComponent(refCode)}` : "";
    const url = `${import.meta.env.VITE_APP_BASE_URL}/trade?${userAnalytics.getSessionForwardParams()}&chainId=${ARBITRUM}&openChat=1${refParam}`;
    redirectWithWarning(url, RedirectChainIds.Arbitum);
  }, [redirectWithWarning]);
}

function ContactRow({
  icon,
  title,
  description,
  buttonLabel,
  primary,
  onClick,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  primary?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const buttonClassName = cx(
    "duration-180 flex h-44 w-full flex-shrink-0 items-center justify-center rounded-8 text-16 font-medium -tracking-[0.512px] text-white transition-colors sm:w-[140px]",
    primary ? "btn-landing" : "bg-slate-600/50 hover:bg-slate-600/70"
  );

  return (
    <div className="flex flex-col items-start gap-16 sm:h-60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-20">
        <img src={icon} alt="" className="size-60 flex-shrink-0" />
        <div className="flex flex-col gap-4">
          <div className="text-18 font-medium -tracking-[0.576px] text-white">{title}</div>
          <div className="text-14 -tracking-[0.448px] text-slate-400">{description}</div>
        </div>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClassName}>
          {buttonLabel}
        </a>
      ) : (
        <button type="button" onClick={onClick} className={buttonClassName}>
          {buttonLabel}
        </button>
      )}
    </div>
  );
}

export function ContactSection() {
  const openLiveChat = useOpenLiveChat();

  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden border-t-1/2 border-slate-600 bg-slate-900 px-16 pt-80 text-white sm:px-40 sm:pt-[120px]">
      <img
        src={contactBg}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-[1514px] w-full min-w-[1728px] max-w-none -translate-x-1/2 select-none"
      />
      <div id="contact" className="relative flex w-full flex-col items-center text-center">
        <span className="inline-flex h-24 w-fit items-center rounded-full bg-blue-300/20 px-6">
          <span className={cx("text-16 -tracking-[0.512px]", GRADIENT_TEXT_CLASS)}>
            <Trans>Talk to the desk</Trans>
          </span>
        </span>
        <h2 className="text-50 leading-heading-lg lg:text-100 mt-28 font-medium -tracking-[2.6px] lg:-tracking-[5.2px]">
          <Trans>
            Lock in
            <br />
            <span className={GRADIENT_TEXT_CLASS}>a better rate.</span>
          </Trans>
        </h2>
        <p className="mt-14 max-w-[350px] text-16 leading-[20px] -tracking-[0.512px] text-slate-400">
          <Trans>
            Reach out however suits you and we'll come back with your exact tier — usually within a couple of hours. No
            obligation.
          </Trans>
        </p>
      </div>

      <div className="relative mt-[57px] w-full max-w-[600px] rounded-20 border-1/2 border-slate-600 bg-slate-900 p-20 sm:p-28">
        <div className="flex flex-col gap-20">
          <ContactRow
            icon={icContactChat}
            title={t`Live chat with the desk`}
            description={t`Instant answers, right on the page`}
            buttonLabel={t`Open Live-Chat`}
            primary
            onClick={openLiveChat}
          />
          <ContactRow
            icon={icContactTelegram}
            title={t`Message us on Telegram`}
            description={t`Fastest — chat with the desk directly`}
            buttonLabel={t`Open Telegram`}
            href={VIP_TELEGRAM_URL}
          />
          <ContactRow
            icon={icContactCall}
            title={t`Book a 30-min call`}
            description={t`Walk through tiers & onboarding live`}
            buttonLabel={t`Pick a time`}
            href={VIP_CALL_BOOKING_URL}
          />
        </div>

        <div className="mb-20 mt-20 flex items-center gap-20 text-14 -tracking-[0.448px] text-slate-500">
          <div className="flex-1 border-t-1/2 border-slate-600/50" />
          <Trans>OR</Trans>
          <div className="flex-1 border-t-1/2 border-slate-600/50" />
        </div>

        <a
          href={VIP_CONTACT_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="duration-180 flex h-44 w-full items-center justify-center rounded-8 bg-slate-600/50 text-16 font-medium -tracking-[0.512px] text-white transition-colors hover:bg-slate-600/70"
        >
          <Trans>Request to be contacted</Trans>
        </a>
        <p className="mt-20 text-center text-[13px] leading-[16px] tracking-[0.026px] text-slate-500">
          <Trans>
            Anonymous by default — connect with just your wallet.
            <br className="hidden sm:block" />
            Share an email only if you want updates.
          </Trans>
        </p>
      </div>

      <div className="relative mt-76 flex w-full max-w-[1200px] flex-col items-center gap-16 pb-16 text-12 tracking-[0.024px] text-white sm:flex-row sm:justify-between">
        <img src={footerLogo} alt="GMX" className="h-16 w-[70px]" />
        <p className="text-center">
          <Trans>We reply within ~2 hours during market hours. No obligation — just a conversation.</Trans>
        </p>
        <div className="flex items-center gap-12">
          <a
            href="https://docs.gmx.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Docs</Trans>
          </a>
          <a
            href={`${import.meta.env.VITE_APP_BASE_URL}/stats`}
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Stats</Trans>
          </a>
          <a
            href="/#/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Terms</Trans>
          </a>
        </div>
      </div>
    </section>
  );
}
