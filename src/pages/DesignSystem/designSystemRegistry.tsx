import { type ComponentType } from "react";

import { TableChangelog, TableExamples, TableGuidelines, TablePropsReference } from "./pages/TablePage";
import { TooltipChangelog, TooltipExamples, TooltipGuidelines, TooltipPropsReference } from "./pages/TooltipPage";

export type DesignSystemTab = "examples" | "props" | "guidelines" | "changelog";

export type DesignSystemPageEntry = {
  slug: string;
  title: string;
  tabs: Partial<Record<DesignSystemTab, ComponentType>> & { examples: ComponentType };
};

export type DesignSystemGroup = {
  title: string;
  pages: DesignSystemPageEntry[];
};

export const DESIGN_SYSTEM_GROUPS: DesignSystemGroup[] = [
  {
    title: "Components",
    pages: [
      {
        slug: "table",
        title: "Table",
        tabs: {
          examples: TableExamples,
          props: TablePropsReference,
          guidelines: TableGuidelines,
          changelog: TableChangelog,
        },
      },
      {
        slug: "tooltip",
        title: "Tooltip",
        tabs: {
          examples: TooltipExamples,
          props: TooltipPropsReference,
          guidelines: TooltipGuidelines,
          changelog: TooltipChangelog,
        },
      },
    ],
  },
];

export const DESIGN_SYSTEM_PAGES = DESIGN_SYSTEM_GROUPS.flatMap((group) => group.pages).sort((a, b) =>
  a.title.localeCompare(b.title)
);
