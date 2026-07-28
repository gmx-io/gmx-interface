import { Trans } from "@lingui/macro";

import IcGmxFooter from "img/ic_gmx_footer.svg?react";

import { GMX_DOCS_URL } from "../constants";

export function BuildersFooter() {
  return (
    <footer className="relative w-full px-16 py-16 sm:px-40">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-16 text-12 text-white sm:flex-row">
        <IcGmxFooter className="h-24" />
        <div className="flex items-center gap-12">
          <a
            href={GMX_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Docs</Trans>
          </a>
          <a
            href="https://stats.gmx.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Stats</Trans>
          </a>
          <a
            href="/#/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="duration-180 transition-colors hover:text-white/80"
          >
            <Trans>Terms</Trans>
          </a>
        </div>
      </div>
    </footer>
  );
}
