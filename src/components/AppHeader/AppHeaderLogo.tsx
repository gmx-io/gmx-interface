import ButtonLink from "components/Button/ButtonLink";

import logoImg from "img/logo_GMX.svg";
import logoSmallImg from "img/logo_GMX_small.svg";

export function AppHeaderLogo() {
  return (
    <ButtonLink to="/" className="flex items-center gap-16 px-6 py-4 lg:hidden">
      <img src={logoSmallImg} alt="GMX Logo" className="block md:hidden" />
      <img src={logoImg} alt="GMX Logo" className="hidden md:block" />
    </ButtonLink>
  );
}
