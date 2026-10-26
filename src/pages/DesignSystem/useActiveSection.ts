import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVE_LINE = 0.3;
const USER_SCROLL_EVENTS = ["wheel", "touchmove", "keydown", "pointerdown"] as const;

function getScrollParent(element: HTMLElement): HTMLElement {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
  }

  return document.documentElement;
}

export function useActiveSection(sections: { id: string }[]) {
  const [activeId, setActiveId] = useState<string>();
  const clickedIdRef = useRef<string>();

  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) {
      return;
    }

    const scroller = getScrollParent(elements[0]);
    clickedIdRef.current = undefined;

    const update = () => {
      if (clickedIdRef.current) {
        return;
      }

      const isAtBottom =
        scroller.scrollHeight > scroller.clientHeight &&
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      const line = window.innerHeight * ACTIVE_LINE;
      let current = elements.filter((element) => element.getBoundingClientRect().top <= line).pop() ?? elements[0];
      if (scroller.scrollTop <= 0) current = elements[0];
      if (isAtBottom) current = elements[elements.length - 1];

      setActiveId(current.id);
    };

    const release = () => {
      clickedIdRef.current = undefined;
    };

    update();
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    USER_SCROLL_EVENTS.forEach((type) => window.addEventListener(type, release, { capture: true, passive: true }));

    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, release, { capture: true }));
    };
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    clickedIdRef.current = id;
    setActiveId(id);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  return { activeId: activeId ?? sections[0]?.id, scrollToSection };
}
