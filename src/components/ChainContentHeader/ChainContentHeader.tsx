import cx from "classnames";

import { AppHeader } from "components/AppHeader/AppHeader";
import { AppHeaderLogo } from "components/AppHeader/AppHeaderLogo";
import { ChainDataImage } from "components/ChainDataImage";

export function ChainContentHeader({
  breadcrumbs,
  leftContentClassName,
  chainId,
  hideChainData,
}: {
  breadcrumbs?: React.ReactNode;
  leftContentClassName?: string;
  chainId?: number;
  hideChainData?: boolean;
}) {
  return (
    <>
      <AppHeader
        leftContent={
          <div className={cx("flex items-center gap-16", leftContentClassName)}>
            <AppHeaderLogo />
            <div className="flex items-center gap-16 max-md:hidden">
              {breadcrumbs}
              {!hideChainData && <ChainDataImage chainId={chainId} />}
            </div>
          </div>
        }
      />
      {(breadcrumbs || !hideChainData) && (
        <div className={cx("flex items-center gap-12 p-8 md:hidden", leftContentClassName)}>
          {breadcrumbs}
          {!hideChainData && <ChainDataImage />}
        </div>
      )}
    </>
  );
}
