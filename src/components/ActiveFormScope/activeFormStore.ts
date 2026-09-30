const activatedFormIds: string[] = [];
const listeners = new Set<() => void>();

let activeFormId: string | undefined;

function removeFormId(formId: string) {
  const index = activatedFormIds.indexOf(formId);

  if (index !== -1) {
    activatedFormIds.splice(index, 1);
  }
}

function updateActiveFormId() {
  const nextActiveFormId = activatedFormIds[activatedFormIds.length - 1];

  if (nextActiveFormId === activeFormId) {
    return;
  }

  activeFormId = nextActiveFormId;

  for (const listener of listeners) {
    listener();
  }
}

export function activateForm(formId: string) {
  removeFormId(formId);
  activatedFormIds.push(formId);
  updateActiveFormId();
}

export function deactivateForm(formId: string) {
  removeFormId(formId);
  updateActiveFormId();
}

export function getActiveFormId() {
  return activeFormId;
}

export function subscribeToActiveForm(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
