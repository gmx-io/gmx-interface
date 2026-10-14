// Opens real UI (modals, tabs) by pressing the page's own controls, so components run their normal flow.
const REWARDS_TESTER_PANEL_SELECTOR = '[data-testid="rewards-tester-panel"]';
const REWARDS_TESTER_STEP_ATTEMPTS = 20;
const REWARDS_TESTER_STEP_INTERVAL_MS = 150;

export type RewardsTesterPageStep = { click: string; scope?: "page" | "dialog" } | { type: string };

function getRewardsTesterStepRoot(scope: "page" | "dialog" | undefined): Document | Element | undefined {
  if (scope !== "dialog") return document;

  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));

  return dialogs[dialogs.length - 1];
}

function findRewardsTesterControl(label: string, scope?: "page" | "dialog") {
  const root = getRewardsTesterStepRoot(scope);
  if (!root) return undefined;

  return Array.from(root.querySelectorAll<HTMLElement>("button, a, [role='tab']")).find(
    (element) =>
      !element.closest(REWARDS_TESTER_PANEL_SELECTOR) &&
      element.textContent?.trim() === label &&
      !(element instanceof HTMLButtonElement && element.disabled)
  );
}

function typeIntoRewardsTesterDialog(value: string) {
  const dialog = getRewardsTesterStepRoot("dialog");
  const input = dialog?.querySelector<HTMLInputElement>("input:not([type='checkbox'])");
  if (!input) return false;

  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));

  return true;
}

function runRewardsTesterStep(step: RewardsTesterPageStep) {
  if ("type" in step) return typeIntoRewardsTesterDialog(step.type);

  const control = findRewardsTesterControl(step.click, step.scope);
  control?.click();

  return Boolean(control);
}

// Runs the steps in order, retrying each one while the page renders. Returns a cancel function.
export function runRewardsTesterPageSteps(steps: RewardsTesterPageStep[], onMissing: () => void) {
  let timer: number | undefined;
  let stepIndex = 0;
  let attempt = 0;

  const tick = () => {
    const step = steps[stepIndex];
    if (!step) return;

    if (runRewardsTesterStep(step)) {
      stepIndex += 1;
      attempt = 0;
      timer = window.setTimeout(tick, REWARDS_TESTER_STEP_INTERVAL_MS);
      return;
    }

    attempt += 1;
    if (attempt >= REWARDS_TESTER_STEP_ATTEMPTS) {
      onMissing();
      return;
    }

    timer = window.setTimeout(tick, REWARDS_TESTER_STEP_INTERVAL_MS);
  };

  timer = window.setTimeout(tick, REWARDS_TESTER_STEP_INTERVAL_MS);

  return () => window.clearTimeout(timer);
}
