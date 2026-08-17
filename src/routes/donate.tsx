import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, HeartHandshake, Rocket, Telescope } from "lucide-react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { Button } from "@/components/ui/button";
import { CONTACT_PHONE, SUPPORT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate to SSRA — Fund Telescopes & Student Programmes" },
      {
        name: "description",
        content:
          "Support the Space Science Research Association directly: UPI, bank transfer or equipment donations that fund telescopes, rover parts and student scholarships.",
      },
      { property: "og:title", content: "Donate to SSRA" },
      {
        property: "og:description",
        content: "Fund telescopes, rover parts and student scholarships at SSRA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DonatePage,
});

const UPI_ID = "ssraofficialsupport@upi";

const uses = [
  { icon: Telescope, title: "Optics", body: "Eyepieces, filters and mounts for public observation nights." },
  { icon: Rocket, title: "Rover parts", body: "Actuators, sensors and printed chassis for our Mars analogue builds." },
  { icon: HeartHandshake, title: "Scholarships", body: "Travel and workshop fees for students who cannot pay them." },
];

function DonatePage() {
  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — please copy it manually.");
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Support the association</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Fund the next <span className="neon-text">clear night</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          SSRA runs on volunteers and donations. Every rupee goes straight into equipment, student programmes
          and the servers behind this platform — never into salaries.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {uses.map((use, index) => (
          <Reveal key={use.title} delay={index * 90} from="scale">
            <Tilt3D strength={6}>
              <div className="glass-inset h-full p-6">
                <use.icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{use.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{use.body}</p>
              </div>
            </Tilt3D>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass-panel mt-12 p-8" from="scale">
        <h2 className="text-2xl font-bold">
          Donate <span className="neon-text">directly</span>
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Transfers arrive in the association's own account. Send us the reference afterwards and we will mail
          you a receipt plus a note about what your donation bought.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="glass-soft p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">UPI ID</p>
            <p className="mt-2 break-all font-display text-lg text-primary">{UPI_ID}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => copy(UPI_ID, "UPI ID")}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy UPI ID
            </Button>
          </div>
          <div className="glass-soft p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp / SMS</p>
            <p className="mt-2 font-display text-lg text-primary">{CONTACT_PHONE}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Message us for bank transfer details, equipment donations or an 80G receipt request. No calls.
            </p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="gradient-neon text-primary-foreground neon-ring">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=SSRA%20donation`}>Email about a donation</a>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/support-us">Buy the team a coffee or tea</Link>
          </Button>
        </div>
      </Reveal>
    </div>
  );
}
