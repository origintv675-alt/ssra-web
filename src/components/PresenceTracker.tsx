import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/** Typing this anywhere on the site opens the admin console. */
const ADMIN_CODE = "ADMIN3\u20AC\u00A5+akz";
/** Layout-proof fallback: the letters and digits of the code, in order. */
const ADMIN_SIMPLE = ADMIN_CODE.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Failsafe code that always works, even if the others are compromised. */
const ADMIN_FAILSAFE = "ADMIN3akzPKY";

/**
 * Watches for the admin unlock codes. Live presence itself is reported by the
 * site guard, which also carries IP bans, page locks and shutdown state.
 */
export function PresenceTracker() {
  const navigate = useNavigate();
  const buffer = useRef("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.length !== 1) return;
      buffer.current = (buffer.current + event.key).slice(-48);
      const simple = buffer.current.toLowerCase().replace(/[^a-z0-9]/g, "");
      const failsafe = simple.endsWith(ADMIN_FAILSAFE.toLowerCase());
      if (buffer.current.endsWith(ADMIN_CODE) || simple.endsWith(ADMIN_SIMPLE) || failsafe) {
        buffer.current = "";
        try {
          window.sessionStorage.setItem("ssra-admin-code", failsafe ? ADMIN_FAILSAFE : ADMIN_CODE);
        } catch {
          /* storage blocked — the console will just ask for the code */
        }
        void navigate({ to: "/admin" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return null;
}
