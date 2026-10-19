import { useEffect, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { formatAmountFree } from "lib/numbers";

import Button from "components/Button/Button";

import {
  buildRewardsTesterEarnData,
  getRewardsTesterEarnScenario,
  getRewardsTesterEarnScenarioState,
  REWARDS_TESTER_EARN_FIELD_SECTIONS,
  REWARDS_TESTER_EARN_SCENARIO_GROUPS,
  REWARDS_TESTER_EARN_SCENARIOS,
  REWARDS_TESTER_EARN_TOGGLE_FIELDS,
  type RewardsTesterEarnToggles,
  type RewardsTesterEarnValues,
} from "./rewardsTesterEarnFixtures";
import { REWARDS_TESTER_CUSTOM_SCENARIO_ID, REWARDS_TESTER_LIVE_SCENARIO_ID } from "./rewardsTesterFixtures";
import { runRewardsTesterPageSteps, type RewardsTesterPageStep } from "./rewardsTesterPageActions";
import { resetRewardsTesterEarnState, setRewardsTesterState, useRewardsTesterState } from "./useRewardsTester";
import { useRewardsTesterEarnData } from "./useRewardsTesterEarn";

const REWARDS_TESTER_EARN_INPUT_CLASSNAME =
  "h-32 w-full min-w-0 rounded-4 border-1/2 border-stroke-primary bg-slate-950 px-8 text-13 text-typography-primary outline-none focus:border-blue-300 disabled:opacity-50";

const REWARDS_TESTER_EARN_LABEL_CLASSNAME = "flex min-w-0 flex-col gap-4 text-12 text-typography-secondary";

const REWARDS_TESTER_EARN_SECTION_TITLE_CLASSNAME =
  "cursor-pointer select-none py-2 text-12 font-medium text-typography-secondary";

const REWARDS_TESTER_EARN_PORTFOLIO_PATH = "/earn/portfolio";
const REWARDS_TESTER_EARN_DISTRIBUTIONS_PATH = "/earn/distributions";
const REWARDS_TESTER_EARN_BUY_GMX_PARAM = "buyGmx";

const REWARDS_TESTER_EARN_SCENARIO_SECTIONS = REWARDS_TESTER_EARN_SCENARIO_GROUPS.map((group) => ({
  group,
  scenarios: REWARDS_TESTER_EARN_SCENARIOS.filter((scenario) => scenario.group === group),
})).filter((section) => section.scenarios.length > 0);

export function getRewardsTesterEarnScenarioLabel(scenarioId: string) {
  if (scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID) return "Live";
  if (scenarioId === REWARDS_TESTER_CUSTOM_SCENARIO_ID) return "Custom values";

  return getRewardsTesterEarnScenario(scenarioId)?.label ?? "Custom values";
}

// Body of the Tester window for the Earn pages; same structure as the Rewards context.
export function RewardsTesterEarnSection() {
  const { earn } = useRewardsTesterState();
  const earnData = useRewardsTesterEarnData();
  const history = useHistory();
  const { pathname, search } = useLocation();
  const [formValues, setFormValues] = useState(earn.values);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const cancelStepsRef = useRef<() => void>();
  const isLive = earn.scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID;
  const activeScenarioGroup = getRewardsTesterEarnScenario(earn.scenarioId)?.group;

  useEffect(() => {
    setFormValues(earn.values);
    setError(undefined);
  }, [earn.values]);

  useEffect(() => () => cancelStepsRef.current?.(), []);

  const applyScenario = (scenarioId: string) => {
    const scenarioState = getRewardsTesterEarnScenarioState(scenarioId);
    if (!scenarioState) return;

    setRewardsTesterState({ earn: scenarioState });
    setNotice(undefined);
  };

  const updateToggle = (key: keyof RewardsTesterEarnToggles, value: string) => {
    setRewardsTesterState({
      earn: { ...earn, toggles: { ...earn.toggles, [key]: value } as RewardsTesterEarnToggles },
    });
  };

  const updateValue = (key: keyof RewardsTesterEarnValues, value: string) => {
    setFormValues((current) => ({ ...current, [key]: value }) as RewardsTesterEarnValues);
    setError(undefined);
  };

  const applyValues = () => {
    if (!buildRewardsTesterEarnData(formValues, earn.toggles)) {
      setError("Enter a non-negative number in every field (power share 0–100, positions 0–24).");
      return;
    }

    setRewardsTesterState({ earn: { ...earn, scenarioId: REWARDS_TESTER_CUSTOM_SCENARIO_ID, values: formValues } });
  };

  const runOnPage = (path: string, steps: RewardsTesterPageStep[], missingNotice: string) => {
    setNotice(undefined);
    cancelStepsRef.current?.();

    if (!pathname.startsWith(path)) {
      history.push({ pathname: path, search });
    }

    cancelStepsRef.current = runRewardsTesterPageSteps(steps, () => setNotice(missingNotice));
  };

  const openUnstake = (percentOfSafeLimit: bigint) => {
    const safeUnstakeLimit = earnData?.safeUnstakeLimit;

    if (safeUnstakeLimit === undefined || safeUnstakeLimit === 0n) {
      setNotice("Needs staked GMX with loyalty tracking, e.g. the GMX staker scenario.");
      return;
    }

    const amount = formatAmountFree((safeUnstakeLimit * percentOfSafeLimit) / 100n, 18, 4);

    runOnPage(
      REWARDS_TESTER_EARN_PORTFOLIO_PATH,
      [{ click: "Stake GMX" }, { click: "Unstake", scope: "dialog" }, { type: amount }],
      "Could not open the Unstake tab. Pick a scenario with a GMX card."
    );
  };

  const openBuyGmx = () => {
    setNotice(undefined);
    const searchParams = new URLSearchParams(search);
    searchParams.set(REWARDS_TESTER_EARN_BUY_GMX_PARAM, "1");
    history.push({ pathname: REWARDS_TESTER_EARN_PORTFOLIO_PATH, search: `?${searchParams.toString()}` });
  };

  return (
    <>
      <Button
        variant={isLive ? "primary" : "secondary"}
        size="small"
        onClick={() => setRewardsTesterState({ earn: { ...earn, scenarioId: REWARDS_TESTER_LIVE_SCENARIO_ID } })}
      >
        Live (no test data)
      </Button>

      <div className="flex flex-col gap-8">
        {REWARDS_TESTER_EARN_SCENARIO_SECTIONS.map(({ group, scenarios }) => (
          <details key={group} open={group === activeScenarioGroup}>
            <summary className={REWARDS_TESTER_EARN_SECTION_TITLE_CLASSNAME}>{group}</summary>
            <div className="mt-6 flex flex-wrap gap-6">
              {scenarios.map((scenario) => (
                <Button
                  key={scenario.id}
                  variant={scenario.id === earn.scenarioId ? "primary" : "secondary"}
                  size="small"
                  title={scenario.hint}
                  onClick={() => applyScenario(scenario.id)}
                >
                  {scenario.label}
                </Button>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="h-1 w-full shrink-0 bg-slate-700" />

      <details>
        <summary className={REWARDS_TESTER_EARN_SECTION_TITLE_CLASSNAME}>
          Areas {isLive ? "(pick a scenario first)" : "(combine with any scenario)"}
        </summary>
        <div className="mt-6 grid grid-cols-2 gap-8">
          {REWARDS_TESTER_EARN_TOGGLE_FIELDS.map((field) => (
            <label key={field.key} className={REWARDS_TESTER_EARN_LABEL_CLASSNAME}>
              {field.label}
              <select
                aria-label={field.label}
                value={earn.toggles[field.key]}
                disabled={isLive}
                onChange={(event) => updateToggle(field.key, event.target.value)}
                className={REWARDS_TESTER_EARN_INPUT_CLASSNAME}
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>

      <details>
        <summary className={REWARDS_TESTER_EARN_SECTION_TITLE_CLASSNAME}>Modals</summary>
        <div className="mt-6 flex flex-wrap gap-6">
          <Button
            variant="secondary"
            size="small"
            onClick={() =>
              runOnPage(REWARDS_TESTER_EARN_PORTFOLIO_PATH, [{ click: "Stake GMX" }], "No GMX card on this scenario.")
            }
          >
            Stake
          </Button>
          <Button variant="secondary" size="small" onClick={() => openUnstake(80n)}>
            Unstake (yellow)
          </Button>
          <Button variant="secondary" size="small" onClick={() => openUnstake(130n)}>
            Unstake (red)
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() =>
              runOnPage(
                REWARDS_TESTER_EARN_PORTFOLIO_PATH,
                [{ click: "Vest" }],
                "No Vest button here. Try the esGMX + vesting scenario."
              )
            }
          >
            Vest
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() =>
              runOnPage(
                REWARDS_TESTER_EARN_PORTFOLIO_PATH,
                [{ click: "Claim rewards" }],
                "Claim is disabled. Set Pending claimable to Some."
              )
            }
          >
            Claim
          </Button>
          <Button variant="secondary" size="small" onClick={openBuyGmx}>
            Buy GMX
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => history.push({ pathname: REWARDS_TESTER_EARN_DISTRIBUTIONS_PATH, search })}
          >
            Distributions tab
          </Button>
        </div>
        {notice ? <div className="mt-6 text-12 text-yellow-300">{notice}</div> : null}
      </details>

      <details>
        <summary className={REWARDS_TESTER_EARN_SECTION_TITLE_CLASSNAME}>Edit values</summary>
        <div className="mt-6 flex flex-col gap-12">
          {REWARDS_TESTER_EARN_FIELD_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-6">
              <div className="text-12 font-medium text-typography-primary">{section.title}</div>
              <div className="grid grid-cols-2 gap-8">
                {section.fields.map((field) => (
                  <label key={field.key} className={REWARDS_TESTER_EARN_LABEL_CLASSNAME}>
                    {field.label}
                    {field.type === "select" ? (
                      <select
                        aria-label={field.label}
                        value={formValues[field.key]}
                        onChange={(event) => updateValue(field.key, event.target.value)}
                        className={REWARDS_TESTER_EARN_INPUT_CLASSNAME}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={field.label}
                        inputMode="decimal"
                        placeholder={field.placeholder}
                        value={formValues[field.key]}
                        onChange={(event) => updateValue(field.key, event.target.value)}
                        className={REWARDS_TESTER_EARN_INPUT_CLASSNAME}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {error ? (
            <div className="text-12 text-red-500" role="alert">
              {error}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-8">
            <Button variant="secondary" size="small" onClick={resetRewardsTesterEarnState}>
              Reset
            </Button>
            <Button variant="primary" size="small" onClick={applyValues}>
              Apply
            </Button>
          </div>
        </div>
      </details>
    </>
  );
}
