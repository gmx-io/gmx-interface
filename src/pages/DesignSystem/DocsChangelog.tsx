import { ReactNode } from "react";

import { DocsCopyButton, DocsSection } from "./DocsLayout";

// Changelog tabs as exact edits for the product repo: each step gives files, the text to find and the text to put
// instead. Line numbers are from one release commit, so the text is what to match.

export const CHANGELOG_RELEASE = "0f9e06e991";

export type ChangelogEdit = { file: string; line: string; find: string; replace: string; note?: string };

export type ChangelogStep = {
  id: string;
  title: string;
  goal: string;
  dependsOn: string[];
  edits: ChangelogEdit[];
  verify: string[];
  visible: string;
};

const LABEL_CLASSNAME = "text-body-small uppercase text-typography-secondary";
const CODE_CLASSNAME = "whitespace-pre-wrap break-all font-mono text-body-small";

const fence = (text: string) => ["```", text, "```"].join("\n");

/**
 * The steps as Markdown, to paste where they are applied.
 */
export function changelogMarkdown(title: string, notes: string[], steps: ChangelogStep[]) {
  const out = [
    `# ${title}`,
    "",
    `Repo-relative paths. Line numbers are from release ${CHANGELOG_RELEASE}: find each edit by its exact text.`,
  ];
  if (notes.length > 0) {
    out.push("", ...notes.map((note) => `- ${note}`));
  }
  for (const step of steps) {
    out.push("", `## ${step.title}`, "", `Goal: ${step.goal}`);
    if (step.dependsOn.length > 0) {
      out.push(`Depends on: ${step.dependsOn.join("; ")}`);
    }
    out.push(`Users see: ${step.visible}`, "", "Edits:");
    step.edits.forEach((edit, index) => {
      const where = edit.line ? `${edit.file}:${edit.line}` : edit.file;
      out.push("", `${index + 1}. ${where}${edit.note ? ` (${edit.note})` : ""}`, "Find:", fence(edit.find));
      out.push(edit.replace === "DELETE" ? "Delete it." : ["Replace with:", fence(edit.replace)].join("\n"));
    });
    if (step.verify.length > 0) {
      out.push("", "Verify:", ...step.verify.map((item) => `- ${item}`));
    }
  }
  return out.join("\n");
}

function ChangelogStepBody({ step }: { step: ChangelogStep }) {
  return (
    <div className="flex flex-col gap-16">
      <p className="text-body-large">{step.goal}</p>
      <dl className="text-body-medium grid grid-cols-[max-content_1fr] gap-x-16 gap-y-6">
        {step.dependsOn.length > 0 && (
          <>
            <dt className="text-typography-secondary">Depends on</dt>
            <dd>{step.dependsOn.join("; ")}</dd>
          </>
        )}
        <dt className="text-typography-secondary">Users see</dt>
        <dd>{step.visible}</dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className={LABEL_CLASSNAME}>
              <th className="w-[240px] pb-8 pr-16 font-normal">File</th>
              <th className="pb-8 pr-16 font-normal">Find</th>
              <th className="pb-8 font-normal">Replace with</th>
            </tr>
          </thead>
          <tbody>
            {step.edits.map((edit, index) => (
              <tr key={index} className="border-t-1/2 border-slate-600 align-top">
                <td className="py-8 pr-16">
                  <span className="text-body-small break-all font-mono">
                    {edit.file}
                    {edit.line && <span className="text-typography-secondary">:{edit.line}</span>}
                  </span>
                  {edit.note && <p className="text-body-small mt-4 text-typography-secondary">{edit.note}</p>}
                </td>
                <td className="py-8 pr-16">
                  <pre className={CODE_CLASSNAME}>{edit.find}</pre>
                </td>
                <td className="py-8">
                  <pre className={CODE_CLASSNAME}>{edit.replace === "DELETE" ? "Delete it." : edit.replace}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {step.verify.length > 0 && (
        <div className="flex flex-col gap-6">
          <span className={LABEL_CLASSNAME}>Verify</span>
          <ul className="text-body-small flex list-disc flex-col gap-4 pl-20 font-mono">
            {step.verify.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * A Changelog tab: what it covers, a copy of all steps as Markdown, the rules for all steps, then one section per
 * step.
 */
export function DocsChangelog({
  title,
  summary,
  notes,
  steps,
}: {
  // The Markdown heading, e.g. "Button changelog"
  title: string;
  summary: ReactNode;
  notes: string[];
  steps: ChangelogStep[];
}) {
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-start justify-between gap-12">
        <p className="text-body-large max-w-[720px] text-typography-secondary">{summary}</p>
        <DocsCopyButton code={changelogMarkdown(title, notes, steps)} label="Copy all steps as Markdown" />
      </div>
      {notes.length > 0 && (
        <ul className="text-body-medium flex list-disc flex-col gap-6 pl-20 text-typography-secondary">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {steps.map((step) => (
        <DocsSection key={step.id} section={step}>
          <ChangelogStepBody step={step} />
        </DocsSection>
      ))}
    </div>
  );
}
