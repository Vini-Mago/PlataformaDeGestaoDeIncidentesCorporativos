import type { ILDAPService, LDAPUser } from "../../../application/ports/ldap-service.port";

export class MockLDAPService implements ILDAPService {
  private readonly directory: LDAPUser[] = [
    { email: "john.doe@corp.internal", login: "jdoe", name: "John Doe" },
    { email: "jane.smith@corp.internal", login: "jsmith", name: "Jane Smith" },
  ];

  async authenticate(usernameOrEmail: string, password: string): Promise<LDAPUser | null> {
    // Standard corporate mock password
    if (password !== "LdapPassword123") {
      return null;
    }

    const normalized = usernameOrEmail.trim().toLowerCase();

    // Check pre-configured directory users
    const matched = this.directory.find(
      (user) => user.email === normalized || user.login === normalized
    );
    if (matched) {
      return matched;
    }

    // Dynamic corporate login support (any user@corp.internal or corp login)
    if (normalized.endsWith("@corp.internal")) {
      const login = normalized.split("@")[0];
      const name = login
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return { email: normalized, login, name };
    }

    return null;
  }
}
