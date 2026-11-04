import { ReactNode } from "react";

import { DocsCode, DocsCopyButton, DocsSection } from "./DocsLayout";

// Changelog tabs as exact edits for the product repo: each step gives files, the text to find and the text to put
// instead. Line numbers are from one release commit, so the text is what to match. Mass renames come as a script
// that runs after the step's edits.

export const CHANGELOG_RELEASE = "0f9e06e991";

export type ChangelogEdit = { file: string; line: string; find: string; replace: string; note?: string };

export type ChangelogScript = {
  title: string;
  // Saved in the repo root, run, then deleted
  file: string;
  run: string;
  code: string;
  // What the run prints when it works
  expect: string;
};

export type ChangelogStep = {
  id: string;
  title: string;
  goal: string;
  dependsOn: string[];
  edits: ChangelogEdit[];
  scripts?: ChangelogScript[];
  verify: string[];
  visible: string;
};

const LABEL_CLASSNAME = "text-body-small uppercase text-textIcon-secondary";
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
    out.push(`Users see: ${step.visible}`);
    if (step.edits.length > 0) {
      out.push("", "Edits:");
    }
    step.edits.forEach((edit, index) => {
      const where = edit.line ? `${edit.file}:${edit.line}` : edit.file;
      out.push("", `${index + 1}. ${where}${edit.note ? ` (${edit.note})` : ""}`, "Find:", fence(edit.find));
      out.push(edit.replace === "DELETE" ? "Delete it." : ["Replace with:", fence(edit.replace)].join("\n"));
    });
    for (const script of step.scripts ?? []) {
      out.push(
        "",
        `${step.edits.length > 0 ? "Then run the script" : "Run the script"}: ${script.title}`,
        `Save it as ${script.file} in the repo root, run \`${script.run}\`, then delete the file. It prints: ${script.expect}`,
        fence(script.code)
      );
    }
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
            <dt className="text-textIcon-secondary">Depends on</dt>
            <dd>{step.dependsOn.join("; ")}</dd>
          </>
        )}
        <dt className="text-textIcon-secondary">Users see</dt>
        <dd>{step.visible}</dd>
      </dl>
      {step.edits.length > 0 && (
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
                <tr key={index} className="border-t-1/2 border-stroke-primary align-top">
                  <td className="py-8 pr-16">
                    <span className="text-body-small break-all font-mono">
                      {edit.file}
                      {edit.line && <span className="text-textIcon-secondary">:{edit.line}</span>}
                    </span>
                    {edit.note && <p className="text-body-small mt-4 text-textIcon-secondary">{edit.note}</p>}
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
      )}
      {step.scripts?.map((script) => (
        <div key={script.file} className="flex flex-col gap-6">
          <span className={LABEL_CLASSNAME}>{step.edits.length > 0 ? "Then run the script" : "Run the script"}</span>
          <p className="text-body-medium">
            {script.title}. Save it as <code className="font-mono">{script.file}</code> in the repo root, run{" "}
            <code className="font-mono">{script.run}</code>, then delete the file. It prints: {script.expect}
          </p>
          <div className="overflow-hidden rounded-8 border border-button-background">
            <DocsCode code={script.code} collapsedHeight={200} />
          </div>
        </div>
      ))}
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
        <p className="text-body-large max-w-[720px] text-textIcon-secondary">{summary}</p>
        <DocsCopyButton code={changelogMarkdown(title, notes, steps)} label="Copy all steps as Markdown" />
      </div>
      {notes.length > 0 && (
        <ul className="text-body-medium flex list-disc flex-col gap-6 pl-20 text-textIcon-secondary">
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
