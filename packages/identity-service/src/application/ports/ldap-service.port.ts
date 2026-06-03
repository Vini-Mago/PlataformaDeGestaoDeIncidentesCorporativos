export interface LDAPUser {
  email: string;
  login: string;
  name: string;
}

export interface ILDAPService {
  authenticate(usernameOrEmail: string, password: string): Promise<LDAPUser | null>;
}
