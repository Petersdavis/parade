import type { ReactNode } from "react";

import { NavBar } from "./NavBar";

import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Base application layout: a persistent header/nav plus a centered content
 * container. Wraps every route via the root layout.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <NavBar />
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Parade</p>
      </footer>
    </div>
  );
}
