import bcrypt from 'bcryptjs';

const PASSWORD_HASH_ROUNDS = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, PASSWORD_HASH_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  if (!passwordHash) return false;
  return bcrypt.compare(plainPassword, passwordHash);
}
