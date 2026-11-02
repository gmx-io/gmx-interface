import { type ComponentType } from "react";

import { ButtonChangelog, ButtonExamples, ButtonPropsReference } from "./pages/ButtonPage";
import { CheckboxChangelog, CheckboxExamples, CheckboxPropsReference } from "./pages/CheckboxPage";
import { ColorsChangelog, ColorsExamples } from "./pages/ColorsPage";
import { SpacingChangelog, SpacingExamples, SpacingGuidelines } from "./pages/SpacingPage";
import {
  TableChangelog,
  TableExamples,
  TableExperiment1,
  TableExperiment2,
  TablePropsReference,
} from "./pages/TablePage";
import { TooltipChangelog, TooltipExamples, TooltipGuidelines, TooltipPropsReference } from "./pages/TooltipPage";
import { TypographyChangelog, TypographyExamples } from "./pages/TypographyPage";

export type DesignSystemTab = "examples" | "props" | "guidelines" | "changelog" | "experiment1" | "experiment2";

export type DesignSystemPageEntry = {
  slug: string;
  title: string;
  // One sentence under the title
  description?: string;
  // The first tab in the tab order opens by default
  tabs: Partial<Record<DesignSystemTab, ComponentType>>;
  // Hides the "On this page" menu in the right column, so the content gets its width
  hideSectionNav?: boolean;
};

export type DesignSystemGroup = {
  title: string;
  pages: DesignSystemPageEntry[];
};

// One entry per page: it adds the menu item, the URL (/ui/<slug>) and the tabs.
export const DESIGN_SYSTEM_GROUPS: DesignSystemGroup[] = [
  {
    title: "Foundations",
    pages: [
      {
        slug: "colors",
        title: "Colors",
        tabs: {
          examples: ColorsExamples,
          changelog: ColorsChangelog,
        },
      },
      {
        slug: "spacing",
        title: "Spacing",
        tabs: {
          examples: SpacingExamples,
          guidelines: SpacingGuidelines,
          changelog: SpacingChangelog,
        },
      },
      {
        slug: "typography",
        title: "Typography",
        tabs: {
          examples: TypographyExamples,
          changelog: TypographyChangelog,
        },
      },
    ],
  },
  {
    title: "Components",
    pages: [
      {
        slug: "button",
        title: "Button",
        tabs: {
          examples: ButtonExamples,
          props: ButtonPropsReference,
          changelog: ButtonChangelog,
        },
      },
      {
        slug: "checkbox",
        title: "Checkbox",
        tabs: {
          examples: CheckboxExamples,
          props: CheckboxPropsReference,
          changelog: CheckboxChangelog,
        },
      },
      {
        slug: "table",
        title: "Table",
        description: "Rows of data with a header. Built from Table, TableTh, TableTr and TableTd.",
        tabs: {
          examples: TableExamples,
          props: TablePropsReference,
          changelog: TableChangelog,
          experiment1: TableExperiment1,
          experiment2: TableExperiment2,
        },
        hideSectionNav: true,
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

// The menu lists every page in one alphabetical list
export const DESIGN_SYSTEM_PAGES = DESIGN_SYSTEM_GROUPS.flatMap((group) => group.pages).sort((a, b) =>
  a.title.localeCompare(b.title)
);
