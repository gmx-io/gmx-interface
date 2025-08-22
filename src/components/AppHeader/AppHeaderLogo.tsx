import ButtonLink from "components/Button/ButtonLink";

import logoIcon from "img/logo_GMX.svg";
import logoSmallIcon from "img/logo_GMX_small.svg";

export function AppHeaderLogo() {
  return (
    <ButtonLink to="/" className="flex items-center gap-16 px-6 py-4 text-textIcon-strong lg:hidden">
      <img src={logoSmallIcon} alt="GMX Logo" className="block md:hidden" />
      <img src={logoIcon} alt="GMX Logo" className="hidden md:block" />
    </ButtonLink>
  );
}
