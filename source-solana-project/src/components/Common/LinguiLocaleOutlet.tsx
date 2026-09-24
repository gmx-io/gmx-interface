import { useLingui } from '@lingui/react';
import { Outlet } from 'react-router-dom';

/**
 * Route outlet that remounts the active page when locale changes.
 * The `t` macro reads global i18n and does not subscribe to locale by itself.
 */
export function LinguiLocaleOutlet() {
  const { i18n } = useLingui();
  return <Outlet key={i18n.locale} />;
}
