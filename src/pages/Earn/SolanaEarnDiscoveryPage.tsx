import EarnPageLayout from "pages/Earn/EarnPageLayout";

import { SolanaEarnFaq } from "components/Earn/Discovery/EarnFaq";
import EarnProductCard from "components/Earn/Discovery/EarnProductCard";

export default function SolanaEarnDiscoveryPage() {
  return (
    <EarnPageLayout>
      <div className="flex gap-8 max-md:flex-col">
        <div className="flex grow flex-col">
          <div className="grid gap-8 xl:grid-cols-3">
            <EarnProductCard type="gt" />
            <EarnProductCard type="glv" />
            <EarnProductCard type="gm" />
          </div>
        </div>

        <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
          <SolanaEarnFaq />
        </div>
      </div>
    </EarnPageLayout>
  );
}
