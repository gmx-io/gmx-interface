import ButtonLink from "components/Button/ButtonLink";

import logoIcon from "img/logo-icon.svg";
import LogoText from "img/logo-text.svg?react";

export function AppHeaderLogo() {
  return (
    <ButtonLink to="/" className="flex items-center gap-8 px-6 py-4 text-textIcon-strong lg:hidden">
      <img src={logoIcon} alt="GMX Logo" className="block" />
      <LogoText className="hidden md:block" />
    </ButtonLink>
  );
}
