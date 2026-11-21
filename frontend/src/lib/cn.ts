// Joins class names, skipping falsy values. Keeps conditional Tailwind classes readable.
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
