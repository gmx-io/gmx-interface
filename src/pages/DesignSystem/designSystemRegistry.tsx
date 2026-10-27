import { type ComponentType } from "react";

import { CheckboxChangelog, CheckboxExamples, CheckboxPropsReference } from "./pages/CheckboxPage";
import { ColorsChangelog, ColorsExamples } from "./pages/ColorsPage";
import { TooltipChangelog, TooltipExamples, TooltipGuidelines, TooltipPropsReference } from "./pages/TooltipPage";
import { TypographyChangelog, TypographyExamples } from "./pages/TypographyPage";

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
        slug: "checkbox",
        title: "Checkbox",
        tabs: {
          examples: CheckboxExamples,
          props: CheckboxPropsReference,
          changelog: CheckboxChangelog,
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

// The menu lists every page in one alphabetical list
export const DESIGN_SYSTEM_PAGES = DESIGN_SYSTEM_GROUPS.flatMap((group) => group.pages).sort((a, b) =>
  a.title.localeCompare(b.title)
);
