import { PropsWithChildren, useCallback, useEffect, useId, useSyncExternalStore } from "react";

import { activateForm, deactivateForm, getActiveFormId, subscribeToActiveForm } from "./activeFormStore";

export function useIsActiveForm(formId: string) {
  return useSyncExternalStore(subscribeToActiveForm, () => getActiveFormId() === formId);
}

export function useActiveForm() {
  const formId = useId();
  const isActiveForm = useIsActiveForm(formId);

  return { formId, isActiveForm };
}

export function ActiveFormScope({ formId, children }: PropsWithChildren<{ formId: string }>) {
  useEffect(() => {
    activateForm(formId);

    return () => {
      deactivateForm(formId);
    };
  }, [formId]);

  const handleInteraction = useCallback(() => {
    activateForm(formId);
  }, [formId]);

  return (
    <div
      className="contents"
      onPointerDownCapture={handleInteraction}
      onClickCapture={handleInteraction}
      onFocusCapture={handleInteraction}
      onKeyDownCapture={handleInteraction}
      onInputCapture={handleInteraction}
    >
      {children}
    </div>
  );
}
