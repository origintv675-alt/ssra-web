/** Draws a lit disc for a given phase (0 new, 0.5 full) — used for Moon and Earth. */
export function PhaseDisc({
  phase,
  size = 64,
  body = "moon",
}: {
  phase: number;
  size?: number;
  body?: "moon" | "earth";
}) {
  const lit = body === "moon" ? "#e8eefc" : "#4da3ff";
  const litB = body === "moon" ? "#b9c4dc" : "#3ddc84";
  const shadow = "#0b0f1c";
  // Terminator: signed semi-axis of the ellipse dividing lit and dark halves.
  const k = Math.cos(2 * Math.PI * phase);
  const waxing = phase < 0.5;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Phase ${Math.round(phase * 100)}%`}>
      <defs>
        <radialGradient id={`lit-${body}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor={lit} />
          <stop offset="100%" stopColor={litB} />
        </radialGradient>
        <clipPath id={`clip-${body}-${Math.round(phase * 1000)}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={shadow} />
      <g clipPath={`url(#clip-${body}-${Math.round(phase * 1000)})`}>
        <path
          d={
            waxing
              ? `M50 0 A50 50 0 0 1 50 100 A${Math.abs(k) * 50} 50 0 0 ${k > 0 ? 1 : 0} 50 0 Z`
              : `M50 0 A50 50 0 0 0 50 100 A${Math.abs(k) * 50} 50 0 0 ${k > 0 ? 0 : 1} 50 0 Z`
          }
          fill={`url(#lit-${body})`}
        />
      </g>
      <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  );
}