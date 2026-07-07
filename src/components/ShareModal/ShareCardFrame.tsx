import { Trans } from "@lingui/macro";
import cx from "classnames";
import { forwardRef, useMemo, type ReactNode } from "react";

import SpinningLoader from "components/Loader/SpinningLoader";

type Props = {
  bgImgUrl: string | null;
  loading: boolean;
  cardClassName?: string;
  children: ReactNode;
};

export const ShareCardFrame = forwardRef<HTMLDivElement, Props>(
  ({ bgImgUrl, loading, cardClassName, children }, ref) => {
    const style = useMemo(() => ({ backgroundImage: `url(${bgImgUrl})` }), [bgImgUrl]);

    return (
      <div className="relative max-w-[460px] grow overflow-hidden rounded-9 md:min-w-[460px]">
        <div
          ref={ref}
          className={cx(
            "aspect-[460/240] w-full rounded-9 bg-contain bg-no-repeat p-20 pb-28 max-md:p-16",
            cardClassName
          )}
          style={style}
        >
          {children}
        </div>
        {loading && (
          <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center gap-8 rounded-b-8 bg-[#22243a] px-8 py-6 text-12">
            <SpinningLoader className="size-14" />
            <p className="font-medium text-white">
              <Trans>Generating shareable image...</Trans>
            </p>
          </div>
        )}
      </div>
    );
  }
);
