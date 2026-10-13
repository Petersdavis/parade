import type { ReactNode } from "react";

import { RequireVerifiedEmail } from "@/components/auth/RequireVerifiedEmail";

/**
 * Layout for the protected `(app)` route group.
 *
 * Every route under `(app)` requires an authenticated, email-verified user.
 * The `(app)` folder is a Next.js route group, so it does not add a URL
 * segment — `/`, `/discover`, `/messages`, etc. all live here.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <RequireVerifiedEmail>{children}</RequireVerifiedEmail>;
}
