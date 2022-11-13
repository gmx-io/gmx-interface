import { t } from "@lingui/macro";

import arrowIcon from "img/ic_convert_down.svg";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import glp24Icon from "img/ic_glp_24.svg";
import { GM_DECIMALS } from "lib/legacy";
import { bigNumberify, formatAmount } from "lib/numbers";

type Props = {
  onSwapArrowClick: () => void;
};

export function BuyGM(p: Props) {
  return (
    <>
      <BuyInputSection
        topLeftLabel={t`Pay: ${100}$`}
        topRightLabel={t`Balance:`}
        tokenBalance={`${formatAmount(bigNumberify(10000), 30, 4, true)}`}
        inputValue={0}
        onInputValueChange={() => null}
        showMaxButton={false}
        onClickTopRightLabel={() => null}
        onClickMax={() => null}
        balance={"0.0$"}
      />

      <div className="AppOrder-ball-container">
        <div className="AppOrder-ball">
          <img src={arrowIcon} alt="arrowIcon" onClick={p.onSwapArrowClick} />
        </div>
      </div>

      <BuyInputSection
        topLeftLabel={t`Receive: ${100}$`}
        topRightLabel={t`Balance:`}
        tokenBalance={`${formatAmount(bigNumberify(1000), GM_DECIMALS, 4, true)}`}
        inputValue={0}
        onInputValueChange={() => null}
        balance={"0.0$"}
      >
        <div className="selected-token">
          GM <img src={glp24Icon} alt="glp24Icon" />
        </div>
      </BuyInputSection>
    </>
  );
}
