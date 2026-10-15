"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { signOutUser } from "@/lib/auth";
import logo from "@/images/logo.png";

import styles from "./NavBar.module.css";

const links = [
  { href: "/", label: "Home" },
];

export function NavBar() {
  const { user, loading, emailVerified } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutUser();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary">
        <Link href="/" className={styles.brand}>
          <Image src={logo} alt="Parade" className={styles.brandImage} priority />
        </Link>
        <ul className={styles.links}>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          {!loading && user ? (
            <li>
              <button
                type="button"
                className={styles.authAction}
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </li>
          ) : null}
          {!loading && !user ? (
            <>
              <li>
                <Link href="/login">Sign in</Link>
              </li>
              <li>
                <Link href="/register">Register</Link>
              </li>
            </>
          ) : null}
        </ul>
      </nav>
    </header>
  );
}
