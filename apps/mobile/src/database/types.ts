import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';

export type SqliteBindValues = SQLiteBindParams;

export type DatabaseExecutor = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export type DatabaseConnection = SQLiteDatabase;

export type TransactionMode = 'deferred' | 'immediate' | 'exclusive';

export type Migration = {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

export type AppMetaRow = {
  key: string;
  value: string;
  updated_at: string;
};

export type AuthUserRow = {
  id: number;
  name: string;
  email: string | null;
  login: string;
  login_normalized: string;
  password_hash: string;
  permissions_json: string;
  updated_at: string;
  synced_at: string;
  last_login_at: string | null;
};

export type AuthSessionMode = 'online' | 'offline';

export type AuthSessionRow = {
  user_id: number;
  token: string | null;
  token_expires_at: string | null;
  mode: AuthSessionMode;
  last_login_at: string;
  created_at: string;
  updated_at: string;
};

export type AuthUserUpsertInput = {
  id: number;
  name: string;
  email: string | null;
  login: string;
  loginNormalized: string;
  passwordHash: string;
  permissionsJson: string;
  updatedAt: string;
  syncedAt: string;
};

export type AuthSessionUpsertInput = {
  userId: number;
  token: string | null;
  tokenExpiresAt: string | null;
  mode: AuthSessionMode;
  lastLoginAt: string;
};

export type AuthUserContextRow = {
  user_id: number;
  name: string;
  email: string | null;
  active_status: number;
  notify_cost_center_type: number;
  codigo_usuario_vr_master: number | null;
  synced_at: string;
  updated_at: string;
};

export type AuthUserContextUpsertInput = {
  userId: number;
  name: string;
  email: string | null;
  activeStatus: boolean;
  notifyCostCenterType: boolean;
  codigoUsuarioVrMaster: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type MasterStoreRow = {
  id: number;
  description: string;
  store_name: string;
  cnpj: string | null;
  active_status: number;
  synced_at: string;
  updated_at: string;
};

export type MasterStoreUpsertInput = {
  id: number;
  description: string;
  storeName: string;
  cnpj: string | null;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
};

export type UserPermissionScopeRow = {
  id: number;
  user_id: number;
  permission_code: string;
  permission_group_path: string | null;
  use_store_permission: number;
  global_access: number;
  store_id: number | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
};

export type UserPermissionScopeUpsertInput = {
  userId: number;
  permissionCode: string;
  permissionGroupPath?: string | null;
  useStorePermission: boolean;
  globalAccess: boolean;
  storeId?: number | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CatalogProductRow = {
  id: number;
  store_id: number;
  barcode: string | null;
  description: string;
  package_quantity: number | null;
  packaging_type_id: number | null;
  packaging_description: string | null;
  shelf_code: string | null;
  active_status: number;
  decimal_allowed: number;
  sale_price: number | null;
  stock_quantity: number | null;
  exchange_quantity: number | null;
  average_cost_with_tax: number | null;
  gross_weight: number | null;
  synced_at: string;
  updated_at: string;
};

export type CatalogProductUpsertInput = {
  id: number;
  storeId: number;
  barcode?: string | null;
  description: string;
  packageQuantity?: number | null;
  packagingTypeId?: number | null;
  packagingDescription?: string | null;
  shelfCode?: string | null;
  activeStatus: boolean;
  decimalAllowed?: boolean;
  salePrice?: number | null;
  stockQuantity?: number | null;
  exchangeQuantity?: number | null;
  averageCostWithTax?: number | null;
  grossWeight?: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type ExchangeReasonRow = {
  id: number;
  description: string;
  active_status: number;
  synced_at: string;
  updated_at: string;
};

export type ExchangeReasonUpsertInput = {
  id: number;
  description: string;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
};

export type ConsumptionReasonRow = {
  id: number;
  description: string;
  active_status: number;
  synced_at: string;
  updated_at: string;
};

export type ConsumptionReasonUpsertInput = {
  id: number;
  description: string;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
};

export type ProductionRecipeRow = {
  id: number;
  store_id: number;
  description: string;
  active_status: number;
  synced_at: string;
  updated_at: string;
};

export type ProductionRecipeOutputRow = {
  recipe_output_id: number;
  recipe_id: number;
  store_id: number;
  product_id: number;
  yield_quantity: number | null;
  synced_at: string;
  updated_at: string;
};

export type ProductionRecipeInputRow = {
  recipe_input_id: number;
  recipe_id: number;
  store_id: number;
  product_id: number;
  recipe_package_quantity: number | null;
  product_package_quantity: number | null;
  deduct_stock: number;
  conversion_factor: number | null;
  synced_at: string;
  updated_at: string;
};

export type ProductionRecipeOutputUpsertInput = {
  recipeOutputId: number;
  recipeId: number;
  storeId: number;
  productId: number;
  yieldQuantity: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type ProductionRecipeInputUpsertInput = {
  recipeInputId: number;
  recipeId: number;
  storeId: number;
  productId: number;
  recipePackageQuantity: number | null;
  productPackageQuantity: number | null;
  deductStock: boolean;
  conversionFactor: number | null;
  syncedAt: string;
  updatedAt: string;
};

export type ProductionRecipeUpsertInput = {
  id: number;
  storeId: number;
  description: string;
  activeStatus: boolean;
  syncedAt: string;
  updatedAt: string;
  outputs: readonly ProductionRecipeOutputUpsertInput[];
  inputs: readonly ProductionRecipeInputUpsertInput[];
};

export type BalanceHeaderRow = {
  id: number;
  store_id: number;
  description: string;
  stock_label: string;
  status_code: number;
  synced_at: string;
  updated_at: string;
};

export type BalanceHeaderUpsertInput = {
  id: number;
  storeId: number;
  description: string;
  stockLabel: string;
  statusCode: number;
  syncedAt: string;
  updatedAt: string;
};

export type HomeFavoriteRow = {
  id: number;
  user_id: number;
  route_key: string;
  label: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HomeFavoriteInsertInput = {
  userId: number;
  routeKey: string;
  label: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type UserPreferenceRow = {
  id: number;
  user_id: number;
  preference_key: string;
  preference_value: string;
  created_at: string;
  updated_at: string;
};

export type UserPreferenceUpsertInput = {
  userId: number;
  preferenceKey: string;
  preferenceValue: string;
  createdAt: string;
  updatedAt: string;
};

export type RuptureEntryRow = {
  local_id: number;
  event_id: string;
  user_id: number;
  store_id: number;
  shelf_code: string;
  product_id: number;
  barcode: string | null;
  product_description: string;
  created_at: string;
  updated_at: string;
};

export type SyncOutboxEventStatus = 'pending' | 'sending' | 'success' | 'failed';
export type SyncFailureClass = 'none' | 'temporary' | 'permanent';

export type SyncOutboxEventRow = {
  event_id: string;
  batch_id: string | null;
  event_type: string;
  aggregate_type: string;
  aggregate_key: string;
  store_id: number;
  user_id: number;
  device_id: string;
  schema_version: number;
  payload_json: string;
  payload_hash: string;
  status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  locked_at: string | null;
  locked_by: string | null;
  last_http_status: number | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncOutboxEventInsertInput = {
  eventId: string;
  batchId?: string | null;
  eventType: string;
  aggregateType: string;
  aggregateKey: string;
  storeId: number;
  userId: number;
  deviceId: string;
  schemaVersion: number;
  payloadJson: string;
  payloadHash: string;
  status?: SyncOutboxEventStatus;
  failureClass?: SyncFailureClass;
  attemptCount?: number;
  lastAttemptAt?: string | null;
  nextAttemptAt?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  lastHttpStatus?: number | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  serverAckStatus?: string | null;
  serverReceiptId?: string | null;
  serverProcessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClaimSyncOutboxBatchInput = {
  userId: number;
  storeId?: number | null;
  eventTypePrefix?: string | null;
  aggregateKeyPrefix?: string | null;
  limit: number;
  batchId: string;
  lockedBy: string;
  claimedAt: string;
};

export type SyncOutboxEventSuccessInput = {
  eventId: string;
  ackStatus: string;
  receiptId?: string | null;
  processedAt?: string | null;
  httpStatus?: number | null;
  updatedAt: string;
};

export type SyncOutboxEventFailureInput = {
  eventId: string;
  failureClass: Exclude<SyncFailureClass, 'none'>;
  httpStatus?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  serverAckStatus?: string | null;
  nextAttemptAt?: string | null;
  updatedAt: string;
};

export type RuptureEntryInsertInput = {
  eventId: string;
  userId: number;
  storeId: number;
  shelfCode: string;
  productId: number;
  barcode?: string | null;
  productDescription: string;
  createdAt: string;
  updatedAt: string;
};

export type RuptureEntryListRow = RuptureEntryRow & {
  outbox_status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
};

export type ExchangeEntryRow = {
  local_id: number;
  event_id: string;
  user_id: number;
  store_id: number;
  reason_id: number;
  reason_description: string;
  product_id: number;
  barcode: string | null;
  product_description: string;
  movement_type: 'add' | 'remove';
  quantity_input: number;
  package_count: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
};

export type ExchangeEntryInsertInput = {
  eventId: string;
  userId: number;
  storeId: number;
  reasonId: number;
  reasonDescription: string;
  productId: number;
  barcode?: string | null;
  productDescription: string;
  movementType: 'add' | 'remove';
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ExchangeEntryListRow = ExchangeEntryRow & {
  outbox_status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
};

export type ConsumptionEntryRow = {
  local_id: number;
  event_id: string;
  user_id: number;
  store_id: number;
  reason_id: number;
  reason_description: string;
  product_id: number;
  barcode: string | null;
  product_description: string;
  movement_type: 'add' | 'remove';
  quantity_input: number;
  package_count: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
};

export type ConsumptionEntryInsertInput = {
  eventId: string;
  userId: number;
  storeId: number;
  reasonId: number;
  reasonDescription: string;
  productId: number;
  barcode?: string | null;
  productDescription: string;
  movementType: 'add' | 'remove';
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ConsumptionEntryListRow = ConsumptionEntryRow & {
  outbox_status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
};

export type ProductionEntryRow = {
  local_id: number;
  event_id: string;
  user_id: number;
  store_id: number;
  recipe_id: number;
  recipe_description: string;
  product_id: number;
  product_description: string;
  quantity_input: number;
  created_at: string;
  updated_at: string;
};

export type ProductionEntryInsertInput = {
  eventId: string;
  userId: number;
  storeId: number;
  recipeId: number;
  recipeDescription: string;
  productId: number;
  productDescription: string;
  quantityInput: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductionEntryListRow = ProductionEntryRow & {
  outbox_status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
};

export type BalanceEntryRow = {
  local_id: number;
  event_id: string;
  user_id: number;
  store_id: number;
  balance_id: number;
  balance_description: string;
  stock_label: string;
  product_id: number;
  barcode: string | null;
  product_description: string;
  movement_type: 'add' | 'remove';
  quantity_input: number;
  package_count: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
};

export type BalanceEntryInsertInput = {
  eventId: string;
  userId: number;
  storeId: number;
  balanceId: number;
  balanceDescription: string;
  stockLabel: string;
  productId: number;
  barcode?: string | null;
  productDescription: string;
  movementType: 'add' | 'remove';
  quantityInput: number;
  packageCount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
};

export type BalanceEntryListRow = BalanceEntryRow & {
  outbox_status: SyncOutboxEventStatus;
  failure_class: SyncFailureClass;
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  server_ack_status: string | null;
  server_receipt_id: string | null;
  server_processed_at: string | null;
};

export type BalanceGroupListRow = {
  balance_id: number;
  store_id: number;
  balance_description: string;
  stock_label: string;
  status_code: number | null;
  total_entries: number;
  sent_entries: number;
  not_transmitted_entries: number;
  sending_entries: number;
  temporary_error_entries: number;
  permanent_error_entries: number;
  last_entry_created_at: string;
};

export type SyncRunStatus = 'started' | 'success' | 'partial' | 'failed';
export type SyncRunType = 'push' | 'pull' | 'reconcile';

export type SyncRunRow = {
  id: number;
  run_type: SyncRunType;
  scope: string;
  store_id: number | null;
  user_id: number | null;
  trigger_source: string;
  status: SyncRunStatus;
  started_at: string;
  finished_at: string | null;
  cursor_in: string | null;
  cursor_out: string | null;
  request_payload_json: string | null;
  response_payload_json: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncRunInsertInput = {
  runType: SyncRunType;
  scope: string;
  storeId?: number | null;
  userId?: number | null;
  triggerSource?: string;
  status?: SyncRunStatus;
  startedAt: string;
  finishedAt?: string | null;
  cursorIn?: string | null;
  cursorOut?: string | null;
  requestPayloadJson?: string | null;
  responsePayloadJson?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type SyncRunFinishInput = {
  status: Exclude<SyncRunStatus, 'started'>;
  finishedAt: string;
  cursorOut?: string | null;
  responsePayloadJson?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};
