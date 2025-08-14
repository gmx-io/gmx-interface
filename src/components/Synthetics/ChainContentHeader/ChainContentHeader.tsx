import cx from "classnames";

import { AppHeader } from "components/AppHeader/AppHeader";
import { AppHeaderLogo } from "components/AppHeader/AppHeaderLogo";
import { ChainDataImage } from "components/ChainDataImage";

export function ChainContentHeader({
  breadcrumbs,
  leftContentClassName,
}: {
  breadcrumbs?: React.ReactNode;
  leftContentClassName?: string;
}) {
  return (
    <>
      <AppHeader
        leftContent={
          <div className={cx("flex items-center gap-16", leftContentClassName)}>
            <AppHeaderLogo />
            <div className="flex items-center gap-16 max-md:hidden">
              {breadcrumbs}
              <ChainDataImage />
            </div>
          </div>
        }
      />
      <div className={cx("flex items-center gap-16 pt-8 px-8 md:hidden", leftContentClassName)}>
        {breadcrumbs}
        <ChainDataImage />
      </div>
    </>
  );
}
