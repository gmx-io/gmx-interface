import { t } from '@lingui/macro';
import { useLocation } from 'react-router-dom';
import { AppHeaderUser } from '@/components/Header/AppHeaderUser';
// import IconComingSoon from '@/img/coming_soon.svg';
import IconComingSoonImg from '@/img/coming_soon.png';
import './ComingSoonPage.scss';

export default function ComingSoonPage({
  isShowHeader = true,
  isTrade = false
}: {
  isShowHeader?: boolean;
  isTrade?: boolean;
}) {
  const location = useLocation();
  const targetUrl = `https://gmxsol.io${location.pathname}`;

  return (
    <div className="coming-soon-page">
      {
        isShowHeader && (
          <div className="coming-soon-header">
            <AppHeaderUser />
          </div>
        )
      }
      <div className="comming-soon_container">
        <img className="comming-soon_icon" src={IconComingSoonImg} alt="" />
        <div className="comming-soon_text">{t`Coming Soon`}</div>
        <span>{t`This feature is under development.`}</span>
        {
          isTrade && <>
            <span>{t`In the meantime,`}</span>
            <span>{t`you can access it on our main site.`}</span>
            <a href={targetUrl} target="_blank" rel="noopener noreferrer">
              <button className="comming-soon_button">{t`Go to Main Site →`}</button>
            </a>
          </>
        }
      </div>
    </div>
  );
}