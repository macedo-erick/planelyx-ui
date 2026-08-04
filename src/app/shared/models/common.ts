/** UUID primary key, serialized as a string. */
export type Uuid = string;

/** Java `LocalDate` on the wire: `"2026-08-03"`. Never a `Date`. */
export type IsoDate = string;

/** Java `Instant` on the wire: `"2026-08-03T12:34:56.789Z"`. */
export type IsoInstant = string;

/**
 * Java `BigDecimal` with `NUMERIC(19,2)` precision, serialized as a JSON number.
 * Safe as a `number` at personal-finance magnitudes, but never sum without rounding —
 * use the helpers in `shared/util/money.ts`.
 */
export type Money = number;
