import { prisma } from "../helpers";
import * as permissionsRaw from "../jsons/permissions.json"

type PermissionInput = {
  code: string;
  label: string;
  useStorePermission?: boolean; // ausente => false
};

const PERMISSIONS_STRICT_SYNC = true

export default async function seedPermissions() {
  // Normaliza + remove duplicados (último ganha)
  const desiredMap = new Map<string, { code: string; label: string; useStorePermission: boolean }>();
  for (const p of (permissionsRaw as PermissionInput[])) {
    if (!p?.code) continue;
    desiredMap.set(p.code, {
      code: p.code,
      label: p.label ?? "",
      useStorePermission: !!p.useStorePermission,
    });
  }
  const desired = [...desiredMap.values()];
  const codes = desired.map(d => d.code);

  await prisma.$transaction(async (tx) => {
    // 1) Upsert de todas as permissões do JSON (reflete alterações em label/useStorePermission)
    for (const p of desired) {
      await tx.permission.upsert({
        where: { code: p.code },
        update: {
          label: p.label,
          useStorePermission: p.useStorePermission,
        },
        create: {
          code: p.code,
          label: p.label,
          useStorePermission: p.useStorePermission,
        },
      });
    }

    // 2) (Opcional) Remover permissões que não existem mais no JSON
    if (PERMISSIONS_STRICT_SYNC) {
      // Se houver tabela de junção UserPermission, remova-a antes para evitar FK error:
      // Pegamos os IDs a remover e limpamos a junção, depois removemos Permission.
      const toDelete = await tx.permission.findMany({
        where: { code: { notIn: codes } },
        select: { id: true },
      });
      if (toDelete.length) {
        const ids = toDelete.map(p => p.id);
        // Se seu schema tiver model UserPermission (recomendado):
        await tx.userPermission.deleteMany({ where: { permissionId: { in: ids } } });
        await tx.permission.deleteMany({ where: { id: { in: ids } } });
      }
    }
  });

  console.log(`• permissions: upserted ${codes.length} entr${codes.length === 1 ? "y" : "ies"}${PERMISSIONS_STRICT_SYNC ? " (strict sync ON)" : ""}`);
}
