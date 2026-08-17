import { createFileRoute } from "@tanstack/react-router";
import {
  Cookie,
  Eye,
  Fingerprint,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { SECURITY_PARTNERS, SUPPORT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security & Privacy at SSRA" },
      {
        name: "description",
        content:
          "How SSRA protects your digital footprint: encrypted accounts, row-level database rules, cookie transparency, Wi-Fi safety guidance and scam detection with Kaspersky, Avast, Malwarebytes and TotalAV.",
      },
      { property: "og:title", content: "Security & Privacy at SSRA" },
      {
        property: "og:description",
        content: "Encrypted accounts, cookie transparency, Wi-Fi safety and scam detection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const layers = [
  {
    icon: Fingerprint,
    title: "Your digital footprint stays yours",
    body: "We store only what your account needs: username, optional avatar, optional bio. No tracking pixels, no advertising networks, no selling of member data — ever.",
  },
  {
    icon: Lock,
    title: "Encrypted end to end in transit",
    body: "Every page and API call travels over TLS 1.3. Passwords are salted and hashed by our auth provider; SSRA staff can never read them.",
  },
  {
    icon: ShieldCheck,
    title: "Row-level database rules",
    body: "Each table enforces per-member policies in the database itself. Even if a request is forged, the database refuses to return another member's rows. No data will be leaked between accounts.",
  },
  {
    icon: Cookie,
    title: "Honest cookie system",
    body: "We set one session cookie for sign-in and one local key that remembers your intro animation. There are no third-party cookies, no fingerprint scripts and no cross-site trackers.",
  },
  {
    icon: Wifi,
    title: "Wi-Fi and public-network safety",
    body: "On open Wi-Fi the platform refuses insecure downgrades, warns about captive portals and never transmits credentials outside an encrypted channel. Our guides show you how to spot a rogue hotspot.",
  },
  {
    icon: ShieldAlert,
    title: "Scammer detection",
    body: "Messages are scanned before they are stored: links, executables and impersonation patterns are blocked, and repeat offenders are removed from member chat.",
  },
  {
    icon: Eye,
    title: "Moderation you can see",
    body: "Chat moderation rejects abusive language and attachment-style payloads at the database layer, so a blocked message never reaches another member's screen.",
  },
];

const commitments = [
  "No member data is sold, rented or shared with advertisers.",
  "No file attachments in member chat — a common malware route, closed by design.",
  "Anti-virus style pattern checks on every message body (.exe, .apk, .bat, .scr, .jar, magnet links).",
  "Inappropriate content is rejected before it is written to the database.",
  "Accounts can be deleted on request; your rows go with them.",
  "Security reports are welcome and answered — write to our support inbox.",
];

function SecurityPage() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Cybersecurity division</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Your data is <span className="neon-text">shielded</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          The SSRA Cybersecurity Team hardens this platform continuously, with tooling and threat feeds from
          industry partners. Here is exactly what we do and do not do with your information.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {layers.map((layer, index) => (
          <Reveal key={layer.title} delay={index * 60} from={index % 2 === 0 ? "left" : "right"}>
            <Tilt3D strength={6}>
              <article className="glass-inset h-full p-7">
                <layer.icon className="h-7 w-7 text-primary" />
                <h2 className="mt-5 text-lg font-semibold">{layer.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{layer.body}</p>
              </article>
            </Tilt3D>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass-panel mt-14 p-8">
        <h2 className="text-2xl font-bold">
          Detection <span className="neon-text">partners</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Threat intelligence and endpoint scanning used across our labs and volunteer machines:
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {SECURITY_PARTNERS.map((partner) => (
            <li
              key={partner}
              className="glass-soft px-3 py-1.5 text-xs uppercase tracking-widest text-primary"
            >
              {partner}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal className="glass-inset mt-8 p-8">
        <h2 className="text-2xl font-bold">Our promises</h2>
        <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
          {commitments.map((item) => (
            <li key={item} className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Found a vulnerability? Report it privately to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          and we will credit you once it is patched.
        </p>
      </Reveal>
    </div>
  );
}
