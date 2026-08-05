/**
 * The signed-in user's profile, which lives in Keycloak rather than in the Planelyx database.
 *
 * Reached through the API's `/me` endpoints rather than Keycloak directly, so the browser never
 * needs admin-scoped credentials.
 */
export interface Profile {
  /** Read-only: the realm does not allow the username to change. */
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly emailVerified: boolean;
}

export interface ProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
}
