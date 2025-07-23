import { t } from "@lingui/macro";

import GlpSwap from "components/Glp/GlpSwap";
import PageTitle from "components/PageTitle/PageTitle";

import "./BuyGlp.css";

export default function BuyGlp() {
  return (
    <div className="default-container page-layout">
      <PageTitle
        title={t`Sell GLP`}
        subtitle={t`GMX V1 markets are disabled and only allow for position closing. GLP is being phased out and no longer supports GMX V1 markets.`}
        isTop
        qa="buy-glp-page"
      />
      <GlpSwap isBuying={false} />
    </div>
  );
}
