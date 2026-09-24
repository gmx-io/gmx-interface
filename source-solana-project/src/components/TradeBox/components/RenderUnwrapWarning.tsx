import { AlertInfo } from '@/components/Common/AlertInfo/AlertInfo';
import { t } from '@lingui/macro';

export function RenderUnwrapWarning() {
  return (
    <AlertInfo type="warning" compact>
      {t`You can only unwrap your entire WSOL balance. Click Max to unwrap all, or leave empty to cancel.`}
    </AlertInfo>
  );
}
