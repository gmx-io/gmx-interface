import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RewardsVestingFaq } from "../RewardsVestingFaq";

i18n.load({ en: {} });
i18n.activate("en");

const FAQ_ITEMS = [
  {
    question: "What is vesting?",
    answers: [
      "Vesting is the gradual conversion of esGMX into liquid GMX. As GMX becomes vested, it can be claimed and used like any other liquid GMX token.",
    ],
  },
  {
    question: "How does vesting work?",
    answers: [
      "To convert 1 esGMX into 1 GMX over one year, you must stake 5 GMX as collateral. The required GMX must remain staked throughout the vesting period.",
    ],
  },
  {
    question: "How long does vesting take?",
    answers: ["The full vesting period is one year. GMX becomes available to claim gradually throughout this period."],
  },
  {
    question: "Can I stop vesting?",
    answers: [
      "Yes. You can stop vesting at any time. Any GMX that has already vested will remain available to claim, and the GMX used as collateral will be unlocked.",
      "You can restart vesting at any time by depositing esGMX and providing the required GMX collateral.",
    ],
  },
  {
    question: "What happens to my unvested esGMX if I stop vesting?",
    answers: [
      "Any esGMX that has not yet vested will be returned to you and can be deposited into vesting again later.",
    ],
  },
  {
    question: "Does staked collateral continue earning staking rewards?",
    answers: [
      "Yes. GMX used as vesting collateral remains staked and continues earning staking rewards throughout the vesting period.",
    ],
  },
];

describe("RewardsVestingFaq", () => {
  afterEach(cleanup);

  it("renders the vesting questions and answers", () => {
    render(
      <I18nProvider i18n={i18n}>
        <RewardsVestingFaq />
      </I18nProvider>
    );

    expect(screen.getByText("FAQ")).toBeDefined();

    for (const item of FAQ_ITEMS) {
      fireEvent.click(screen.getByRole("button", { name: item.question }));

      for (const answer of item.answers) {
        expect(document.body.textContent).toContain(answer);
      }
    }
  });
});
