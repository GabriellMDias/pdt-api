import type { PrismaClient, AnalysisType } from '@prisma/client';

type Params = {
  code: string;
  description: string;
  groupName: string;
};

/**
 * Retorna o AnalysisType com o `code` informado; cria se não existir.
 * Requer unique em `code`.
 */
export async function getOrCreateAnalysisType(
  prisma: PrismaClient,
  { code, description, groupName }: Params
): Promise<AnalysisType> {
  return prisma.analysisType.upsert({
    where: { code },
    update: {}, // nada a atualizar se já existir
    create: { code, description, groupName },
  });
}