import { t } from '@lingui/macro';
import StatusPage from '@/components/StatusPage/StatusPage';
import img404 from '@/img/error/404.png';

export default function NotFoundPage() {
  return (
    <StatusPage
      illustrationSrc={img404}
      illustrationAlt="404"
      illustrationVariant="404"
      title={t`The page you are looking for can't be found.`}
      actions={[
        {
          label: t`Go to homepage`,
          to: '/trade',
        },
      ]}
    />
  );
}
