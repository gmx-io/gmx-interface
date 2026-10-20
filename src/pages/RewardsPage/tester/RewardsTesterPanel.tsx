import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useHistory, useLocation } from "react-router-dom";

import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { dynamicActivate } from "lib/i18n";

import Button from "components/Button/Button";

import {
  getRewardsPath,
  REWARDS_ONBOARDING_OPEN_ACTION,
  REWARDS_ONBOARDING_SEARCH_PARAM,
  type RewardsTab,
} from "../rewardsRoutes";
import {
  buildRewardsTesterData,
  getRewardsTesterScenario,
  getRewardsTesterScenarioValues,
  REWARDS_TESTER_ACCOUNT,
  REWARDS_TESTER_CUSTOM_SCENARIO_ID,
  REWARDS_TESTER_FIELD_SECTIONS,
  REWARDS_TESTER_LIVE_SCENARIO_ID,
  REWARDS_TESTER_SCENARIO_GROUPS,
  REWARDS_TESTER_SCENARIOS,
  REWARDS_TESTER_TOGGLE_FIELDS,
  type RewardsTesterToggles,
  type RewardsTesterValues,
} from "./rewardsTesterFixtures";
import {
  isRewardsTesterAvailable,
  registerRewardsTesterPanel,
  resetRewardsTesterState,
  setRewardsTesterState,
  setRewardsTesterVestingSlot,
  syncRewardsTesterStateWithUrl,
  useRewardsTesterRuntime,
  useRewardsTesterState,
} from "./useRewardsTester";

const REWARDS_TESTER_INPUT_CLASSNAME =
  "h-32 w-full min-w-0 rounded-4 border-1/2 border-stroke-primary bg-slate-950 px-8 text-13 text-typography-primary outline-none focus:border-blue-300 disabled:opacity-50";

const REWARDS_TESTER_LABEL_CLASSNAME = "flex min-w-0 flex-col gap-4 text-12 text-typography-secondary";

const REWARDS_TESTER_SECTION_TITLE_CLASSNAME =
  "cursor-pointer select-none py-2 text-12 font-medium text-typography-secondary";

const REWARDS_TESTER_PANEL_TEST_ID = "rewards-tester-panel";
const REWARDS_TESTER_CLICK_ATTEMPTS = 20;
const REWARDS_TESTER_CLICK_INTERVAL_MS = 150;

const REWARDS_TESTER_SCENARIO_SECTIONS = REWARDS_TESTER_SCENARIO_GROUPS.map((group) => ({
  group,
  scenarios: REWARDS_TESTER_SCENARIOS.filter((scenario) => scenario.group === group),
})).filter((section) => section.scenarios.length > 0);

function shortenRewardsTesterAccount(account: string) {
  return `${account.slice(0, 6)}…${account.slice(-4)}`;
}

function getRewardsTesterScenarioLabel(scenarioId: string) {
  if (scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID) return "Live";
  if (scenarioId === REWARDS_TESTER_CUSTOM_SCENARIO_ID) return "Custom values";

  return getRewardsTesterScenario(scenarioId)?.label ?? "Custom values";
}

function findRewardsTesterPageButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) =>
      !button.closest(`[data-testid="${REWARDS_TESTER_PANEL_TEST_ID}"]`) && button.textContent?.trim() === label
  );
}

