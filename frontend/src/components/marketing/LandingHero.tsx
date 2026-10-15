import { PrimaryCta } from "./PrimaryCta";

import styles from "./LandingHero.module.css";

/**
 * Above-the-fold value proposition for the public landing page.
 *
 * The single call to action starts the waitlist workflow: it sends visitors to
 * the registration page, after which they complete a short profile and land on
 * the community leaderboard.
 */
export function LandingHero() {
    return (
        <section className={styles.hero} aria-labelledby="hero-heading">
            <p className={styles.eyebrow}>Inspired by elephant matriarchies</p>
            <h1 id="hero-heading" className={styles.heading}>
                It takes a village.
                <span className={styles.headingAccent}>Let&apos;s build yours.</span>
            </h1>
            <p className={styles.lede}>
                Parade connects single mothers who want to build better lives together. Through
                intentional matching, shared housing, and collaborative parenting, Parade helps mothers
                find more than a roommate — it helps them find their village.
            </p>
            <div className={styles.actions}>
                <PrimaryCta />
            </div>
            <p className={styles.note}>Free to join. Early access to a more intentional way to build home.</p>
        </section>
    );
}
