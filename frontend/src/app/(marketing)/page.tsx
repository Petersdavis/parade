import type { Metadata } from "next";

import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LandingHero } from "@/components/marketing/LandingHero";
import { Button } from "@/components/ui/Button";
import { canonicalUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Co-parenting and co-habitation for single mothers in Ontario",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: canonicalUrl("/"),
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Parade — co-parent and co-habitate with single mothers in Ontario",
    description: SITE_DESCRIPTION,
    url: canonicalUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Parade — co-parent and co-habitate with single mothers in Ontario",
    description: SITE_DESCRIPTION,
  },
};

/**
 * Public landing page — the only unauthenticated surface of the app.
 *
 * It explains what Parade is, summarises how it works, and funnels visitors into
 * the waitlist workflow (register → profile → leaderboard). No discovery,
 * matching, messaging, or profile features are reachable from here.
 */
export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <HowItWorks />
      <section aria-labelledby="final-cta-heading" className="stack">
        <h2 id="final-cta-heading">Be first in line</h2>
        <p>
          We are opening Parade community by community across Ontario. Join the waitlist to claim
          your spot and help bring Parade to your area.
        </p>
        <Button href="/register">Join the waitlist</Button>
      </section>
    </>
  );
}
