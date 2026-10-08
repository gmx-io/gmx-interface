import cx from "classnames";
import {
  type ComponentType,
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCopyToClipboard } from "react-use";

import CheckIcon from "img/ic_check.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";
import CopyIcon from "img/ic_copy.svg?react";

import { CodeHighlight } from "./CodeHighlight";

// Building blocks for design system documentation pages. Sections look like the cards on /pools.

export type DocsSectionInfo = {
  id: string;
  title: string;
  // Shown in a small tinted tile next to the title
  icon?: ComponentType<{ className?: string }>;
};

export function DocsSection({
  section,
  titleMeta,
  flush,
  children,
}: {
  section: DocsSectionInfo;
  // Shown on the title line, after the title (e.g. a version's date)
  titleMeta?: string;
  // No padding around the content, for DocsCards and rows that draw their own lines edge to edge
  flush?: boolean;
  children: ReactNode;
}) {
  const Icon = section.icon;

  return (
    // data-docs-section adds the section to the "On this page" menu in the right column
    <section
      id={section.id}
      data-docs-section={section.title}
      className="scroll-mt-16 overflow-hidden rounded-6 bg-slate-900"
    >
      <div className="flex items-center gap-12 border-b border-fill-surfaceElevated p-24 max-md:p-16">
        {Icon && (
          <span className="flex size-32 shrink-0 items-center justify-center rounded-8 bg-blue-400/10 text-blue-400 dark:bg-blue-300/10 dark:text-blue-300">
            <Icon className="size-18" />
          </span>
        )}
        <div className="flex flex-wrap items-baseline gap-8">
          <h2 className="text-h3 font-medium">{section.title}</h2>
          {titleMeta && <span className="text-body-large text-typography-secondary">{titleMeta}</span>}
        </div>
      </div>
      <div className={cx({ "p-24 max-md:p-16": !flush })}>{children}</div>
    </section>
  );
}

// One step smaller and quieter than labels: DS TextIcon/Disabled (#646A8F dark, #9FA3BC light)
const CODE_ACTION_CLASSNAME =
  "text-body-small flex items-center gap-4 text-slate-400 transition-colors duration-200 ease-out hover:text-typography-primary dark:text-slate-500 dark:hover:text-typography-primary";

/**
 * A code block with a Copy button in its corner. Copying turns the button green with a tick for a moment.
 * With `collapsedHeight`, long code starts folded with a fade, and Expand / Collapse animate its height.
 */
