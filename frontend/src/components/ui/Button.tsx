import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

type Variant = "primary" | "secondary";

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children"
> {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  /** When provided, renders a Next.js `<Link>` instead of a `<button>`. */
  href?: string;
}

/**
 * Shared button primitive. Renders a Next.js `<Link>` when `href` is provided,
 * otherwise a native `<button>`.
 */
export function Button({ children, variant = "primary", className, href, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ");

  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
