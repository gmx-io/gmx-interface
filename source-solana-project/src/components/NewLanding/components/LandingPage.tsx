import { useLandingLaunch } from '../hooks/useLandingLaunch';
import { useIndexTokensData } from '@/components/TradeBoxNew/Hooks/useIndexTokensData';
import LandingHeader from './LandingHeader';
import LandingHeroSection from './LandingHeroSection';
import LandingCoreValueSection from './LandingCoreValueSection';
import LandingGtPointsSection from './LandingGtPointsSection';
import LandingFooter from './LandingFooter';
import LandingRwaMarketSection from './LandingRwaMarketSection';
import LandingMobileExperienceSection from './LandingMobileExperienceSection';
import LandingHeroStaticBackground from './LandingHeroStaticBackground';
import LandingShaderErrorBoundary from './LandingShaderErrorBoundary';
import { canUseWebGL } from '../utils/canUseWebGL';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMedia } from 'react-use';
import '../scss/landing.scss';

export default function LandingPage() {
  useIndexTokensData();
  const { handleLaunchApp, termsModal } = useLandingLaunch();
  const isMobile = useMedia('(max-width: 767px)');

  return (
    <div className=" landing-container w-full overflow-x-clip bg-[#131313]">
      <div className=" relative w-full overflow-hidden min-h-[unset] xl:min-h-[100vh]">
        <div className="absolute inset-0 bg-[#131313]" aria-hidden />
        <LandingPageShader />
        <div className='relative flex h-full  w-full flex-col items-center justify-center'>
          <LandingHeader onLaunch={handleLaunchApp} />
          <LandingHeroSection onLaunch={handleLaunchApp} />
        </div>
      </div>
      <LandingRwaMarketSection />
      <LandingCoreValueSection />
      <LandingGtPointsSection />
      <LandingMobileExperienceSection />
      <LandingFooter />
      {termsModal}
    </div>
  );
}

const LandingPageShader = () => {
  const shaderRef = useRef<HTMLDivElement>(null);
  const [showCover, setShowCover] = useState(true);
  const canUseShader = useMemo(() => canUseWebGL(), []);

  useEffect(() => {
    if (!canUseShader) {
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const waitForCanvasReady = () => {
      if (cancelled) return;

      const canvas = shaderRef.current?.querySelector('canvas');
      if (!canvas) {
        rafId = window.requestAnimationFrame(waitForCanvasReady);
        return;
      }

      let frames = 0;
      const waitForFrames = () => {
        if (cancelled) return;
        frames += 1;
        if (frames >= 3) {
          setShowCover(false);
          return;
        }
        rafId = window.requestAnimationFrame(waitForFrames);
      };

      rafId = window.requestAnimationFrame(waitForFrames);
    };

    setShowCover(true);
    waitForCanvasReady();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [canUseShader]);

  if (!canUseShader) {
    return <LandingHeroStaticBackground />;
  }

  return (
    <LandingShaderErrorBoundary fallback={<LandingHeroStaticBackground />}>
      <div ref={shaderRef} className="pointer-events-none absolute inset-0 z-0">
        <ShaderGradientCanvas
          className="landing-page-shader"
          lazyLoad={false}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundColor: '#131313',
            transform: 'translate3d(0, 0, 0)',
            willChange: 'opacity, transform',
            backfaceVisibility: 'hidden',
            zIndex: 0,
          }}
          pixelDensity={1.5}
          fov={45}
          pointerEvents="none"
          powerPreference="low-power"
        >
          <ShaderGradient
            animate="on"
            brightness={1}
            cAzimuthAngle={180}
            cDistance={3.65}
            cPolarAngle={90}
            cameraZoom={1}
            color1="#61301d"
            color2="#000000"
            color3="#61301d"
            enableTransition={false}
            envPreset="city"
            grain="off"
            lightType="3d"
            positionX={-1.4}
            positionY={0}
            positionZ={0}
            range="disabled"
            rangeEnd={40}
            rangeStart={0}
            reflection={0.1}
            rotationX={0}
            rotationY={10}
            rotationZ={50}
            shader="defaults"
            type="plane"
            uAmplitude={1.1}
            uDensity={0}
            uFrequency={5.5}
            uSpeed={0.2}
            uStrength={0.7}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
        <div
          className={`absolute inset-0 bg-[#131313] transition-opacity duration-150 ${
            showCover ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
        />
      </div>
    </LandingShaderErrorBoundary>
  );
};