export function DocsCode({ code, collapsedHeight }: { code: string; collapsedHeight?: number }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullHeight, setFullHeight] = useState<number>();
  const preRef = useRef<HTMLPreElement>(null);
  const [, copyToClipboard] = useCopyToClipboard();

  const copy = useCallback(() => {
    copyToClipboard(code);
    setIsCopied(true);
  }, [code, copyToClipboard]);
  const toggle = useCallback(() => setIsExpanded((expanded) => !expanded), []);

  useEffect(() => {
    if (!isCopied) {
      return;
    }
    const timeout = setTimeout(() => setIsCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  // The full height is measured, so the fold can animate to it
  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre || collapsedHeight === undefined) {
      return;
    }
    const measure = () => setFullHeight(pre.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pre);
    return () => observer.disconnect();
  }, [code, collapsedHeight]);

  const isFoldable = collapsedHeight !== undefined && fullHeight !== undefined && fullHeight > collapsedHeight + 40;
  const foldStyle = useMemo(
    () => (isFoldable ? { maxHeight: isExpanded ? fullHeight : collapsedHeight } : undefined),
    [isFoldable, isExpanded, fullHeight, collapsedHeight]
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className={cx(CODE_ACTION_CLASSNAME, "absolute right-24 top-24 z-10 max-md:right-16 max-md:top-16", {
          "!text-green-500": isCopied,
        })}
      >
        {isCopied ? <CheckIcon className="size-14" /> : <CopyIcon className="size-14" />}
        {isCopied ? "Copied" : "Copy"}
      </button>
      <div
        className="relative overflow-hidden transition-[max-height] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
        style={foldStyle}
      >
        <pre ref={preRef} className="overflow-x-auto p-24 font-mono text-13 leading-[1.6] max-md:p-16">
          <code>
            <CodeHighlight code={code} />
          </code>
        </pre>
        {isFoldable && (
          <div
            className={cx(
              "to-transparent pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-slate-900 transition-opacity duration-300",
              isExpanded ? "opacity-0" : "opacity-100"
            )}
          />
        )}
      </div>
      {isFoldable && (
        <div className="flex justify-center pb-16">
          <button type="button" onClick={toggle} aria-expanded={isExpanded} className={CODE_ACTION_CLASSNAME}>
            <ChevronDownIcon
              className={cx(
                "size-14 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                { "rotate-180": isExpanded }
              )}
            />
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * One example inside DocsCards: an optional small label and the live component. Cells are split by lines, not backgrounds.
 */
export function DocsCard({
  label,
  children,
  className,
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-start justify-center gap-8 border-b border-r border-fill-surfaceElevated p-24 max-md:p-16",
        className
      )}
    >
      {label && <div className="text-body-medium text-typography-secondary">{label}</div>}
      {children}
    </div>
  );
}

const CARD_COLUMNS = {
  1: "",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

/**
 * A grid of DocsCard, for a flush DocsSection. Each card draws its right and bottom line; the grid is 1px larger
 * than the section, which clips the lines on the outer edges.
 */
export function DocsCards({ children, columns = 3 }: { children: ReactNode; columns?: keyof typeof CARD_COLUMNS }) {
  // A single-column grid draws no line under its last card, so a block that grows taller (next to a bigger one)
  // shows no stray line
  return (
    <div
      className={cx("-mb-1 -mr-1 grid grid-cols-1", CARD_COLUMNS[columns], {
        "[&>*:last-child]:border-b-0": columns === 1,
      })}
    >
      {children}
    </div>
  );
}

export type DocsRule = [term: string, description: ReactNode];

export function DocsRules({ rules }: { rules: DocsRule[] }) {
  return (
    <dl className="text-body-large grid grid-cols-1 gap-x-24 gap-y-12 md:grid-cols-[200px_1fr]">
      {rules.map(([term, description]) => (
        <Fragment key={term}>
          <dt className="text-typography-secondary">{term}</dt>
          <dd className="max-md:mb-8">{description}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

export type DocsProp = {
  name: string;
  type: string;
  defaultValue?: string;
  description: ReactNode;
};

export function DocsPropsTable({ props }: { props: DocsProp[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-body-large w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="text-body-medium uppercase text-typography-secondary">
            <th className="w-[180px] pb-8 pr-16 font-normal">Prop</th>
            <th className="w-[260px] pb-8 pr-16 font-normal">Type</th>
            <th className="w-[120px] pb-8 pr-16 font-normal">Default</th>
            <th className="pb-8 font-normal">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-t-1/2 border-slate-600 align-top">
              <td className="py-10 pr-16 font-mono text-15">{prop.name}</td>
              <td className="py-10 pr-16 font-mono text-15 text-typography-secondary">{prop.type}</td>
              <td className="py-10 pr-16 font-mono text-15 text-typography-secondary">{prop.defaultValue ?? "—"}</td>
              <td className="py-10">{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The title is the version, e.g. "v1.1"
export type DocsChangelogEntry = DocsSectionInfo & {
  date: string;
  changes: string[];
};

/**
 * Changelog tab: one section per version, newest first.
 */
export function DocsChangelog({ entries }: { entries: DocsChangelogEntry[] }) {
  return (
    <div className="flex flex-col gap-16">
      {entries.map((entry) => (
        <DocsSection key={entry.id} section={entry} titleMeta={entry.date}>
          <ul className="text-body-large flex list-disc flex-col gap-8 pl-20 marker:text-typography-secondary">
            {entry.changes.map((change) => (
              // pb-0 resets the padding that Shared.scss adds under every li
              <li key={change} className="pb-0">
                {change}
              </li>
            ))}
          </ul>
        </DocsSection>
      ))}
    </div>
  );
}
