import ButtonLink from "components/Button/ButtonLink";

import logoIcon from "img/logo-icon.svg";
import LogoText from "img/logo-text.svg?react";
import { t } from "@lingui/macro";

export function AppHeaderLogo() {
  return (
    <ButtonLink to="/" className="flex items-center gap-8 px-6 py-4 text-typography-primary lg:hidden">
      <img src={logoIcon} alt={t`GMX logo`} className="block" />
      <LogoText className="hidden md:block" />
    </ButtonLink>
  );
}
