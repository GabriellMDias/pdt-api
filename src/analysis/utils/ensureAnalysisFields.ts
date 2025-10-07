import { PrismaClient, type AnalysisDataType, } from "@prisma/client"
 
type AnalysisFieldSpec  = {
    key: string, 
    label: string, 
    dataType: AnalysisDataType, 
    order: number
}

/**
 * Garante a existência/atualização de um conjunto de campos para um analysisTypeId.
 * Tenta usar upsert com unique composta [analysisTypeId, key]; se não existir no schema,
 * cai no fallback (findFirst/update/create).
 */
export async function ensureAnalysisFields(
  prisma: PrismaClient,
  analysisTypeId: number,
  fields: AnalysisFieldSpec[],
) {
  // helper local para um campo
  const upsertOne = async (spec: AnalysisFieldSpec) => {
    const { key, label, dataType, order } = spec;

    try {
      // Requer no schema algo como:
      // @@unique([analysisTypeId, key], name: "analysisTypeId_key")
      await prisma.analysisField.upsert({
        where: { analysisTypeId_key: { analysisTypeId, key } },
        create: { analysisTypeId, key, label, dataType, order },
        update: { label, dataType, order },
      });
    } catch {
      // fallback para clientes sem a unique composta nomeada
      const existing = await prisma.analysisField.findFirst({
        where: { analysisTypeId, key },
        select: { id: true },
      });

      if (existing) {
        await prisma.analysisField.update({
          where: { id: existing.id },
          data: { label, dataType, order },
        });
      } else {
        await prisma.analysisField.create({
          data: { analysisTypeId, key, label, dataType, order },
        });
      }
    }
  };

  // opcional: rodar em transação para garantir atomicidade
  await prisma.$transaction(async (tx) => {
    for (const spec of fields) {
      await upsertOne(spec);
    }
  });
}