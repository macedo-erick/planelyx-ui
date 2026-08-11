/** Labels a select option as a name plus the thing that tells two same-named ones apart. */
export function qualifiedLabel(name: string, qualifier: string | null | undefined): string {
  const label = name.trim();
  const suffix = qualifier?.trim() ?? '';

  if (suffix === '' || label.localeCompare(suffix, undefined, { sensitivity: 'base' }) === 0) {
    return label;
  }

  return `${label} · ${suffix}`;
}
