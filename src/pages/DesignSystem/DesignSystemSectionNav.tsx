import cx from "classnames";
import { RefObject, useCallback, useLayoutEffect, useState } from "react";

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
 * "On this page" menu in the right column: the sections of the open tab, with the one in view highlighted.
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
    <nav aria-label="On this page" className="flex flex-col gap-2">
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
      className={cx("text-body-large px-12 py-6 text-left", {
        "text-blue-400 dark:text-blue-300": isActive,
        "text-typography-primary": !isActive,
      })}
    >
      {section.title}
    </button>
  );
}
