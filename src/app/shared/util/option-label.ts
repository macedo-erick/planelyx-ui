/**
 * Labels a select option as a name plus the thing that tells two same-named ones apart — an
 * account's bank, a card's brand.
 *
 * The qualifier is dropped when it only repeats the name. Both are free text the user types, and
 * naming an account after its bank is the obvious thing to do, so "Itau · Itau" is what the
 * straightforward template produces for the most ordinary data there is. A qualifier that says
 * nothing the name has not already said is noise.
 *
 * Compared at `sensitivity: 'base'`, so "Itau" matches "Itaú" and "itau". Someone who typed the
 * bank with an accent in one field and without in the other meant the same word, and showing it
 * twice because of a diacritic would be the same bug wearing a hat.
 */
export function qualifiedLabel(name: string, qualifier: string | null | undefined): string {
  const label = name.trim();
  const suffix = qualifier?.trim() ?? '';

  if (suffix === '' || label.localeCompare(suffix, undefined, { sensitivity: 'base' }) === 0) {
    return label;
  }

  return `${label} · ${suffix}`;
}
