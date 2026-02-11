let accessToken: string | null = null;

export function setToken(nextToken: string | null): void {
  accessToken = nextToken;
}

export function getToken(): string | null {
  return accessToken;
}

export function clearToken(): void {
  accessToken = null;
}
