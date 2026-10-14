/**
 * Site-wide constants used for SEO metadata and share links.
 *
 * The canonical origin is configurable via `NEXT_PUBLIC_SITE_URL` so the same
 * build can be deployed to a staging or production domain. It falls back to the
 * production domain so metadata is always well-formed.
 */

/** Public production origin, without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://parade.app").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Parade";

export const SITE_DESCRIPTION =
  "Parade connects single mothers in Ontario who want to co-parent and co-habitate — sharing a home, sharing the load, and raising their children together.";

/** Absolute canonical URL for a given path (defaults to the site root). */
export function canonicalUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Resolve the origin to use for user-facing links (share/referral URLs).
 *
 * Prefers the origin the app is actually being served from so links work on
 * localhost, preview deploys, and custom domains without a rebuild. Falls back
 * to the configured {@link SITE_URL} when there is no browser context (e.g.
 * during static export or in tests).
 */
export function resolveSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return SITE_URL;
}

/**
 * Absolute URL for a path, resolved against the current origin at runtime.
 *
 * Use this for links a user will click or share; use {@link canonicalUrl} for
 * SEO metadata, which must stay pinned to the canonical production origin.
 */
export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${resolveSiteOrigin()}${normalized}`;
}
