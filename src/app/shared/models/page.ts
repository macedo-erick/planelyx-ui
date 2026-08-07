/**
 * The API's page envelope.
 *
 * Mirrors `dto/PageResponse` on the server, which is a hand-rolled record rather than
 * Spring's own `Page` — that one's JSON shape is documented as unstable.
 *
 * `page` is zero-based.
 */
export interface PageResponse<T> {
  readonly content: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

/** A resolved-but-empty page, for a resource's `defaultValue`. */
export function emptyPage<T>(size = 25): PageResponse<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
}
