import { useState } from "react";

import { BuyGmxModal } from "pages/BuyGMX/BuyGmxModal";
import EarnPageLayout from "pages/Earn/EarnPageLayout";

import EarnFaq from "components/Earn/Discovery/EarnFaq";
import EarnProductCard from "components/Earn/Discovery/EarnProductCard";

export default function EarnDiscoveryPage() {
  const [isBuyGmxModalVisible, setIsBuyGmxModalVisible] = useState(false);

  return (
    <EarnPageLayout>
      <BuyGmxModal isVisible={isBuyGmxModalVisible} setIsVisible={setIsBuyGmxModalVisible} />

      <div className="flex gap-8 max-md:flex-col">
        <div className="flex grow flex-col">
          <div className="grid gap-8 xl:grid-cols-3">
            <EarnProductCard type="gmx" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
            <EarnProductCard type="glv" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
            <EarnProductCard type="gm" openBuyGmxModal={() => setIsBuyGmxModalVisible(true)} />
          </div>
        </div>

        <div className="flex w-[400px] shrink-0 flex-col gap-8 max-md:w-full">
          <EarnFaq />
        </div>
      </div>
    </EarnPageLayout>
  );
}
