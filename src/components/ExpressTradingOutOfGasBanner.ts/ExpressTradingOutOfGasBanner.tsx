import { Trans } from "@lingui/macro";
import { useCallback } from "react";
import { useHistory } from "react-router-dom";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import IconInfo from "img/ic_info.svg?react";

export function ExpressTradingOutOfGasBanner({ onClose }: { onClose: () => void }) {
  const history = useHistory();

  const onClick = useCallback(() => {
    history.push(`/trade/swap?to=USDC`);
    onClose();
  }, [history, onClose]);

  return (
    <ColorfulBanner color="slate" icon={<IconInfo />}>
      <div className="ml-2 text-12">
        <Trans>One-click and Express Trading are not available due to insufficient balance.</Trans>
        <br />
        <Button variant="link" className="mt-2 !text-12" onClick={onClick}>
          <Trans>Buy USDC or WETH</Trans>
        </Button>
      </div>
    </ColorfulBanner>
  );
}
