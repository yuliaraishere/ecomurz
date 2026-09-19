/**
 * Utility for generating clean, URL-safe slugs.
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .normalize('NFKD') // split accented characters into their base and accent
    .replace(/[\u0300-\u036f]/g, '') // remove all accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric characters except space and hyphen
    .replace(/[\s_]+/g, '-') // replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // trim leading and trailing hyphens
}
