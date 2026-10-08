import { type ReactNode } from "react";

// A small TSX highlighter for the docs code blocks, colored with the app's tokens so it works in both themes.
// Groups: 1 comment, 2 string, 3 JSX tag, 4 attribute name, 5 keyword, 6 number.
const TOKEN =
  /(\{\/\*[\s\S]*?\*\/\}|\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(<\/?>|<\/?[A-Za-z][\w.]*)|\b([a-zA-Z][\w-]*)(?==)|\b(const|let|function|return|export|import|from|if|else|true|false|null|undefined|new|typeof|as|satisfies)\b|\b(\d+(?:\.\d+)?)\b/g;

const GROUP_CLASSNAMES = [
  "text-typography-secondary",
  "text-green-500",
  "text-blue-400 dark:text-blue-300",
  "text-yellow-300",
  "text-red-400",
  "text-yellow-300",
];

export function CodeHighlight({ code }: { code: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;

  for (let match = TOKEN.exec(code); match; match = TOKEN.exec(code)) {
    if (match.index > last) {
      parts.push(code.slice(last, match.index));
    }

    const group = match.slice(1).findIndex((value) => value !== undefined);
    parts.push(
      <span key={match.index} className={GROUP_CLASSNAMES[group]}>
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }

  parts.push(code.slice(last));
  return <>{parts}</>;
}
