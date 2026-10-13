import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="stack">
      <Card>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Button href="/">Back home</Button>
      </Card>
    </div>
  );
}
