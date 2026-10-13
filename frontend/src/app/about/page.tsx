import type { Metadata } from "next";

import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="stack">
      <Card>
        <h1>About Parade</h1>
        <p>
          Parade connects single mothers who want to co-parent and co-habitate. It is a matchmaking
          platform built around shared living, shared childcare, and shared values.
        </p>
      </Card>
    </div>
  );
}
