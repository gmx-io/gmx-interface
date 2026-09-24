import { createAppStoreSelector } from '@/zustand/useAppStore';

import { selectOrderEditorEditingOrder } from './selectOrderEditorEditingOrder';

export const selectOrderEditorPositionAddress = createAppStoreSelector(
  [selectOrderEditorEditingOrder],
  (editingOrder) => editingOrder?.orderRelatedPositionAddress
);
