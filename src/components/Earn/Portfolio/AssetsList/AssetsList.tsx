import { Trans } from "@lingui/macro";

import { ProcessedData } from "lib/legacy";

import { GmxAssetCard } from "./GmxAssetCard";

export function AssetsList({ processedData }: { processedData: ProcessedData | undefined }) {
  if (!processedData) {
    return null;
  }

  const hasGmx = (processedData.gmxBalance ?? 0n) > 0n || (processedData.gmxInStakedGmx ?? 0n) > 0n;
  const hasEsGmx = (processedData.esGmxBalance ?? 0n) > 0n || (processedData.esGmxInStakedGmx ?? 0n) > 0n;

  return (
    <section className="flex flex-col rounded-8 bg-slate-900">
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>My assets</Trans>
      </h2>

      <div className="grid grid-cols-1 gap-12 p-12 md:grid-cols-2 min-[1300px]:grid-cols-3 min-[1660px]:grid-cols-4">
        {hasGmx ? <GmxAssetCard processedData={processedData} /> : null}
        {hasEsGmx ? <GmxAssetCard processedData={processedData} esGmx /> : null}
      </div>
    </section>
  );
}

export default AssetsList;
