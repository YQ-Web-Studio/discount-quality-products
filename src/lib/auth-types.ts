export interface AuthUser {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface WordPressAuthSession {
  token: string;
  user: AuthUser;
}
