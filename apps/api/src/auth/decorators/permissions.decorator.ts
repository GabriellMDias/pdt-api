import { SetMetadata } from '@nestjs/common';

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// NOVO: permite "qualquer uma" das permissões
export const PermissionsAny = (...permissions: string[]) =>
  SetMetadata('permissions:any', permissions);
