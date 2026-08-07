import { Trans } from "@lingui/macro";
import { Eyebrow } from "landing/pages/Builders/Eyebrow";
import { CodeSnippet } from "landing/pages/Builders/HeroSection/CodeSnippet";


import programGlow from "img/home_program_glow.png";
import vipCoins from "img/home_program_vip_coins.png";
import IcLinkArrow from "img/ic_link_arrow.svg?react";

function CardButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="btn-landing mt-[18px] inline-flex h-44 w-fit items-center gap-8 rounded-8 px-16 text-16 -tracking-[0.512px]"
    >
      {children}
      <span className="flex size-16 flex-shrink-0 items-center justify-center rounded-full bg-white">
        <IcLinkArrow className="size-8 text-black" />
      </span>
    </a>
  );
}

export function ProgramCards() {
  const cardClassName =
    "relative flex flex-col overflow-hidden rounded-20 border-1/2 border-slate-600/50 bg-slate-800 p-36 shadow-[0_6px_8px_-6px_#000]";

  return (
    <div className="relative w-full px-16 sm:px-40">
      <img
        src={programGlow}
        alt=""
        className="pointer-events-none absolute left-1/2 top-[236px] hidden h-[767px] w-[1728px] max-w-none -translate-x-1/2 select-none lg:block"
      />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col">
        <h2 className="leading-heading-lg sm:text-100 text-[min(50px,14vw)] font-medium -tracking-[0.052em] sm:-tracking-[5.2px]">
          <Trans>
            Built for those
            <br />
            who do more.
          </Trans>
        </h2>
        <div className="mt-40 grid w-full grid-cols-1 gap-24 lg:grid-cols-2">
          <div className={cardClassName}>
            <img
              src={vipCoins}
              alt=""
              className="pointer-events-none absolute right-0 top-0 hidden h-full w-[132px] select-none object-cover lg:block"
            />
            <div className="relative flex flex-wrap gap-8">
              <Eyebrow gradient>
                <Trans>For large traders</Trans>
              </Eyebrow>
              <Eyebrow gradient>
                <Trans>For affiliates</Trans>
              </Eyebrow>
            </div>
            <h3 className="relative mt-20 text-[40px] font-medium leading-[48px] -tracking-[1.2px]">
              <Trans>
                Trade size.
                <br />
                Or refer those who do.
              </Trans>
            </h3>
            <p className="relative mt-4 text-16 leading-[20px] -tracking-[0.512px] text-slate-500">
              <Trans>
                Up to 25% off fees for high-volume traders.
                <br />
                Up to 25% earnings for affiliates.
                <br />
                Plus personal support.
              </Trans>
            </p>
            <CardButton href="/#/trader-affiliate-program">
              <Trans>Explore the VIP Desk</Trans>
            </CardButton>
          </div>

          <div className={cardClassName}>
            <CodeSnippet className="pointer-events-none absolute left-[456px] top-[-47px] hidden w-[500px] origin-top-left scale-[0.9224] lg:block" />
            <div className="relative flex flex-wrap gap-8">
              <Eyebrow gradient>
                <Trans>For developers & teams</Trans>
              </Eyebrow>
              <Eyebrow gradient>
                <Trans>Integrate GMX</Trans>
              </Eyebrow>
            </div>
            <h3 className="relative mt-20 text-[40px] font-medium leading-[48px] -tracking-[1.2px]">
              <Trans>
                Build on GMX. Get
                <br />
                paid on every trade.
              </Trans>
            </h3>
            <p className="relative mt-4 text-16 leading-[20px] -tracking-[0.512px] text-slate-500">
              <Trans>
                Onchain revenue in stablecoins — your own builder
                <br />
                fee plus a cut of GMX's fees, every time someone trades
                <br />
                through you.
              </Trans>
            </p>
            <CardButton href="/#/builders">
              <Trans>Explore the Builder Program</Trans>
            </CardButton>
          </div>
        </div>
      </div>
    </div>
  );
}
