const MAX_LENGTH = 80;

export function slugify(input: string | null | undefined): string {
  const base = (input ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH);
  return base || 'untitled';
}

// Given a desired slug and a function that reports whether a candidate is
// already taken by a *different* snap id, return a unique slug. Appends -2,
// -3, ... on collision. The check function returns the existing snap id (if
// any) for a given slug; pass `null` if free.
export async function dedupeSlug(
  desired: string,
  selfId: string,
  isTaken: (candidate: string) => Promise<string | null>,
): Promise<string> {
  let candidate = desired;
  let n = 1;
  while (true) {
    const ownerId = await isTaken(candidate);
    if (ownerId === null || ownerId === selfId) return candidate;
    n += 1;
    candidate = `${desired}-${n}`.slice(0, MAX_LENGTH);
  }
}
