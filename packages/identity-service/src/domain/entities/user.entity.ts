import { Email } from "../value-objects/email.vo";

export type UserStatus = "active" | "inactive";

export interface UserProfile {
  login: string;
  phone?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  photoUrl?: string | null;
  preferredLanguage?: string | null;
  timeZone?: string | null;
}

/**
 * Entidade de domínio: User.
 * Identidade: id. Regras de negócio no domínio.
 */
export class User {
  private constructor(
    private readonly _id: string,
    private _email: Email,
    private _name: string,
    private readonly _role: string,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
    private readonly _status: UserStatus,
    private readonly _profile: UserProfile
  ) {}

  static create(
    id: string,
    email: Email,
    name: string,
    role: string = "user",
    profile?: Partial<UserProfile>
  ): User {
    if (!name || name.trim().length === 0) {
      throw new Error("Name is required");
    }
    const login = (profile?.login ?? email.value).trim().toLowerCase();
    if (!login) {
      throw new Error("Login is required");
    }
    const now = new Date();
    return new User(id, email, name.trim(), role, now, now, "active", {
      login,
      phone: profile?.phone ?? null,
      department: profile?.department ?? null,
      jobTitle: profile?.jobTitle ?? null,
      photoUrl: profile?.photoUrl ?? null,
      preferredLanguage: profile?.preferredLanguage ?? null,
      timeZone: profile?.timeZone ?? null,
    });
  }

  static reconstitute(
    id: string,
    email: string,
    name: string,
    createdAt: Date,
    role: string = "user",
    updatedAt: Date = createdAt,
    status: UserStatus = "active",
    profile?: Partial<UserProfile>
  ): User {
    return new User(id, Email.create(email), name, role, createdAt, updatedAt, status, {
      login: profile?.login ?? email,
      phone: profile?.phone ?? null,
      department: profile?.department ?? null,
      jobTitle: profile?.jobTitle ?? null,
      photoUrl: profile?.photoUrl ?? null,
      preferredLanguage: profile?.preferredLanguage ?? null,
      timeZone: profile?.timeZone ?? null,
    });
  }

  get id(): string {
    return this._id;
  }

  get email(): Email {
    return this._email;
  }

  get name(): string {
    return this._name;
  }

  get role(): string {
    return this._role;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get status(): UserStatus {
    return this._status;
  }

  get profile(): UserProfile {
    return this._profile;
  }
}
