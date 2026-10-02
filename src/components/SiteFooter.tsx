import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";

import logo from "@/assets/ssra-logo.png";
import { ORG_NAME, SUPPORT_EMAIL, WHATSAPP_GROUP_URL } from "@/lib/constants";
import { useSession } from "@/lib/useSession";

export function SiteFooter() {
  const { user } = useSession();
  return (
    <footer className="relative z-10 mt-24 border-t border-border/60 px-4 pb-10 pt-12">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logo} alt="SSRA emblem" loading="lazy" width={32} height={32} className="h-8 w-8" />
            <span className="font-display font-bold neon-text">SSRA</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {ORG_NAME} — a community of observers, students and researchers exploring the sky together.
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-foreground">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">About us</Link></li>
            <li><Link to="/collaborations" className="hover:text-primary">Collaborations &amp; projects</Link></li>
            <li><Link to="/news" className="hover:text-primary">Daily space news</Link></li>
            <li><Link to="/events" className="hover:text-primary">Events</Link></li>
            <li><Link to="/skymap" className="hover:text-primary">Live sky map</Link></li>
            <li><Link to="/sky-events" className="hover:text-primary">Meteor showers &amp; eclipses</Link></li>
            <li><Link to="/trackers" className="hover:text-primary">Satellite trackers</Link></li>
            <li><Link to="/gallery" className="hover:text-primary">Telescope archive</Link></li>
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/security" className="hover:text-primary">Security &amp; privacy</Link></li>
            <li><Link to="/cookies" className="hover:text-primary">Cookie policy</Link></li>
            <li><Link to="/donate" className="hover:text-primary">Donate</Link></li>
            <li><Link to="/support-us" className="hover:text-primary">Buy us a coffee</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-foreground">Members</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/assistant" className="hover:text-primary">AI assistant</Link></li>
            <li><Link to="/community" className="hover:text-primary">Member chat</Link></li>
            <li><Link to="/notifications" className="hover:text-primary">Notifications</Link></li>
            <li>
              {user ? (
                <Link to="/profile" className="hover:text-primary">Your profile</Link>
              ) : (
                <Link to="/auth" className="hover:text-primary">Sign in</Link>
              )}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm uppercase tracking-widest text-foreground">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-primary">
                <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp group
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-muted-foreground">
        © {new Date().getFullYear()} {ORG_NAME}. News feed powered by the public Spaceflight News API.
      </p>
    </footer>
  );
}