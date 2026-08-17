import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right" | "scale";
};

const offsets: Record<NonNullable<RevealProps["from"]>, string> = {
  up: "translate-y-8 sm:translate-y-12",
  left: "translate-y-8 sm:translate-y-0 sm:-translate-x-12",
  right: "translate-y-8 sm:translate-y-0 sm:translate-x-12",
  scale: "scale-95 sm:scale-90",
};

/** Reveals content with a neon slide-in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, from = "up" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-[900ms] ease-out will-change-transform",
        shown ? "translate-x-0 translate-y-0 scale-100 opacity-100 blur-0" : `opacity-0 blur-sm ${offsets[from]}`,
        className,
      )}
    >
      {children}
    </div>
  );
}