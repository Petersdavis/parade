import { Button } from "@/components/ui/Button";

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
            <p className={styles.eyebrow}>For single mothers in Ontario</p>
            <h1 id="hero-heading" className={styles.heading}>
                Find a co-parent and co-habitation partner you can build a home with.
            </h1>
            <p className={styles.lede}>
                Parade connects single mothers who want to share a home, share the load, and raise their
                children together — like an elephant parade, where mothers look after their young as a
                community.
            </p>
            <div className={styles.actions}>
                <Button href="/register">Join the waitlist</Button>
            </div>
            <p className={styles.note}>Free to join. No commitment — just early access.</p>
        </section>
    );
}
