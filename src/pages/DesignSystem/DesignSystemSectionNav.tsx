import cx from "classnames";
import { RefObject, useCallback, useLayoutEffect, useState } from "react";

import { DOCS_FOCUS_CLASSNAME } from "./DocsLayout";
import { useActiveSection } from "./useActiveSection";

type SectionLink = {
  id: string;
  title: string;
};

type Props = {
  contentRef: RefObject<HTMLElement>;
  // Changes when another page or tab is shown, so the sections are read again
  contentKey: string;
};

/**
 * "On this page" menu in the right column: the sections of the open tab on a thin line, with the one in view
 * highlighted and marked on the line.
 */
export function DesignSystemSectionNav({ contentRef, contentKey }: Props) {
  const [sections, setSections] = useState<SectionLink[]>([]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    const read = () => {
      const elements = content.querySelectorAll<HTMLElement>("[data-docs-section]");
      const next = Array.from(elements, (element) => ({ id: element.id, title: element.dataset.docsSection ?? "" }));
      setSections((current) => (isSameSections(current, next) ? current : next));
    };

    read();
    // Sections can also come and go within a tab, so watch the content
    const observer = new MutationObserver(read);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [contentRef, contentKey]);

  const { activeId, scrollToSection } = useActiveSection(sections);

  if (sections.length < 2) {
    return null;
  }

  return (
    <nav aria-label="On this page" className="flex flex-col border-l border-button-background">
      {sections.map((section) => (
        <SectionNavItem
          key={section.id}
          section={section}
          isActive={section.id === activeId}
          onSelect={scrollToSection}
        />
      ))}
    </nav>
  );
}

function isSameSections(a: SectionLink[], b: SectionLink[]): boolean {
  return (
    a.length === b.length && a.every((section, index) => section.id === b[index].id && section.title === b[index].title)
  );
}

function SectionNavItem({
  section,
  isActive,
  onSelect,
}: {
  section: SectionLink;
  isActive: boolean;
  onSelect: (id: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(section.id), [onSelect, section.id]);

  return (
    <button
      type="button"
      aria-current={isActive ? "location" : undefined}
      onClick={handleClick}
      // The 2px mark sits over the 1px line of the menu
      className={cx(
        "text-body-medium -ml-1 border-l-2 py-6 pl-14 pr-8 text-left transition-colors duration-150",
        DOCS_FOCUS_CLASSNAME,
        {
          "border-button-primary text-blue-strong dark:border-blue-strong dark:text-blue-strong": isActive,
          "border-[transparent] text-textIcon-secondary hover:text-textIcon-primary": !isActive,
        }
      )}
    >
      {section.title}
    </button>
  );
}
