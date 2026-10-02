import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StarField } from "@/components/StarField";
import { CosmicScene } from "@/components/CosmicScene";
import { CometCursor } from "@/components/CometCursor";
import { IntroSequence } from "@/components/IntroSequence";
import { Toaster } from "@/components/ui/sonner";
import { EffectsLayer } from "@/components/EffectsLayer";
import { SitePopups } from "@/components/SitePopups";
import { SiteGuard } from "@/components/SiteGuard";
import { PresenceTracker } from "@/components/PresenceTracker";
import { PetCompanion } from "@/components/PetCompanion";
import { PetSettingsPanel } from "@/components/PetSettingsPanel";
import { TormentorLayer } from "@/components/TormentorLayer";
import { useDailyAlerts } from "@/lib/dailyAlerts";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SSRA — Space Science Research Association" },
      {
        name: "description",
        content:
          "Space Science Research Association: daily space news, events, an AI space assistant and a community of researchers.",
      },
      { name: "author", content: "Space Science Research Association" },
      { property: "og:title", content: "SSRA — Space Science Research Association" },
      {
        property: "og:description",
        content: "Daily space news, events, an AI space assistant and a community of researchers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Space+Grotesk:wght@300;400;500;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <DailyAlerts />
      <CosmicScene />
      <StarField />
      <CometCursor />
      <IntroSequence />
      <SiteHeader />
      <PresenceTracker />
      <EffectsLayer />
      <SitePopups />
      <PetCompanion />
      <PetSettingsPanel />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <main className="relative">
        <SiteGuard>
          <Outlet />
        </SiteGuard>
      </main>
      <SiteFooter />
      <TormentorLayer />
      <Toaster />

    </QueryClientProvider>
  );
}

/** Mounted inside the query provider so the daily alert job can reach it. */
function DailyAlerts() {
  useDailyAlerts();
  return null;
}