export function RewardsTesterPanel() {
  const state = useRewardsTesterState();
  const runtime = useRewardsTesterRuntime();
  const history = useHistory();
  const { pathname, search } = useLocation();
  const { i18n } = useLingui();
  const [formValues, setFormValues] = useState(state.values);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const clickTimerRef = useRef<number>();

  useEffect(() => registerRewardsTesterPanel(), []);

  useEffect(() => {
    syncRewardsTesterStateWithUrl(search);
  }, [search]);

  useEffect(() => {
    setFormValues(state.values);
    setError(undefined);
  }, [state.values]);

  useEffect(() => () => window.clearTimeout(clickTimerRef.current), []);

  if (!isRewardsTesterAvailable() || typeof document === "undefined") return null;

  const isLive = state.scenarioId === REWARDS_TESTER_LIVE_SCENARIO_ID;
  const scenarioLabel = getRewardsTesterScenarioLabel(state.scenarioId);
  const activeScenarioGroup = getRewardsTesterScenario(state.scenarioId)?.group;
  const hasVestingSimulator = runtime.vestingSimulatorCount > 0;
  const isPseudoLocale = i18n.locale === "pseudo";

  const updateValue = (key: keyof RewardsTesterValues, value: string) => {
    setFormValues((current) => ({ ...current, [key]: value }) as RewardsTesterValues);
    setError(undefined);
  };

  const updateToggle = (key: keyof RewardsTesterToggles, value: string) => {
    setRewardsTesterState({ toggles: { ...state.toggles, [key]: value } as RewardsTesterToggles });
  };

  const applyScenario = (scenarioId: string) => {
    const values = getRewardsTesterScenarioValues(scenarioId);
    if (!values) return;

    setRewardsTesterState({ scenarioId, values });
    setNotice(undefined);
  };

  const applyValues = () => {
    if (!buildRewardsTesterData(formValues, state.toggles)) {
      setError("Enter a non-negative number in every field (epoch hours 1–168).");
      return;
    }

    setRewardsTesterState({ scenarioId: REWARDS_TESTER_CUSTOM_SCENARIO_ID, values: formValues });
  };

  const goToTab = (tab: RewardsTab, extraParams?: Record<string, string>) => {
    const searchParams = new URLSearchParams(search);
    Object.entries(extraParams ?? {}).forEach(([key, value]) => searchParams.set(key, value));
    const nextSearch = searchParams.toString();

    history.push({ pathname: getRewardsPath(tab), search: nextSearch ? `?${nextSearch}` : "" });
  };

  const openOnboarding = () => {
    setNotice(undefined);
    history.push({
      pathname,
      search: `?${new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(search)),
        [REWARDS_ONBOARDING_SEARCH_PARAM]: REWARDS_ONBOARDING_OPEN_ACTION,
      }).toString()}`,
    });
  };

  // Opens a modal by pressing the page's own button, so the real component flow is used. The label goes through
  // lingui so it matches the page in any locale.
  const clickPageButton = (tab: RewardsTab, label: string, missingNotice: string) => {
    setNotice(undefined);
    goToTab(tab);
    window.clearTimeout(clickTimerRef.current);

    let attempt = 0;
    const tryClick = () => {
      const button = findRewardsTesterPageButton(label);

      if (button) {
        button.click();
        return;
      }

      attempt += 1;
      if (attempt >= REWARDS_TESTER_CLICK_ATTEMPTS) {
        setNotice(missingNotice);
        return;
      }

      clickTimerRef.current = window.setTimeout(tryClick, REWARDS_TESTER_CLICK_INTERVAL_MS);
    };

    clickTimerRef.current = window.setTimeout(tryClick, REWARDS_TESTER_CLICK_INTERVAL_MS);
  };

  const togglePseudoLocale = () => {
    let savedLocale: string | null = null;

    try {
      savedLocale = window.localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY);
    } catch {
      savedLocale = null;
    }

    void dynamicActivate(isPseudoLocale ? savedLocale ?? "en" : "pseudo");
  };

  if (state.isCollapsed) {
    return createPortal(
      <button
        type="button"
        className="fixed bottom-16 right-16 z-[1000] flex items-center gap-6 rounded-full border-1/2 border-slate-600 bg-slate-900 px-12 py-6 text-13 font-medium text-typography-primary hover:border-blue-300"
        title="Open the local tester"
        onClick={() => setRewardsTesterState({ isCollapsed: false })}
        data-testid="rewards-tester-pill"
      >
        Tester
        <span className={isLive ? "text-typography-secondary" : "text-blue-300"}>· {scenarioLabel}</span>
        {hasVestingSimulator ? <span className="text-typography-secondary">+ simulator</span> : null}
      </button>,
      document.body
    );
  }

  return createPortal(
    <section
      className="fixed bottom-16 right-16 z-[1000] flex max-h-[calc(100vh-128px)] w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-8 border-1/2 border-slate-600 bg-slate-900 text-13"
      aria-label="Tester"
      data-testid={REWARDS_TESTER_PANEL_TEST_ID}
    >
      <div className="flex items-center justify-between gap-8 border-b border-slate-600 p-12">
        <div className="min-w-0">
          <div className="text-14 font-medium text-typography-primary">Tester</div>
          <div className={`truncate text-12 ${isLive ? "text-typography-secondary" : "text-blue-300"}`}>
            {isLive ? "Live data, no overrides" : scenarioLabel}
          </div>
        </div>
        <Button variant="ghost" size="small" onClick={() => setRewardsTesterState({ isCollapsed: true })}>
          Hide
        </Button>
      </div>

      <div className="flex min-h-0 flex-col gap-12 overflow-y-auto p-12">
        <Button
          variant={isLive ? "primary" : "secondary"}
          size="small"
          onClick={() => {
            setRewardsTesterState({ scenarioId: REWARDS_TESTER_LIVE_SCENARIO_ID });
            setNotice(undefined);
          }}
        >
          Live (no test data)
        </Button>

        <div className="flex flex-col gap-8">
          {REWARDS_TESTER_SCENARIO_SECTIONS.map(({ group, scenarios }) => (
            <details key={group} open={group === activeScenarioGroup}>
              <summary className={REWARDS_TESTER_SECTION_TITLE_CLASSNAME}>{group}</summary>
              <div className="mt-6 flex flex-wrap gap-6">
                {scenarios.map((scenario) => (
                  <Button
                    key={scenario.id}
                    variant={scenario.id === state.scenarioId ? "primary" : "secondary"}
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

        <details open={hasVestingSimulator}>
          <summary className={REWARDS_TESTER_SECTION_TITLE_CLASSNAME}>Vesting simulator</summary>
          {hasVestingSimulator ? null : (
            <div className="mt-6 text-12 text-typography-secondary">
              Available on the Vesting tab with a connected scenario or ?rewardsDebug=vesting-idle.
            </div>
          )}
          <div
            ref={setRewardsTesterVestingSlot}
            className="[&>section]:!bg-transparent mt-6 [&>section]:!mb-0 [&>section]:!border-0 [&>section]:!p-0 [&_.grid]:!grid-cols-2"
          />
        </details>

        <details>
          <summary className={REWARDS_TESTER_SECTION_TITLE_CLASSNAME}>
            Areas {isLive ? "(pick a scenario first)" : "(combine with any scenario)"}
          </summary>
          <div className="mt-6 grid grid-cols-2 gap-8">
            {REWARDS_TESTER_TOGGLE_FIELDS.map((field) => (
              <label key={field.key} className={REWARDS_TESTER_LABEL_CLASSNAME}>
                {field.label}
                <select
                  aria-label={field.label}
                  value={state.toggles[field.key]}
                  disabled={isLive}
                  onChange={(event) => updateToggle(field.key, event.target.value)}
                  className={REWARDS_TESTER_INPUT_CLASSNAME}
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
          <summary className={REWARDS_TESTER_SECTION_TITLE_CLASSNAME}>Overlays and locale</summary>
          <div className="mt-6 flex flex-wrap gap-6">
            <Button variant="secondary" size="small" onClick={openOnboarding}>
              Onboarding
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                clickPageButton("tiers", t`Buy GMX`, "No Buy GMX link on this scenario. Try New trader (zero).")
              }
            >
              Buy GMX
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                clickPageButton(
                  "leaderboard",
                  t`Share`,
                  "Your leaderboard row is not shown. Pick a connected scenario."
                )
              }
            >
              Share
            </Button>
            <Button variant="secondary" size="small" onClick={togglePseudoLocale}>
              {isPseudoLocale ? "Back to saved language" : "Pseudo locale"}
            </Button>
          </div>
          {notice ? <div className="mt-6 text-12 text-yellow-300">{notice}</div> : null}
        </details>

        <div className="h-1 w-full shrink-0 bg-slate-700" />

        <details>
          <summary className={REWARDS_TESTER_SECTION_TITLE_CLASSNAME}>Edit values</summary>
          <div className="mt-6 flex flex-col gap-12">
            {REWARDS_TESTER_FIELD_SECTIONS.map((section) => (
              <div key={section.title} className="flex flex-col gap-6">
                <div className="text-12 font-medium text-typography-primary">{section.title}</div>
                <div className="grid grid-cols-2 gap-8">
                  {section.fields.map((field) => (
                    <label key={field.key} className={REWARDS_TESTER_LABEL_CLASSNAME}>
                      {field.label}
                      {field.type === "select" ? (
                        <select
                          aria-label={field.label}
                          value={formValues[field.key]}
                          onChange={(event) => updateValue(field.key, event.target.value)}
                          className={REWARDS_TESTER_INPUT_CLASSNAME}
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
                          className={REWARDS_TESTER_INPUT_CLASSNAME}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>

        {error ? (
          <div className="text-12 text-red-500" role="alert">
            {error}
          </div>
        ) : null}

        <div className="text-12 text-typography-secondary">
          Local-only mock data. Fake account {shortenRewardsTesterAccount(REWARDS_TESTER_ACCOUNT)}, no wallet, no
          transactions.
        </div>
      </div>

      <div className="flex items-center justify-end gap-8 border-t border-slate-600 p-12">
        <Button variant="secondary" size="small" onClick={resetRewardsTesterState}>
          Reset
        </Button>
        <Button variant="primary" size="small" onClick={applyValues}>
          Apply
        </Button>
      </div>
    </section>,
    document.body
  );
}
