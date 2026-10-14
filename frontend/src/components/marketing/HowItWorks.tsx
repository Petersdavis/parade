import styles from "./HowItWorks.module.css";

interface Step {
  title: string;
  description: string;
}

const STEPS: readonly Step[] = [
  {
    title: "Join the waitlist",
    description:
      "Tell us your name, email, and the Ontario community you call home. It takes less than a minute.",
  },
  {
    title: "Build your profile",
    description:
      "Share what matters to you — your housing needs, lifestyle, children, and pets — so we can find genuinely compatible matches.",
  },
  {
    title: "Match and meet",
    description:
      "Get introduced to single mothers nearby who want to co-parent and co-habitate, then start the conversation.",
  },
];

/** Three-step summary of how Parade works, shown on the landing page. */
export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className={styles.heading}>
        How it works
      </h2>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.number} aria-hidden="true">
              {index + 1}
            </span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepDescription}>{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
