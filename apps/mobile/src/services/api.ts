import axios from 'axios';
import { ENV } from '@/src/config/env';
import { getToken } from '@/src/core/security/token-vault';

export const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((requestConfig) => {
  const token = getToken();
  if (!token) return requestConfig;

  requestConfig.headers = requestConfig.headers ?? {};
  requestConfig.headers.Authorization = `Bearer ${token}`;
  return requestConfig;
});
