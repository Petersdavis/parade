import type { ReactNode } from "react";

import styles from "./AuthLayout.module.css";

/**
 * Shared layout for the auth route group.
 *
 * The `(auth)` folder is a Next.js route group: it groups the login and
 * register pages without adding a URL segment, and this layout centers their
 * content in a narrow column.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
