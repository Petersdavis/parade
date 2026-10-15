import styles from "./HowItWorks.module.css";

interface Step {
  title: string;
  description: string;
}

const STEPS: readonly Step[] = [
  {
    title: "Meet Parade",
    description:
      "Tell us where you live, what kind of home you are building, and the support you need to thrive.",
  },
  {
    title: "Get intentionally matched",
    description:
      "Share your values, lifestyle, children, and housing needs so we can connect you with compatible mothers.",
  },
  {
    title: "Build a shared home",
    description:
      "Move from introductions to collaborative parenting, shared housing, and a stronger support system.",
  },
];

/** Three-step summary of how Parade works, shown on the landing page. */
export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className={styles.heading}>
        How Parade works
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
