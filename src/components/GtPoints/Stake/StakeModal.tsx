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

import { formatMinStakeAmount, getMinStakeAmount } from "../gtPointsFormat";
import { LP_TOKEN_DECIMALS, MIN_STAKE_USD, type GtWalletLpToken } from "../gtPointsTypes";
import { formatLpAmount, formatUsdValue, StakeTokenLabel } from "./StakeTokenLabel";

const minStakeUsdText = formatUsdValue(MIN_STAKE_USD);

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

  const tokens = useMemo(() => wallet.filter((item) => item.balance > 0n), [wallet]);

  const picked = useMemo(
    () =>
      tokens
        .filter((item) => inputs[item.token.id] !== undefined)
        .map((item) => {
          const amount = parseValue(inputs[item.token.id] || "0", LP_TOKEN_DECIMALS) ?? 0n;
          // Each picked token is checked on its own against $1 worth at its current price.
          // Without a price the minimum can't be checked, so the token is blocked.
          const minAmount = getMinStakeAmount(item);
          return {
            item,
            amount,
            minAmount,
            isBelowMin: amount > 0n && (minAmount === undefined || amount < minAmount),
          };
        }),
    [tokens, inputs]
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

  const hasBelowMin = picked.some(({ isBelowMin }) => isBelowMin);

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
      {tokens.length === 0 ? (
        // Nothing to stake yet: explain, and point to Pools, where GLV and GM are bought.
        <div className="flex w-[480px] max-w-full flex-col gap-16">
          <span className="text-body-medium text-typography-secondary">
            <Trans>You have no GLV or GM to stake. Buy some on the Pools page first.</Trans>
          </span>
          <Button variant="primary-action" className="w-full" to="/pools">
            <Trans>Buy GLV / GM</Trans>
          </Button>
        </div>
      ) : (
        <div className="flex w-[480px] max-w-full flex-col gap-16">
          <span className="text-body-small text-typography-secondary">
            <Trans>Pick the tokens to stake and enter the amounts. Each one becomes its own stake position.</Trans>
          </span>

          <div className="flex flex-col gap-8">
            {tokens.map((item) => {
              const closed = isClosed(item);
              const isPicked = inputs[item.token.id] !== undefined;
              const belowMin = picked.find((entry) => entry.item === item && entry.isBelowMin);
              const minStakeText =
                belowMin?.minAmount !== undefined
                  ? formatMinStakeAmount(belowMin.minAmount, item.token.kind)
                  : undefined;

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
                      className="grow text-left"
                      isChecked={isPicked}
                      disabled={closed}
                      setIsChecked={(isChecked) =>
                        setInputs(({ [item.token.id]: _removed, ...rest }) =>
                          isChecked ? { ...rest, [item.token.id]: "" } : rest
                        )
                      }
                    >
                      <span className={cx({ "opacity-50": closed })}>
                        <StakeTokenLabel token={item.token} size={28} />
                      </span>
                    </Checkbox>
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
                    <div className="flex flex-col gap-8">
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
                      {belowMin ? (
                        <span className="text-body-small text-red-500">
                          {minStakeText !== undefined ? (
                            <Trans>
                              Minimum stake is {minStakeText} (≈{minStakeUsdText}).
                            </Trans>
                          ) : (
                            <Trans>Minimum stake is {minStakeUsdText}.</Trans>
                          )}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-10">
            <SyntheticsInfoRow label={<Trans>Tokens to stake</Trans>} value={picked.length} />
            <SyntheticsInfoRow
              label={<Trans>Total value</Trans>}
              value={<span className="numbers">{formatUsdValue(totalValueUsd)}</span>}
            />
            <SyntheticsInfoRow label={<Trans>Starting APR</Trans>} value={<Trans>0%, rising from week 1</Trans>} />
          </div>

          <Button
            variant="primary-action"
            className="w-full"
            disabled={error !== undefined || hasBelowMin}
            onClick={stake}
          >
            {error ?? <Plural value={picked.length} one="Stake # token" other="Stake # tokens" />}
          </Button>
        </div>
      )}
    </Modal>
  );
}
