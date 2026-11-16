import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import logoEnzyme from "img/builders_logo_enzyme.svg";
import logoPrismfi from "img/builders_logo_prismfi.svg";
import logoToros from "img/builders_logo_toros.svg";
import logoVooi from "img/builders_logo_vooi.svg";
import IcLinkArrow from "img/ic_link_arrow.svg?react";

import { Eyebrow } from "../Eyebrow";

type Project = {
  name: string;
  logo: string;
  href?: string;
};

export function EcosystemSection() {
  const categories = [t`AI agents`, t`Risk / hedging`, t`Treasury`, t`Frontends`, t`Yield`, t`Infrastructure`];

  const projects: Project[] = [
    { name: "PrismFi", logo: logoPrismfi, href: "https://prismfi.cc/swap" },
    { name: "Enzyme", logo: logoEnzyme, href: "https://enzyme.finance/" },
    { name: "Vooi", logo: logoVooi, href: "https://vooi.io/" },
    { name: "Toros", logo: logoToros, href: "https://toros.finance/" },
  ];

  const cardClassName =
    "group flex min-h-[154px] flex-col justify-between rounded-20 border-1/2 border-slate-400/50 bg-white p-20 shadow-[0_6px_8px_-6px_#BEC0DA] transition-transform duration-180";

  return (
    <section className="bg-light-150 w-full px-16 py-60 text-slate-900 sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <Eyebrow>
          <Trans>Ecosystem</Trans>
        </Eyebrow>
        <h2 className="text-heading-2 mt-20">
          <Trans>What people are building.</Trans>
        </h2>
        <div className="mt-20 flex flex-wrap gap-12">
          {categories.map((category) => (
            <span
              key={category}
              className="flex h-36 items-center rounded-full border-[1px] border-blue-400 px-16 text-16 -tracking-[0.512px] text-blue-400"
            >
              {category}
            </span>
          ))}
        </div>
        <h3 className="mt-44 text-[28px] font-medium -tracking-[0.896px] text-slate-900">
          <Trans>Already live</Trans>
        </h3>
        <div className="mt-22 grid grid-cols-2 gap-20 lg:grid-cols-4">
          {projects.map((project) => {
            const content = (
              <>
                <img src={project.logo} alt={project.name} className="size-60 select-none" />
                <div className="flex items-center justify-between">
                  <span className="text-24 font-medium -tracking-[0.768px]">{project.name}</span>
                  <span className="flex size-16 items-center justify-center rounded-full bg-slate-900">
                    <IcLinkArrow className="size-8 text-white" />
                  </span>
                </div>
              </>
            );
            return project.href ? (
              <a
                key={project.name}
                href={project.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cx(cardClassName, "hover:-translate-y-4")}
              >
                {content}
              </a>
            ) : (
              <div key={project.name} className={cardClassName}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
