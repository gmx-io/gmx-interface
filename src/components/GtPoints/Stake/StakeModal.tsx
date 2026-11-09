import { plural, Plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useMemo, useState } from "react";

import { formatDateTime } from "lib/dates";
import { helperToast } from "lib/helperToast";
import { formatAmountFree, parseValue } from "lib/numbers";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import NumberInput from "components/NumberInput/NumberInput";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";

import LockIcon from "img/ic_lock.svg?react";

import { LP_TOKEN_DECIMALS, type GtWalletLpToken } from "../gtPointsTypes";
import { formatLpAmount, formatUsdValue, StakeTokenLabel } from "./StakeTokenLabel";

type Props = {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  wallet: GtWalletLpToken[];
};

export function StakeModal({ isVisible, setIsVisible, wallet }: Props) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const now = Math.floor(Date.now() / 1000);

  useEffect(() => {
    if (!isVisible) setInputs({});
  }, [isVisible]);

  const isClosed = (item: GtWalletLpToken) => item.token.closedUntil !== undefined && item.token.closedUntil > now;

  const picked = useMemo(
    () =>
      wallet
        .filter((item) => inputs[item.token.id] !== undefined)
        .map((item) => ({ item, amount: parseValue(inputs[item.token.id] || "0", LP_TOKEN_DECIMALS) ?? 0n })),
    [wallet, inputs]
  );

  const totalValueUsd = picked.reduce(
    (sum, { item, amount }) => (item.balance > 0n ? sum + (item.valueUsd * amount) / item.balance : sum),
    0n
  );

  const error =
    picked.length === 0
      ? t`Select a token`
      : picked.some(({ amount }) => amount === 0n)
        ? t`Enter an amount`
        : picked.some(({ item, amount }) => amount > item.balance)
          ? t`Max amount exceeded`
          : undefined;

  const stake = () => {
    helperToast.success(
      picked.length === 1
        ? t`Staked ${formatLpAmount(picked[0].amount, picked[0].item.token)}`
        : t`Staked ${plural(picked.length, { one: "# token", other: "# tokens" })}`
    );
    setIsVisible(false);
  };

  return (
    <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={<Trans>Stake GLV / GM</Trans>}>
      <div className="flex w-[480px] max-w-full flex-col gap-16">
        <span className="text-body-small text-typography-secondary">
          <Trans>Pick the tokens to stake and enter the amounts. Each one becomes its own stake position.</Trans>
        </span>

        {wallet.length === 0 ? (
          <div className="rounded-8 bg-slate-800 p-16 text-center text-typography-secondary">
            <Trans>You have no GLV or GM to stake yet.</Trans>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {wallet.map((item) => {
              const closed = isClosed(item);
              const isPicked = inputs[item.token.id] !== undefined;

              return (
                <div
                  key={item.token.id}
                  className={cx("flex flex-col gap-12 rounded-8 border-1/2 p-12", {
                    "border-blue-300 bg-slate-800": isPicked,
                    "border-slate-600": !isPicked,
                  })}
                >
                  <div className="flex items-center gap-10">
                    <Checkbox
                      isChecked={isPicked}
                      disabled={closed}
                      setIsChecked={(isChecked) =>
                        setInputs(({ [item.token.id]: _removed, ...rest }) =>
                          isChecked ? { ...rest, [item.token.id]: "" } : rest
                        )
                      }
                    />
                    <span className={cx("grow", { "opacity-50": closed })}>
                      <StakeTokenLabel token={item.token} size={28} />
                    </span>
                    <span className={cx("flex flex-col items-end", { "opacity-50": closed })}>
                      <span className="text-body-medium numbers">{formatLpAmount(item.balance, item.token)}</span>
                      <span className="text-body-small text-typography-secondary numbers">
                        {formatUsdValue(item.valueUsd)}
                      </span>
                    </span>
                  </div>

                  {closed ? (
                    <div className="text-body-small flex items-start gap-6 text-yellow-300">
                      <LockIcon className="mt-1 size-14 shrink-0" />
                      <Trans>
                        Market closed. This market has trading hours, so its {item.token.kind} can be staked only while
                        it's open. Opens {formatDateTime(item.token.closedUntil!)}.
                      </Trans>
                    </div>
                  ) : null}

                  {isPicked ? (
                    <div className="flex items-center gap-8 rounded-8 bg-slate-900 px-12 py-8">
                      <NumberInput
                        value={inputs[item.token.id]}
                        onValueChange={(event) =>
                          setInputs((current) => ({ ...current, [item.token.id]: event.target.value }))
                        }
                        className="bg-transparent text-body-large min-w-0 grow font-medium outline-none numbers"
                        placeholder="0.0"
                      />
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() =>
                          setInputs((current) => ({
                            ...current,
                            [item.token.id]: formatAmountFree(item.balance, LP_TOKEN_DECIMALS),
                          }))
                        }
                      >
                        <Trans>Max</Trans>
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-10">
          <SyntheticsInfoRow label={<Trans>Tokens to stake</Trans>} value={picked.length} />
          <SyntheticsInfoRow
            label={<Trans>Total value</Trans>}
            value={<span className="numbers">{formatUsdValue(totalValueUsd)}</span>}
          />
          <SyntheticsInfoRow label={<Trans>Starting APR</Trans>} value={<Trans>0%, rising from week 1</Trans>} />
        </div>

        <Button variant="primary-action" className="w-full" disabled={error !== undefined} onClick={stake}>
          {error ?? <Plural value={picked.length} one="Stake # token" other="Stake # tokens" />}
        </Button>
      </div>
    </Modal>
  );
}
