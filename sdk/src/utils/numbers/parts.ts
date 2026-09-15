export type NumberPartKind = "text" | "currency" | "multiplier" | "magnitude";

export type NumberPart = {
  kind: NumberPartKind;
  text: string;
};

export type NumberPartInput = string | NumberPart | NumberPart[] | undefined;

export const USD_SYMBOL = "$ ";

export const USD_PART: NumberPart = { kind: "currency", text: USD_SYMBOL };

export function multiplierPart(text: string): NumberPart {
  return { kind: "multiplier", text };
}

export function magnitudePart(text: string): NumberPart {
  return { kind: "magnitude", text };
}

export function numberParts(...inputs: NumberPartInput[]): NumberPart[] {
  const parts: NumberPart[] = [];

  const push = (part: NumberPart) => {
    if (!part.text) {
      return;
    }

    const last = parts[parts.length - 1];

    if (part.kind === "text" && last?.kind === "text") {
      parts[parts.length - 1] = { kind: "text", text: last.text + part.text };
      return;
    }

    parts.push(part);
  };

  for (const input of inputs) {
    if (input === undefined) {
      continue;
    }

    if (typeof input === "string") {
      push({ kind: "text", text: input });
    } else if (Array.isArray(input)) {
      input.forEach(push);
    } else {
      push(input);
    }
  }

  return parts;
}

export function joinNumberParts(parts: NumberPart[]): string {
  return parts.map((part) => part.text).join("");
}

export function isNumberParts(value: unknown): value is NumberPart[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" && item !== null && "kind" in item && "text" in item && typeof item.text === "string"
    )
  );
}
