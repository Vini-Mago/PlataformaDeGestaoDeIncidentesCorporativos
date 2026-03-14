/**
 * Domain event: user updated.
 * Published by Identity Service when user data (name, email) changes; consumed by services that replicate user data.
 * Same payload shape as UserCreatedPayload; consumers should upsert.
 */
export interface UserUpdatedPayload {
  userId: string;
  email: string;
  name: string;
  occurredAt: string;
}

export const USER_UPDATED_EVENT = "user.updated";
