import { t, Trans } from "@lingui/macro";
import cx from "classnames";

import { Eyebrow } from "../Eyebrow";

function IcCheck({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M8.5 12.1L10.786 14.5L16.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IcX({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M8.75 8.75L15.25 15.25M15.25 8.75L8.75 15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SupportSection() {
  const steps = [
    {
      number: 1,
      label: t`Explore`,
      title: t`Evaluate GMX`,
      description: t`Intro call plus integration feedback.`,
    },
    {
      number: 2,
      label: t`Build`,
      title: t`Integrating or shipping`,
      description: t`Technical guidance plus architecture and UX feedback.`,
    },
    {
      number: 3,
      label: t`Launch`,
      title: t`Going live or already live`,
      description: t`Co-marketing, ecosystem distribution, and selective incentives.`,
    },
  ];

  const goodFit = [
    t`Working prototype or live product`,
    t`Real team with shipping experience`,
    t`Realistic timeline, under 6 months`,
    t`Comfortable with Builder / Referral Code attribution`,
  ];

  const notYet = [
    t`Idea stage, nothing shipped yet`,
    t`Solo, anonymous account`,
    t`Vague on timing`,
    t`Looking for a check before committing`,
  ];

  return (
    <section className="w-full border-b-1/2 border-slate-600 bg-slate-900 px-16 py-60 text-white sm:px-40 sm:py-[120px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <Eyebrow gradient>
          <Trans>The Program</Trans>
        </Eyebrow>
        <h2 className="text-heading-2 mt-20">
          <Trans>
            Support at{" "}
            <span className="text-transparent bg-gradient-to-b from-[#98B6F9] to-[#7F9BFA] bg-clip-text">
              every stage.
            </span>
          </Trans>
        </h2>

        <div className="mt-[34px] grid grid-cols-1 gap-20 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex min-h-[192px] flex-col justify-between rounded-20 border-1/2 border-slate-600/50 bg-slate-800 p-20"
            >
              <div className="flex items-center gap-8 text-16 -tracking-[0.512px] text-blue-300">
                <span className="flex size-24 items-center justify-center rounded-full bg-blue-300 text-16 text-slate-900">
                  {step.number}
                </span>
                {step.label}
              </div>
              <div className="flex flex-col">
                <h3 className="text-24 font-medium -tracking-[0.768px]">{step.title}</h3>
                <p className="mt-4 text-14 -tracking-[0.448px] text-slate-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-28 rounded-20 border-1/2 border-slate-600/50 bg-[#171827]/30 p-20 shadow-[0_6px_8px_-6px_#000] lg:flex-row lg:gap-0">
          <h3 className="text-[28px] font-medium -tracking-[0.896px] lg:w-[387px] lg:flex-shrink-0">
            <Trans>Is this the right fit?</Trans>
          </h3>
          <div className="grid w-full grid-cols-1 gap-20 pt-8 sm:grid-cols-2">
            <div className="flex flex-col">
              <div className="text-18 flex items-center gap-12 -tracking-[0.576px] text-white">
                <span className="flex size-24 items-center justify-center rounded-full bg-blue-300/20">
                  <IcCheck className="size-24 text-blue-300" />
                </span>
                <Trans>Good fit</Trans>
              </div>
              <div className="mt-16 flex flex-col">
                {goodFit.map((item, i) => (
                  <div
                    key={item}
                    className={cx(
                      "text-light-150 flex h-44 items-center gap-16 pl-16 pr-12 text-14 -tracking-[0.224px]",
                      i % 2 === 0 && "rounded-12 bg-[#1E223C]"
                    )}
                  >
                    <IcCheck className="size-24 flex-shrink-0 text-blue-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-18 flex items-center gap-12 -tracking-[0.576px] text-slate-500">
                <span className="flex size-24 items-center justify-center rounded-full bg-slate-600/20">
                  <IcX className="size-24 text-slate-500" />
                </span>
                <Trans>Not yet</Trans>
              </div>
              <div className="mt-16 flex flex-col">
                {notYet.map((item, i) => (
                  <div
                    key={item}
                    className={cx(
                      "flex h-44 items-center gap-16 pl-16 pr-12 text-14 -tracking-[0.224px] text-slate-500",
                      i % 2 === 0 && "rounded-12 bg-slate-800"
                    )}
                  >
                    <IcX className="size-24 flex-shrink-0 text-slate-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
