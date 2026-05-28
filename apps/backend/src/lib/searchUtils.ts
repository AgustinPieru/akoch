/**
 * Builds a Prisma AND filter where every word in the search string
 * must appear in at least one of the provided field conditions.
 * Each word generates an OR across all given fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildWordSearch<T = any>(
  search: string,
  fieldsFor: (word: string) => T[],
): { AND: { OR: T[] }[] } | undefined {
  const words = search.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  return {
    AND: words.map((word) => ({ OR: fieldsFor(word) })),
  };
}
