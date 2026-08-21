import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DOCUMENT_TYPE_EXTENSIONS,
  FEATURE_FLAG_KEYS,
  FeatureFlag,
  FeatureFlagKey,
  FLAG_FOR_DOCUMENT_TYPE,
  INGEST_DOCUMENT_TYPES,
  IngestDocumentType,
  PARSED_DOCUMENT_TYPES,
} from '../../shared/models/ingest';

/** The runtime switches `planelyx-ocr` serves, and the import formats they leave standing. */
@Service()
export class FeatureFlagService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.ocrUrl}/flags`;

  readonly resource = httpResource<FeatureFlag[]>(() => this.baseUrl, { defaultValue: [] });

  readonly isLoading = computed(() => this.resource.isLoading());
  readonly hasError = computed(() => this.resource.error() !== undefined);

  /** Guarded rather than read straight: a failed request makes `value()` throw, default or not. */
  private readonly flags = computed(() => (this.resource.hasValue() ? this.resource.value() : []));

  private readonly byKey = computed(() => new Map(this.flags().map((flag) => [flag.key, flag])));

  /** Listed in the server's order rather than the order the rows happened to arrive in. */
  readonly ordered = computed(() =>
    FEATURE_FLAG_KEYS.map((key) => this.byKey().get(key)).filter(
      (flag): flag is FeatureFlag => flag !== undefined,
    ),
  );

  /**
   * Fails open, matching the server's own default for a key it does not know: an unreachable
   * flag service must not be able to lock a user out of importing.
   */
  isEnabled(key: FeatureFlagKey): boolean {
    return this.byKey().get(key)?.effective ?? true;
  }

  /** Every type the server will still accept an upload of. */
  readonly uploadableTypes = computed(() =>
    INGEST_DOCUMENT_TYPES.filter((type) => this.isEnabled(FLAG_FOR_DOCUMENT_TYPE[type])),
  );

  /** The subset a parser reads today; the rest are only stored, awaiting a reader. */
  readonly readableTypes = computed(() =>
    this.uploadableTypes().filter((type) => PARSED_DOCUMENT_TYPES.includes(type)),
  );

  readonly storedOnlyTypes = computed(() =>
    this.uploadableTypes().filter((type) => !PARSED_DOCUMENT_TYPES.includes(type)),
  );

  readonly accept = computed(() =>
    this.uploadableTypes()
      .flatMap((type: IngestDocumentType) => DOCUMENT_TYPE_EXTENSIONS[type])
      .join(','),
  );

  setEnabled(key: FeatureFlagKey, enabled: boolean): Observable<FeatureFlag> {
    return this.http
      .patch<FeatureFlag>(`${this.baseUrl}/${key}`, { enabled })
      .pipe(tap(() => this.reload()));
  }

  reload(): void {
    this.resource.reload();
  }
}
