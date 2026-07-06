/**
 * Premium static Hero background.
 * Pure CSS — no animation, no JavaScript, no motion.
 * Depth created through layered gradients, transparency, and soft shadows.
 */

export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800" />

      {/* Large abstract shape - bottom layer */}
      <div
        className="absolute -left-20 -right-20 top-auto bottom-0 h-[70%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(5, 150, 105, 0.15) 30%, rgba(4, 120, 87, 0.25) 60%, rgba(6, 95, 70, 0.4) 100%)',
          clipPath: 'polygon(0 35%, 15% 25%, 35% 38%, 50% 20%, 68% 32%, 85% 18%, 100% 28%, 100% 100%, 0 100%)',
        }}
      />

      {/* Mid layer abstract shape */}
      <div
        className="absolute -left-10 -right-10 top-auto bottom-0 h-[55%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(16, 185, 129, 0.1) 40%, rgba(5, 150, 105, 0.2) 70%, rgba(4, 120, 87, 0.35) 100%)',
          clipPath: 'polygon(0 45%, 12% 32%, 30% 42%, 48% 28%, 65% 40%, 82% 25%, 95% 35%, 100% 30%, 100% 100%, 0 100%)',
        }}
      />

      {/* Upper accent shape */}
      <div
        className="absolute -left-10 -right-10 top-auto bottom-0 h-[40%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(52, 211, 153, 0.08) 50%, rgba(16, 185, 129, 0.15) 100%)',
          clipPath: 'polygon(0 50%, 10% 38%, 28% 48%, 45% 35%, 62% 45%, 78% 32%, 92% 42%, 100% 38%, 100% 100%, 0 100%)',
        }}
      />

      {/* Subtle glow orb - top right */}
      <div
        className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 40%, transparent 70%)',
        }}
      />

      {/* Subtle glow orb - left side */}
      <div
        className="absolute -left-48 top-1/4 h-[600px] w-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.12) 0%, rgba(16, 185, 129, 0.06) 35%, transparent 65%)',
        }}
      />

      {/* Tiny accent glows */}
      <div
        className="absolute right-1/4 top-1/6 h-[200px] w-[200px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, rgba(167, 243, 208, 0.2) 0%, transparent 60%)',
        }}
      />

      {/* Bottom edge highlight line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.2) 50%, transparent 100%)',
        }}
      />

      {/* Subtle vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, rgba(2, 44, 34, 0.3) 100%)',
        }}
      />
    </div>
  );
}
