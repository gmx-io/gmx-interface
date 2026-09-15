import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { SOCIAL_LINKS } from "landing/pages/Home/constants/SociaLinks";
import { RedirectChainIds, useGoToTrade } from "landing/pages/Home/hooks/useGoToTrade";
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import IcBurger from "img/ic_burger_menu.svg?react";
import IcCross from "img/ic_cross.svg?react";
import IcGmxHeader from "img/ic_gmx_header.svg?react";

type Props = {
  badge?: ReactNode;
};

export function HeaderMenu({ badge }: Props = {}) {
  const goToTradeArbitrum = useGoToTrade({
    buttonPosition: "MenuButton",
    chainId: RedirectChainIds.Arbitum,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = () => setIsMenuOpen(false);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  const headerLinks = useHeaderLinks();
  const hasAdditionalContent = Boolean(badge);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <div
      data-landing-header
      className={cx(
        "fixed left-0 top-0 z-30 flex w-full flex-col bg-slate-900 text-white",
        isMenuOpen && (hasAdditionalContent ? "h-screen xl:h-auto" : "h-screen lg:h-auto")
      )}
    >
      <div className="flex w-full items-center justify-center px-16 py-12 sm:px-40 sm:py-16">
        <div className="flex w-full max-w-[1200px] items-center justify-between gap-16">
          <div className="flex shrink-0 items-center gap-8 sm:gap-24">
            <Link to="/" aria-label="GMX" onClick={closeMenu}>
              <IcGmxHeader className="h-20 sm:h-24" />
            </Link>
            {badge}
          </div>
          <div className="flex shrink-0 items-center gap-8 sm:gap-12">
            <div
              className={cx(
                "leading-body-sm mr-36 hidden flex-row gap-22 text-14 font-medium -tracking-[0.448px]",
                hasAdditionalContent ? "xl:flex" : "lg:flex"
              )}
            >
              {headerLinks.map((link) => (
                <HeaderLink
                  href={link.href}
                  className="duration-180 px-6 py-8 transition-colors hover:text-white/80 active:text-white/60"
                  key={link.label}
                  onClick={closeMenu}
                >
                  {link.label}
                </HeaderLink>
              ))}
            </div>
            <button
              className={cx(
                "btn-landing rounded-8 px-16 py-10 text-14 leading-[16px]",
                isMenuOpen && (hasAdditionalContent ? "hidden xl:block" : "hidden lg:block")
              )}
              onClick={goToTradeArbitrum}
            >
              <Trans>Open app</Trans>
            </button>
            <button
              className={cx("flex size-36 rounded-8 text-white", hasAdditionalContent ? "xl:hidden" : "lg:hidden", {
                "bg-slate-700": isMenuOpen,
              })}
              aria-label={isMenuOpen ? t`Close menu` : t`Open menu`}
              aria-expanded={isMenuOpen}
              aria-controls="landing-mobile-menu"
              onClick={toggleMenu}
            >
              {!isMenuOpen && <IcBurger className="m-auto size-24" />}
              {isMenuOpen && <IcCross className="m-auto size-12" />}
            </button>
          </div>
        </div>
      </div>
      {isMenuOpen && (
        <div
          id="landing-mobile-menu"
          className={cx(
            "flex h-full min-h-0 w-full flex-col overflow-y-auto px-16 pb-20 pt-8",
            hasAdditionalContent ? "xl:hidden" : "lg:hidden"
          )}
        >
          <div className="mb-32 flex flex-col text-14">
            {headerLinks.map((link) => (
              <HeaderLink
                href={link.href}
                key={link.label}
                className="border-t-1/2 border-slate-600 py-12 last:border-b-1/2"
                onClick={closeMenu}
              >
                {link.label}
              </HeaderLink>
            ))}
          </div>
          <button className="btn-landing w-full rounded-8 px-16 py-10 text-14" onClick={goToTradeArbitrum}>
            <Trans>Open app</Trans>
          </button>
          <div className="mt-auto flex w-full flex-col items-center gap-20 text-12 text-slate-500">
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

function HeaderLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  return href.startsWith("/") ? <Link to={href} {...props} /> : <a href={href} {...props} />;
}

function useHeaderLinks() {
  return useMemo(() => {
    return [
      {
        label: t`Rewards`,
        href: "/rewards",
      },
      {
        label: t`VIP`,
        href: "/trader-affiliate-program",
      },
      {
        label: t`Builders`,
        href: "/builders",
      },
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
