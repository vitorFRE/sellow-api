export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export type JwtPayloadWithRefresh = JwtPayload & { refreshToken: string };
