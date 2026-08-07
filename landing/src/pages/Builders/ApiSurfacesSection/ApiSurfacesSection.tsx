import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import sdkCardGlow from "img/builders_sdk_card_glow.svg";
import IcLinkArrow from "img/ic_link_arrow.svg?react";

import { SDK_QUICKSTART_URL } from "../constants";
import { Eyebrow } from "../Eyebrow";

export function ApiSurfacesSection() {
  const cards = [
    {
      title: t`Rest API`,
      description: t`Prices, markets, positions, orders — one call away.`,
      path: "docs/api/rest-api/",
      href: "https://docs.gmx.io/docs/api/gmx-api/gmx-io-gmx-public-api/",
      highlighted: false,
    },
    {
      title: t`TypeScript SDK`,
      description: t`Start trading in under 5 minutes`,
      path: "docs/sdk/overview/",
      href: SDK_QUICKSTART_URL,
      highlighted: true,
    },
    {
      title: t`Squid GraphQL`,
      description: t`Query historical chain data fast.`,
      path: "docs/api/graphql/",
      href: "https://docs.gmx.io/docs/api/graphql/",
      highlighted: false,
    },
    {
      title: t`Smart Contracts`,
      description: t`Direct smart contract integration`,
      path: "docs/api/contracts/",
      href: "https://docs.gmx.io/docs/api/contracts/",
      highlighted: false,
    },
  ];

  return (
    <section className="bg-light-150 w-full px-16 py-60 text-slate-900 sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <Eyebrow>
          <Trans>API Surfaces</Trans>
        </Eyebrow>
        <h2 className="text-heading-2 mt-20">
          <Trans>Four ways in.</Trans>
        </h2>
        <p className="text-18 mt-18 text-slate-900">
          <Trans>Pick what fits your stack. Everything's documented.</Trans>
        </p>
        <div className="mt-28 grid grid-cols-1 gap-20 sm:mt-44 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(
                "duration-180 relative flex min-h-[216px] flex-col overflow-hidden rounded-20 p-28 shadow-[0_6px_8px_-6px_#BEC0DA] transition-transform hover:-translate-y-4",
                card.highlighted ? "bg-slate-900 text-white" : "border-1/2 border-slate-400/50 bg-white text-slate-900"
              )}
            >
              {card.highlighted && (
                <img
                  src={sdkCardGlow}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                />
              )}
              <div className="relative flex flex-col">
                <h3 className="text-[28px] font-medium leading-base -tracking-[0.896px]">{card.title}</h3>
                <p
                  className={cx(
                    "mt-4 text-16 -tracking-[0.512px]",
                    card.highlighted ? "text-blue-100" : "text-slate-600"
                  )}
                >
                  {card.description}
                </p>
              </div>
              <div
                className={cx(
                  "relative mt-auto flex items-center justify-between text-16 -tracking-[0.512px]",
                  card.highlighted ? "text-blue-300" : "text-blue-400"
                )}
              >
                {card.path}
                <span
                  className={cx(
                    "flex size-16 items-center justify-center rounded-full",
                    card.highlighted ? "bg-blue-300" : "bg-blue-400"
                  )}
                >
                  <IcLinkArrow className={cx("size-8", card.highlighted ? "text-slate-900" : "text-white")} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
