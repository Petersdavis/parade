import type { Metadata } from "next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return (
    <div className="stack">
      <Card>
        <h1>Parade 🐘</h1>
        <p>
          A co-parenting and co-habitation platform for single mothers — inspired by the matriarchal
          structure of an elephant parade, where mothers raise their young collectively.
        </p>
        <Button href="/about">Learn more</Button>
      </Card>
    </div>
  );
}
