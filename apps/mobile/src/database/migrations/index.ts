import type { Migration } from '@/src/database/types';
import { migration001CreateAppMeta } from '@/src/database/migrations/001-app-meta';
import { migration002CreateAuthUsers } from '@/src/database/migrations/002-auth-users';
import { migration003CreateAuthSessions } from '@/src/database/migrations/003-auth-sessions';
import { migration004CreateSyncOutboxEvents } from '@/src/database/migrations/004-sync-outbox-events';
import { migration005CreateSyncRuns } from '@/src/database/migrations/005-sync-runs';
import { migration006CreateBootstrapMasterData } from '@/src/database/migrations/006-bootstrap-master-data';
import { migration007CreateRuptureFoundation } from '@/src/database/migrations/007-rupture-foundation';
import { migration008CreateHomeFavorites } from '@/src/database/migrations/008-home-favorites';
import { migration009CreateUserPreferences } from '@/src/database/migrations/009-user-preferences';
import { migration010CreateExchangeFoundation } from '@/src/database/migrations/010-exchange-foundation';
import { migration011CreateConsumptionFoundation } from '@/src/database/migrations/011-consumption-foundation';
import { migration012CreateProductionFoundation } from '@/src/database/migrations/012-production-foundation';
import { migration013CreateBalanceFoundation } from '@/src/database/migrations/013-balance-foundation';

export const migrations: readonly Migration[] = [
  migration001CreateAppMeta,
  migration002CreateAuthUsers,
  migration003CreateAuthSessions,
  migration004CreateSyncOutboxEvents,
  migration005CreateSyncRuns,
  migration006CreateBootstrapMasterData,
  migration007CreateRuptureFoundation,
  migration008CreateHomeFavorites,
  migration009CreateUserPreferences,
  migration010CreateExchangeFoundation,
  migration011CreateConsumptionFoundation,
  migration012CreateProductionFoundation,
  migration013CreateBalanceFoundation,
];

export const LATEST_MIGRATION_VERSION = migrations[migrations.length - 1]?.version ?? 0;
