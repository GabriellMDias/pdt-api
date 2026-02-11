import { api } from '@/src/services/api';
import type { AccountMeResponse, LoginResponse } from '@/src/features/auth/types';

export async function loginOnline(
  identifier: string,
  password: string,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', {
    login: identifier,
    password,
  });
  return response.data;
}

export async function fetchCurrentAccount(): Promise<AccountMeResponse> {
  const response = await api.get<AccountMeResponse>('/account/me');
  return response.data;
}
