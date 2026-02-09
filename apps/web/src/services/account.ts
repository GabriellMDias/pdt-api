import type { UserProfile } from '../context/AuthContext';

type ApiError = { message?: string | string[] };

function normalizeApiErrorMessage(payload: unknown, fallback: string) {
  const data = payload as ApiError | undefined;
  if (!data?.message) return fallback;
  return Array.isArray(data.message) ? data.message.join('; \n') : data.message;
}

export async function getMe(token: string): Promise<UserProfile> {
  const res = await fetch('/api/account/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    throw new Error(
      normalizeApiErrorMessage(payload, 'Não foi possível obter os dados do usuário'),
    );
  }

  return res.json();
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<{ message: string }> {
  const res = await fetch('/api/account/password', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(
      normalizeApiErrorMessage(payload, 'Não foi possível alterar a senha'),
    );
  }

  return payload as { message: string };
}
