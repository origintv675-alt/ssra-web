import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, Copy, CupSoda, Moon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { Button } from "@/components/ui/button";
import { CONTACT_PHONE, SUPPORT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/support-us")({
  head: () => ({
    meta: [
      { title: "Buy SSRA a Coffee or Tea" },
      {
        name: "description",
        content:
          "Keep the SSRA night shift running: buy the volunteer team a coffee, a cup of chai or a whole observation night.",
      },
      { property: "og:title", content: "Buy SSRA a Coffee or Tea" },
      { property: "og:description", content: "Small thank-you gifts that keep our night shift awake." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportUsPage,
});

const UPI_ID = "ssraofficialsupport@upi";

const tiers = [
  { icon: CupSoda, label: "A cup of chai", amount: 49, note: "One warm cup for the 3 a.m. observer." },
  { icon: Coffee, label: "A coffee", amount: 149, note: "Fuels a full data-reduction session." },
  { icon: Moon, label: "A whole night", amount: 499, note: "Covers travel and power for one observation run." },
];

function SupportUsPage() {
  const [picked, setPicked] = useState(tiers[1]!.amount);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      toast.success(`UPI ID copied — send ₹${picked} with a note`);
    } catch {
      toast.error("Could not copy — please copy the UPI ID manually.");
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-4xl px-4 pb-24 pt-32">
      <Reveal>
        <p className="font-display text-xs uppercase tracking-[0.35em] text-primary">Tip jar</p>
        <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
          Buy us a <span className="neon-text">coffee or tea</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Observation nights are cold and long. A small tip keeps the flasks full and the volunteers smiling.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {tiers.map((tier, index) => (
          <Reveal key={tier.label} delay={index * 90} from="scale">
            <Tilt3D strength={7}>
              <button
                onClick={() => setPicked(tier.amount)}
                className={`glass-inset h-full w-full p-6 text-left transition-all duration-300 ${
                  picked === tier.amount ? "neon-ring -translate-y-1" : "hover:-translate-y-1"
                }`}
              >
                <tier.icon className="h-6 w-6 text-primary" />
                <p className="mt-4 font-display text-2xl font-bold neon-text">₹{tier.amount}</p>
                <p className="mt-1 text-sm font-semibold">{tier.label}</p>
                <p className="mt-2 text-xs text-muted-foreground">{tier.note}</p>
              </button>
            </Tilt3D>
          </Reveal>
        ))}
      </div>

      <Reveal className="glass-panel mt-10 p-8 text-center" from="scale">
        <p className="text-sm text-muted-foreground">
          Send <span className="font-display text-lg text-primary">₹{picked}</span> to
        </p>
        <p className="mt-2 break-all font-display text-xl neon-text">{UPI_ID}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button className="gradient-neon text-primary-foreground neon-ring" onClick={copy}>
            <Copy className="mr-1.5 h-4 w-4" /> Copy UPI ID
          </Button>
          <Button asChild variant="secondary">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=I%20bought%20SSRA%20a%20coffee`}>Tell us you tipped</a>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/donate">Make a larger donation</Link>
          </Button>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Questions? Message {CONTACT_PHONE} (no calls) and a volunteer will reply.
        </p>
      </Reveal>
    </div>
  );
}
