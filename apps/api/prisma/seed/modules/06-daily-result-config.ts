import { Prisma } from "@prisma/client";
import { prisma } from "../helpers";
import { DEFAULT_DAILY_RESULT_LINE_CONFIG } from "../../../src/adm/dre/daily-result-config/default-daily-result-line-config";

export default async function seedDailyResultConfig() {
  for (const line of DEFAULT_DAILY_RESULT_LINE_CONFIG) {
    const data: Prisma.DailyResultLineConfigUncheckedCreateInput = {
      lineId: line.lineId,
      label: line.label,
      order: line.order,
      sourceType: line.sourceType,
      format: line.format ?? null,
      visible: line.visible ?? true,
      bold: line.bold ?? false,
      shade: line.shade ?? false,
      sourceConfig: line.sourceConfig ?? Prisma.JsonNull,
      calculationConfig: line.calculationConfig ?? Prisma.JsonNull,
      styleConfig: line.styleConfig ?? Prisma.JsonNull,
      vrDreId: line.vrDreId ?? null,
      vrDreItemId: line.vrDreItemId ?? null,
      vrDreType: line.vrDreType ?? null,
      vrDreTotalizationType: line.vrDreTotalizationType ?? null,
      detailConfig: line.detailConfig ?? Prisma.JsonNull,
      active: line.active ?? true,
    };

    await prisma.dailyResultLineConfig.upsert({
      where: { lineId: line.lineId },
      update: data,
      create: data,
    });
  }

  console.log(
    `• daily-result-config: upserted ${DEFAULT_DAILY_RESULT_LINE_CONFIG.length} lines`,
  );
}
