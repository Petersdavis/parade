import type { Metadata } from "next";

import { HowItWorks } from "@/components/marketing/HowItWorks";
import { LandingHero } from "@/components/marketing/LandingHero";
import { PrimaryCta } from "@/components/marketing/PrimaryCta";
import { canonicalUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "It takes a village",
  description:
    "Parade connects single mothers through intentional matching, shared housing, and collaborative parenting.",
  alternates: {
    canonical: canonicalUrl("/"),
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Parade — It takes a village. Let's build yours.",
    description:
      "Parade connects single mothers through intentional matching, shared housing, and collaborative parenting.",
    url: canonicalUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Parade — It takes a village. Let's build yours.",
    description:
      "Parade connects single mothers through intentional matching, shared housing, and collaborative parenting.",
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
          <h2 id="final-cta-heading">Find your village</h2>
          <p>
            Parade is opening community by community across Ontario. Join the waitlist to be among
            the first mothers matched into a supportive home and a collaborative parenting network.
          </p>
        <PrimaryCta />
        </section>
    </>
  );
}
