import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tilt3DProps = {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees applied while the element travels the viewport. */
  strength?: number;
  /** Depth push in px. */
  depth?: number;
  /** Also tilt toward the pointer on hover. */
  pointer?: boolean;
};

/**
 * Scroll-driven 3D card: rotates on X as it crosses the viewport and, optionally,
 * follows the pointer for a hyper-interactive parallax feel.
 */
export function Tilt3D({
  children,
  className,
  strength = 9,
  depth = 60,
  pointer = true,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollTilt, setScrollTilt] = useState(strength);
  const [hover, setHover] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScrollTilt(0);
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const progress = (center - window.innerHeight / 2) / window.innerHeight;
      setScrollTilt(Math.max(-1, Math.min(1, progress)) * strength);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [strength]);

  return (
    <div ref={ref} className={cn("[perspective:1200px]", className)}>
      <div
        onPointerMove={
          pointer
            ? (e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHover({
                  x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
                  y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
                });
              }
            : undefined
        }
        onPointerLeave={pointer ? () => setHover({ x: 0, y: 0 }) : undefined}
        style={{
          transform: `rotateX(${scrollTilt - hover.y * 4}deg) rotateY(${hover.x * 5}deg) translateZ(${-Math.abs(scrollTilt) * (depth / strength)}px)`,
        }}
        className="transition-transform duration-300 ease-out [transform-style:preserve-3d] will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
