/**
 * User subset in auth responses (login pode omitir createdAt).
 */
export interface AuthUserDto {
  id: string;
  email: string;
  login?: string;
  name: string;
  role?: string;
  status?: "active" | "inactive";
  createdAt?: string;
}

export interface AuthResponseDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  expiresIn: string;
}
