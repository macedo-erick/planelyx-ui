import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Profile, ProfileRequest } from '../../shared/models/profile';

/** The signed-in user's profile. */
@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me`;

  readonly resource = httpResource<Profile>(() => this.baseUrl);

  readonly profile = computed(() => (this.resource.hasValue() ? this.resource.value() : null));
  readonly isLoading = computed(() => this.resource.isLoading());

  update(request: ProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(this.baseUrl, request).pipe(tap(() => this.resource.reload()));
  }
}
