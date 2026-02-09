import { prisma } from "../helpers";
import * as raw from "../jsons/analysisTypes.json";

type FieldInput = {
  key: string;
  label: string;
  dataType: "string" | "int" | "decimal" | "boolean" | "date" | "datetime";
  isArray?: boolean;
  nullable?: boolean;
  order?: number;
};

type AnalysisTypeInput = {
  code: string;
  description: string;
  active?: boolean;
  groupName?: string;
  fields: FieldInput[];
};

const STRICT_SYNC = false;

export default async function seedAnalyses() {
  const input = raw as AnalysisTypeInput[];

  await prisma.$transaction(async tx => {
    for (const item of input) {
      if (!item.code) continue;

      // 1) Upsert AnalysisType
      const type = await tx.analysisType.upsert({
        where: { code: item.code },
        update: {
          description: item.description,
          active: item.active ?? true,
          groupName: item.groupName ?? ""
        },
        create: {
          code: item.code,
          description: item.description,
          active: item.active ?? true,
          groupName: item.groupName ?? ""
        }
      });

      // 2) Preparar fields desejados
      const desiredFields = item.fields.map(f => ({
        ...f,
        analysisTypeId: type.id,
        isArray: f.isArray ?? false,
        nullable: f.nullable ?? false,
        order: f.order ?? 0
      }));

      // 3) Upsert de cada field
      for (const f of desiredFields) {
        await tx.analysisField.upsert({
          where: {
            analysisTypeId_key: { analysisTypeId: type.id, key: f.key }
          },
          update: {
            label: f.label,
            dataType: f.dataType,
            isArray: f.isArray,
            nullable: f.nullable,
            order: f.order
          },
          create: {
            analysisTypeId: type.id,
            key: f.key,
            label: f.label,
            dataType: f.dataType,
            isArray: f.isArray,
            nullable: f.nullable,
            order: f.order
          }
        });
      }

      // 4) STRICT SYNC: remover fields não listados no JSON
      if (STRICT_SYNC) {
        const keys = desiredFields.map(f => f.key);
        await tx.analysisField.deleteMany({
          where: {
            analysisTypeId: type.id,
            key: { notIn: keys }
          }
        });
      }
    }

    // 5) STRICT SYNC para remover AnalysisTypes inexistentes
    if (STRICT_SYNC) {
      const codes = input.map(i => i.code);
      const toDelete = await tx.analysisType.findMany({
        where: { code: { notIn: codes } },
        select: { id: true }
      });
      if (toDelete.length) {
        const ids = toDelete.map(t => t.id);
        // Remover fields antes devido às FK
        await tx.analysisField.deleteMany({
          where: { analysisTypeId: { in: ids } }
        });
        await tx.analysisType.deleteMany({
          where: { id: { in: ids } }
        });
      }
    }
  });

  console.log(`• analysis: synced ${input.length} analysis types (strict=${STRICT_SYNC})`);
}
