import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { useMemo, useState } from "react";

import { SOCIAL_LINKS } from "landing/Home/constants/SociaLinks";

import IcBurger from "img/ic_burger.svg?react";
import IcCross from "img/ic_cross.svg?react";
import IcGmxHeader from "img/ic_gmx_header.svg?react";

import { REDIRECT_CHAIN_IDS, useGoToTrade } from "../hooks/useGoToTrade";

export function HeaderMenu() {
  const goToTradeArbitrum = useGoToTrade({
    buttonPosition: "MenuButton",
    chainId: REDIRECT_CHAIN_IDS.Arbitum,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  const headerLinks = useHeaderLinks();

  return (
    <div
      className={cx("bg-fiord-700 fixed left-0 top-0 z-10 flex w-full flex-col text-white", {
        "h-screen": isMenuOpen,
      })}
    >
      <div className="flex w-full items-center justify-center px-16 py-12 sm:px-40 sm:py-16">
        <div className="flex w-[1200px] items-center justify-between">
          <IcGmxHeader className="h-20 sm:h-24" />
          <div className="flex items-center gap-8 sm:gap-12">
            <div className="leading-body-sm mr-36 hidden flex-row gap-28 text-14 font-medium -tracking-[0.448px] sm:flex">
              {headerLinks.map((link) => (
                <a href={link.href} key={link.label}>
                  {link.label}
                </a>
              ))}
            </div>
            {!isMenuOpen && (
              <button className="btn-landing rounded-8 px-16 py-10 text-14" onClick={goToTradeArbitrum}>
                <Trans>Open App</Trans>
              </button>
            )}
            <button
              className={cx("flex size-36 rounded-8 text-white sm:hidden", {
                "bg-[#1E2033]": isMenuOpen,
              })}
              onClick={toggleMenu}
            >
              {!isMenuOpen && <IcBurger className="m-auto size-24" />}
              {isMenuOpen && <IcCross className="m-auto size-12" />}
            </button>
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <div className="flex h-full w-full flex-col px-16 pb-20 pt-8">
          <div className="mb-32 flex flex-col">
            {headerLinks.map((link) => (
              <a
                href={link.href}
                key={link.label}
                className="border-fiord-500 border-t-[0.5px] py-12 last:border-b-[0.5px]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <button className="btn-landing w-full rounded-8 px-16 py-10 text-14" onClick={goToTradeArbitrum}>
            <Trans>Open App</Trans>
          </button>
          <div className="mt-auto flex w-full flex-col items-center gap-20 text-slate-100">
            <p>
              <Trans>Driven by our community</Trans>
            </p>
            <div className="flex flex-row gap-20">
              {SOCIAL_LINKS.map((link) => (
                <button key={link.name} onClick={link.onClick}>
                  <link.IconComponent className="size-20" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useHeaderLinks() {
  return useMemo(() => {
    return [
      {
        label: t`Protocol`,
        href: "https://github.com/gmx-io",
      },
      {
        label: t`Governance`,
        href: "https://gov.gmx.io/",
      },
      {
        label: t`Voting`,
        href: "https://snapshot.org/#/gmx.eth",
      },
      {
        label: t`Docs`,
        href: "https://docs.gmx.io/",
      },
    ];
  }, []);
}
