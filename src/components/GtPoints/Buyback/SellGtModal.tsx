import { t, Trans } from "@lingui/macro";
import { useEffect, useMemo, useState } from "react";

import { helperToast } from "lib/helperToast";
import { formatAmount, formatAmountFree, parseValue } from "lib/numbers";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Modal from "components/Modal/Modal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import gtIcon from "img/tokens/ic_gt.svg";

import { estimateGtSale, formatGt, formatGtPrice, formatUsdc } from "../gtPointsFormat";
import { GT_DECIMALS, MIN_SELL_GT, type GtBuybackPool } from "../gtPointsTypes";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  availableToSell: bigint;
  pool: GtBuybackPool | undefined;
};

// Every amount problem shows on the disabled button, in GMX's button wording ("Min deposit: $1.00").
function getAmountError(amount: bigint, availableToSell: bigint) {
  if (amount === 0n) return t`Enter an amount`;
  if (amount > availableToSell) return t`Max amount exceeded`;
  if (amount < MIN_SELL_GT) return t`Min sell amount: ${formatAmount(MIN_SELL_GT, GT_DECIMALS, 2)} GT`;
  return undefined;
}

export function SellGtModal({ isVisible, setIsVisible, availableToSell, pool }: Props) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isVisible) setInputValue("");
  }, [isVisible]);

  const amount = useMemo(() => parseValue(inputValue, GT_DECIMALS) ?? 0n, [inputValue]);
  const amountError = getAmountError(amount, availableToSell);

  const estimate = pool ? estimateGtSale(pool, amount) : undefined;
  const estPriceUsd = estimate?.priceUsd;
  const estProceedsUsd = estimate?.proceedsUsd;

  const sell = () => {
    helperToast.success(t`${formatGt(amount)} submitted to the next buyback`);
    setIsVisible(false);
  };

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={<Trans>Sell GT</Trans>}>
      <div className="flex w-[420px] max-w-full flex-col gap-16">
        <BuyInputSection
          topLeftLabel={t`Sell`}
          topRightLabel={t`Available`}
          topRightValue={formatAmount(availableToSell, GT_DECIMALS, 2, true)}
          onClickMax={
            availableToSell > 0n ? () => setInputValue(formatAmountFree(availableToSell, GT_DECIMALS)) : undefined
          }
          inputValue={inputValue}
          onInputValueChange={(event) => setInputValue(event.target.value)}
          maxDecimals={GT_DECIMALS}
        >
          <div className="flex items-center gap-4 py-8">
            <img className="size-24" src={gtIcon} alt="GT" />
            GT
          </div>
        </BuyInputSection>

        <div className="flex flex-col gap-10">
          <SyntheticsInfoRow
            label={<Trans>Est. buyback price</Trans>}
            value={<span className="numbers">{estPriceUsd !== undefined ? formatGtPrice(estPriceUsd) : "–"}</span>}
          />
          <SyntheticsInfoRow
            label={<Trans>Est. proceeds</Trans>}
            value={
              <span className="font-medium text-typography-primary numbers">
                {estProceedsUsd !== undefined ? formatUsdc(estProceedsUsd) : "–"}
              </span>
            }
          />
          <SyntheticsInfoRow label={<Trans>Paid out</Trans>} value={<Trans>Within 24h after the buyback</Trans>} />
        </div>

        <span className="text-body-small text-typography-secondary">
          <Trans>
            The final price is set at the buyback. If more GT is submitted before then, you get less per GT.
          </Trans>
        </span>

        <Button variant="primary-action" className="w-full" disabled={amountError !== undefined} onClick={sell}>
          {amountError ?? <Trans>Sell {formatGt(amount)}</Trans>}
        </Button>
      </div>
    </Modal>
  );
}
