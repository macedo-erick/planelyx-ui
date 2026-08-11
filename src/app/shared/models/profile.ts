/** The signed-in user's profile, which lives in Keycloak rather than in the Planelyx database. */
export interface Profile {
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
