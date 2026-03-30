import { useState } from "react";

import Tabs from "./Tabs";
import { Option } from "./types";

const SIMPLE_OPTIONS: Option<string>[] = [
  { value: "tab1", label: "First" },
  { value: "tab2", label: "Second" },
  { value: "tab3", label: "Third" },
];

export function ControlledTabs({
  options = SIMPLE_OPTIONS,
  initialValue = "tab1",
  type = "block" as const,
  qa,
}: {
  options?: Option<string>[];
  initialValue?: string;
  type?: "inline" | "block" | "inline-primary" | "pills";
  qa?: string;
}) {
  const [selected, setSelected] = useState(initialValue);
  return <Tabs options={options} selectedValue={selected} onChange={setSelected} type={type} qa={qa} />;
}
