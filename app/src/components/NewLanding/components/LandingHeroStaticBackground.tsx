import heroBg from '@/img/new-landing/hero-bg.png';

export default function LandingHeroStaticBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <img src={heroBg} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
