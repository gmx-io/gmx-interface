import { Link } from 'react-router-dom';
import { useMedia } from 'react-use';
// import logo_new from '@/img/logo_new.svg';
// import logo_gmx_solana_24 from '@/img/logo_gmx_solana_24.svg';
import logo_new from '@/img/logo-gm-trade-white.svg';
import logo_gmx_solana_24 from '@/img/logo-collapse.svg';

interface ResponsiveLogoProps {
  className?: string;
  linkClassName?: string;
  to?: string;
}

export const ResponsiveLogo = ({
  className = "",
  linkClassName = "App-header-link-main text-body-medium",
  to = "/trade"
}: ResponsiveLogoProps) => {
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');

  return (
    <div className={`block flex items-center ${className}`}>
      <Link className={linkClassName} to={to}>
        {isMobile ? (
          <img src={logo_gmx_solana_24} alt="GMX Solana Logo" className="w-[2.4rem] h-[2.4rem]" />
        ) : (
          <img src={logo_new} alt="GMX Solana Logo" className="w-[14.8rem]" />
        )}
      </Link>
    </div>
  );
};