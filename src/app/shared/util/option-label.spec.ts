import { describe, expect, it } from 'vitest';

import { qualifiedLabel } from './option-label';

describe('qualifiedLabel', () => {
  it('joins a name and the qualifier that tells it apart', () => {
    expect(qualifiedLabel('Conta corrente', 'Itau')).toBe('Conta corrente · Itau');
  });

  it('drops a qualifier that only repeats the name', () => {
    expect(qualifiedLabel('Itau', 'Itau')).toBe('Itau');
  });

  it('ignores case and accents when deciding they are the same word', () => {
    expect(qualifiedLabel('Itau', 'Itaú')).toBe('Itau');
    expect(qualifiedLabel('Nubank', 'nubank')).toBe('Nubank');
  });

  it('keeps a qualifier that genuinely differs', () => {
    expect(qualifiedLabel('Itau', 'Itaucard')).toBe('Itau · Itaucard');
  });

  it('handles a missing or blank qualifier', () => {
    expect(qualifiedLabel('Itau', null)).toBe('Itau');
    expect(qualifiedLabel('Itau', undefined)).toBe('Itau');
    expect(qualifiedLabel('Itau', '   ')).toBe('Itau');
  });

  it('trims both sides so stray whitespace does not defeat the comparison', () => {
    expect(qualifiedLabel('  Itau  ', ' Itau ')).toBe('Itau');
  });
});
