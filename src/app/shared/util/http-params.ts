import { HttpParams } from '@angular/common/http';

/** Builds `HttpParams` from a filter object. */
export function toHttpParams(
  filters: Record<string, string | number | boolean | null | undefined>,
): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
