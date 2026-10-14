import type { ReactNode } from "react";

import styles from "./MarketingLayout.module.css";

/**
 * Layout for the public `(marketing)` route group.
 *
 * The marketing surface is the only unauthenticated part of the app: the
 * landing page and the waitlist flow. It deliberately renders no app chrome
 * (no signed-in navigation, no protected links) so nothing beyond joining the
 * waitlist is reachable from here.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className={styles.container}>{children}</div>;
}
