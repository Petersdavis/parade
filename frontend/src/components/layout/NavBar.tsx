import Link from "next/link";

import styles from "./NavBar.module.css";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

export function NavBar() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary">
        <Link href="/" className={styles.brand}>
          Parade 🐘
        </Link>
        <ul className={styles.links}>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
