import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/** Executa módulos em série, exibindo tempos e capturando erros. */
export async function runModules(mods: Array<[string, () => Promise<void>]>) {
  for (const [name, fn] of mods) {
    const t0 = Date.now();
    console.log(`→ Running seed: ${name}...`);
    await fn();
    console.log(`✓ Done: ${name} in ${Date.now() - t0}ms`);
  }
}

/** Divide array em pedaços (para createMany muito grande). */
export function chunk<T>(arr: T[], size = 1000): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Pequeno helper para logar resultados de createMany. */
export function logCreateMany(entity: string, count: number) {
  console.log(`• ${entity}: inserted or skipped ${count} rows (skipDuplicates)`);
}
