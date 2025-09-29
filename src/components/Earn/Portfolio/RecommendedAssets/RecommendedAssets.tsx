import { Trans } from "@lingui/macro";

import BoltGradientIcon from "img/ic_bolt_gradient.svg?react";

export function RecommendedAssets() {
  return (
    <section className="flex flex-col gap-8">
      <h2 className="flex items-center gap-4 py-20 text-24 font-medium text-typography-primary">
        <BoltGradientIcon className="inline-block size-20" />
        <Trans>Recommended</Trans>
      </h2>

      <div className="flex"></div>
    </section>
  );
}
