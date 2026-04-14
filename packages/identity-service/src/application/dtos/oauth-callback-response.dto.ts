export interface OAuthCallbackUserDto {
  id: string;
  email: string;
  login: string;
  name: string;
  role?: string;
  createdAt: string;
  isNewUser: boolean;
}

export interface OAuthCallbackResponseDto {
  user: OAuthCallbackUserDto;
  accessToken: string;
  refreshToken?: string;
  sessionId?: string;
  expiresIn: string;
}
