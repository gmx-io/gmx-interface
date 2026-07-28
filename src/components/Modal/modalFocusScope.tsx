import { createContext, PropsWithChildren, RefObject, useContext, useEffect, useMemo, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalFocusScope = {
  activationOrder: number;
  parent?: ModalFocusScope;
  portalElements: Set<HTMLElement>;
};

const ModalFocusScopeContext = createContext<ModalFocusScope | undefined>(undefined);
const activeModalScopes: ModalFocusScope[] = [];
let activationCounter = 0;

function isAncestorScope(ancestor: ModalFocusScope, scope: ModalFocusScope) {
  let parent = scope.parent;

  while (parent) {
    if (parent === ancestor) return true;
    parent = parent.parent;
  }

  return false;
}

function getActiveModalScope() {
  return activeModalScopes.reduce<ModalFocusScope | undefined>((topScope, scope) => {
    if (!topScope) return scope;

    if (isAncestorScope(topScope, scope)) return scope;
    if (isAncestorScope(scope, topScope)) return topScope;
    return scope.activationOrder > topScope.activationOrder ? scope : topScope;
  }, undefined);
}

function getScopeRoots(scope: ModalFocusScope, contentElement: HTMLElement) {
  return [contentElement, ...scope.portalElements].filter((element) => element.isConnected);
}

function isFocusableElementVisible(element: HTMLElement) {
  let currentElement: HTMLElement | null = element;

  while (currentElement) {
    if (currentElement.hidden || currentElement.inert || currentElement.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(currentElement);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    currentElement = currentElement.parentElement;
  }

  return true;
}

function getFocusableElements(scope: ModalFocusScope, contentElement: HTMLElement) {
  const roots = getScopeRoots(scope, contentElement);
  const elements = new Set<HTMLElement>();

  for (const root of roots) {
    root
      .querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      .forEach((element) => isFocusableElementVisible(element) && elements.add(element));
  }

  return Array.from(elements).sort((a, b) => {
    const position = a.compareDocumentPosition(b);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function ModalFocusScopeProvider({ children, scope }: PropsWithChildren<{ scope: ModalFocusScope }>) {
  return <ModalFocusScopeContext.Provider value={scope}>{children}</ModalFocusScopeContext.Provider>;
}

export function useModalFocusScopePortal(element: HTMLElement | null) {
  const scope = useContext(ModalFocusScopeContext);

  useEffect(() => {
    if (!element || !scope) return;

    scope.portalElements.add(element);
    return () => {
      scope.portalElements.delete(element);
    };
  }, [element, scope]);
}

export function useModalFocusScope({
  contentRef,
  isVisible,
  onClose,
}: {
  contentRef: RefObject<HTMLElement | null>;
  isVisible: boolean;
  onClose: () => void;
}) {
  const parentScope = useContext(ModalFocusScopeContext);
  const scope = useMemo<ModalFocusScope>(
    () => ({
      activationOrder: 0,
      parent: parentScope,
      portalElements: new Set(),
    }),
    [parentScope]
  );
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isVisible) return;

    scope.activationOrder = ++activationCounter;
    activeModalScopes.push(scope);
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    const animationFrame = window.requestAnimationFrame(() => {
      const contentElement = contentRef.current;
      if (!contentElement || getActiveModalScope() !== scope) return;

      const focusableElement = getFocusableElements(scope, contentElement)[0];
      (focusableElement ?? contentElement).focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (getActiveModalScope() !== scope) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      const contentElement = contentRef.current;
      if (event.key !== "Tab" || !contentElement) return;

      event.preventDefault();
      const focusableElements = getFocusableElements(scope, contentElement);

      if (!focusableElements.length) {
        contentElement.focus();
        return;
      }

      const focusedElement = document.activeElement;
      const focusedIndex = focusedElement instanceof HTMLElement ? focusableElements.indexOf(focusedElement) : -1;
      const nextIndex = event.shiftKey
        ? focusedIndex <= 0
          ? focusableElements.length - 1
          : focusedIndex - 1
        : focusedIndex < 0 || focusedIndex === focusableElements.length - 1
          ? 0
          : focusedIndex + 1;

      focusableElements[nextIndex].focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown);
      const scopeIndex = activeModalScopes.lastIndexOf(scope);
      const wasTopScope = getActiveModalScope() === scope;

      if (scopeIndex >= 0) activeModalScopes.splice(scopeIndex, 1);
      if (wasTopScope && previouslyFocusedElement?.isConnected) previouslyFocusedElement.focus();
    };
  }, [contentRef, isVisible, scope]);

  return scope;
}
