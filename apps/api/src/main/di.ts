import { env } from "../infrastructure/config/env.js";
import type { RedisClient } from "../infrastructure/redis/redisClient.js";
import { MySQLOpsTableOrderSummaryRepository } from "../infrastructure/db/mysql/repositories/MySQLOpsTableOrderSummaryRepository.js";

// ===== Services =====
import { OrderCodeGenerator } from "../infrastructure/services/OrderCodeGenerator.js";
import { MySQLOrderCheckoutService } from "../infrastructure/db/mysql/services/MySQLOrderCheckoutService.js";
import { MySQLMenuItemStockRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuItemStockRepository.js";
import { NoopStockHoldService } from "../application/ports/services/NoopStockHoldService.js";
import { RedisStockHoldService } from "../infrastructure/redis/stock/RedisStockHoldService.js";

// ===== Event bus (optional) =====
import type { IEventBus } from "../application/ports/events/IEventBus.js";
import { NoopEventBus } from "../application/ports/events/NoopEventBus.js";

// ===== MySQL repositories =====
import { MySQLTableRepository } from "../infrastructure/db/mysql/repositories/MySQLTableRepository.js";
import { MySQLTableSessionRepository } from "../infrastructure/db/mysql/repositories/MySQLTableSessionRepository.js";
import { MySQLTableReservationRepository } from "../infrastructure/db/mysql/repositories/MySQLTableReservationRepository.js";
import { MySQLCartRepository } from "../infrastructure/db/mysql/repositories/MySQLCartRepository.js";
import { MySQLCartItemRepository } from "../infrastructure/db/mysql/repositories/MySQLCartItemRepository.js";
import { MySQLMenuItemRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuItemRepository.js";
import { MySQLMenuCatalogRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuCatalogRepository.js";
import { MySQLOrderRepository } from "../infrastructure/db/mysql/repositories/MySQLOrderRepository.js";
import { MySQLOrderSnapshotRepository } from "../infrastructure/db/mysql/repositories/MySQLOrderSnapshotRepository.js";
import { MySQLAdminOrderRepository } from "../infrastructure/db/mysql/repositories/MySQLAdminOrderRepository.js";
import { MySQLPaymentRepository } from "../infrastructure/db/mysql/repositories/MySQLPaymentRepository.js";
import { MySQLVNPayLogRepository } from "../infrastructure/db/mysql/repositories/MySQLVNPayLogRepository.js";
import { MySQLStaffUserRepository } from "../infrastructure/db/mysql/repositories/MySQLStaffUserRepository.js";
import { MySQLAdminUserRepository } from "../infrastructure/db/mysql/repositories/MySQLAdminUserRepository.js";
import { MySQLMaintenanceRepository } from "../infrastructure/db/mysql/repositories/MySQLMaintenanceRepository.js";
import { MySQLRealtimeAdminAuditRepository } from "../infrastructure/db/mysql/repositories/MySQLRealtimeAdminAuditRepository.js";
import { MySQLAuditLogRepository } from "../infrastructure/db/mysql/repositories/MySQLAuditLogRepository.js";
import { MySQLInventoryRepository } from "../infrastructure/db/mysql/repositories/MySQLInventoryRepository.js";
import { MySQLOrderQueryRepository } from "../infrastructure/db/mysql/repositories/MySQLOrderQueryRepository.js";

// ===== Client auth repositories =====
import { MySQLClientRepository } from "../infrastructure/db/mysql/repositories/MySQLClientRepository.js";
import { MySQLOtpRepository } from "../infrastructure/db/mysql/repositories/MySQLOtpRepository.js";
import { MySQLClientRefreshTokenRepository } from "../infrastructure/db/mysql/repositories/MySQLClientRefreshTokenRepository.js";

// ===== Redis repositories =====
import { CachedMenuCatalogRepository } from "../infrastructure/redis/repositories/CachedMenuCatalogRepository.js";
import { RedisTableSessionRepository } from "../infrastructure/redis/repositories/RedisTableSessionRepository.js";

// ===== Use-cases =====
import { GetTables } from "../application/use-cases/table/GetTables.js";
import { GetTableByDirection } from "../application/use-cases/table/GetTableByDirection.js";
import { OpenTableSession } from "../application/use-cases/table/OpenTableSession.js";
import { CloseTableSession } from "../application/use-cases/table/CloseTableSession.js";

import { GetOrCreateCartForSession } from "../application/use-cases/cart/GetOrCreateCartForSession.js";
import { GetCartDetail } from "../application/use-cases/cart/GetCartDetail.js";
import { UpsertCartItem } from "../application/use-cases/cart/UpsertCartItem.js";
import { RemoveCartItem } from "../application/use-cases/cart/RemoveCartItem.js";

import { CreateOrderFromCart } from "../application/use-cases/order/CreateOrderFromCart.js";

import { ChangeOrderStatus } from "../application/use-cases/admin/ChangeOrderStatus.js";

import { VNPayGateway } from "../infrastructure/payment/vnpay/VNPayGateway.js";
import { CreateVNPayPayment } from "../application/use-cases/payment/CreateVNPayPayment.js";
import { ApplyPaymentSuccess } from "../application/use-cases/payment/ApplyPaymentSuccess.js";
import { CreateMockPaymentSuccess } from "../application/use-cases/payment/CreateMockPaymentSuccess.js";

import { AdminLogin } from "../application/use-cases/admin/AdminLogin.js";
import { ListStaffUsers } from "../application/use-cases/admin/staff/ListStaffUsers.js";
import { CreateStaffUser } from "../application/use-cases/admin/staff/CreateStaffUser.js";
import { UpdateStaffRole } from "../application/use-cases/admin/staff/UpdateStaffRole.js";
import { UpdateStaffStatus } from "../application/use-cases/admin/staff/UpdateStaffStatus.js";
import { ResetStaffPassword } from "../application/use-cases/admin/staff/ResetStaffPassword.js";

import { GetReservationAvailability } from "../application/use-cases/reservation/GetReservationAvailability.js";
import { CreateReservation } from "../application/use-cases/reservation/CreateReservation.js";
import { GetReservation } from "../application/use-cases/reservation/GetReservation.js";
import { CancelReservation } from "../application/use-cases/reservation/CancelReservation.js";
import { ListReservations } from "../application/use-cases/admin/reservation/ListReservations.js";
import { ConfirmReservation } from "../application/use-cases/admin/reservation/ConfirmReservation.js";
import { CheckInReservation } from "../application/use-cases/admin/reservation/CheckInReservation.js";

import { RunMaintenanceJobs } from "../application/use-cases/maintenance/RunMaintenanceJobs.js";
import { SyncTableStatuses } from "../application/use-cases/maintenance/SyncTableStatuses.js";
import { ResetDevState } from "../application/use-cases/maintenance/ResetDevState.js";
import { SetDevStock } from "../application/use-cases/maintenance/SetDevStock.js";

import { ListAdminRealtimeAuditEvents } from "../application/use-cases/admin/realtime/ListAdminRealtimeAuditEvents.js";
import { ReplayAdminRealtimeAuditEvents } from "../application/use-cases/admin/realtime/ReplayAdminRealtimeAuditEvents.js";

import { GetMenuCategories } from "../application/use-cases/menu/GetMenuCategories.js";
import { ListMenuItems } from "../application/use-cases/menu/ListMenuItems.js";
import { GetMenuItemDetail } from "../application/use-cases/menu/GetMenuItemDetail.js";
import { GetComboDetail } from "../application/use-cases/menu/GetComboDetail.js";
import { GetMeatProfile } from "../application/use-cases/menu/GetMeatProfile.js";

// ===== Admin inventory (M2) =====
import { ListBranchStock } from "../application/use-cases/admin/inventory/ListBranchStock.js";
import { AdjustBranchStock } from "../application/use-cases/admin/inventory/AdjustBranchStock.js";
import { ListActiveHolds } from "../application/use-cases/admin/inventory/ListActiveHolds.js";
import { GetStockDriftMetrics } from "../application/use-cases/admin/inventory/GetStockDriftMetrics.js";
import { TriggerStockRehydrate } from "../application/use-cases/admin/inventory/TriggerStockRehydrate.js";
import { BumpMenuVersion } from "../application/use-cases/admin/inventory/BumpMenuVersion.js";

// ===== 7 roles: ops/kitchen/cashier list endpoints (branch-scoped) =====
import { ListBranchTables } from "../application/use-cases/admin/ops/ListBranchTables.js";
import { ListKitchenQueue } from "../application/use-cases/admin/kitchen/ListKitchenQueue.js";
import { ListUnpaidOrders } from "../application/use-cases/admin/cashier/ListUnpaidOrders.js";
import { SettleCashPayment } from "../application/use-cases/admin/cashier/SettleCashPayment.js";

// ===== Client OTP auth =====
import { RequestClientOtp } from "../application/use-cases/auth/RequestClientOtp.js";
import { VerifyClientOtp } from "../application/use-cases/auth/VerifyClientOtp.js";
import { RotateClientRefreshToken } from "../application/use-cases/auth/RotateClientRefreshToken.js";
import { LogoutClient } from "../application/use-cases/auth/LogoutClient.js";

// ===== Controllers =====
import { TableController } from "../interface-adapters/http/controllers/TableController.js";
import { TableSessionController } from "../interface-adapters/http/controllers/TableSessionController.js";
import { CartController } from "../interface-adapters/http/controllers/CartController.js";
import { OrderController } from "../interface-adapters/http/controllers/OrderController.js";
import { AdminOrderController } from "../interface-adapters/http/controllers/AdminOrderController.js";
import { PaymentController } from "../interface-adapters/http/controllers/PaymentController.js";
import { AdminPaymentController } from "../interface-adapters/http/controllers/AdminPaymentController.js";
import { AdminAuthController } from "../interface-adapters/http/controllers/AdminAuthController.js";
import { AdminStaffController } from "../interface-adapters/http/controllers/AdminStaffController.js";
import { AdminInventoryController } from "../interface-adapters/http/controllers/AdminInventoryController.js";
import { AdminOpsController } from "../interface-adapters/http/controllers/AdminOpsController.js";
import { AdminKitchenController } from "../interface-adapters/http/controllers/AdminKitchenController.js";
import { AdminCashierController } from "../interface-adapters/http/controllers/AdminCashierController.js";
import { ReservationController } from "../interface-adapters/http/controllers/ReservationController.js";
import { AdminReservationController } from "../interface-adapters/http/controllers/AdminReservationController.js";
import { AdminMaintenanceController } from "../interface-adapters/http/controllers/AdminMaintenanceController.js";
import { AdminRealtimeController } from "../interface-adapters/http/controllers/AdminRealtimeController.js";
import { AdminObservabilityController } from "../interface-adapters/http/controllers/AdminObservabilityController.js";
import { RealtimeSnapshotController } from "../interface-adapters/http/controllers/RealtimeSnapshotController.js";
import { MenuController } from "../interface-adapters/http/controllers/MenuController.js";
import { ClientAuthController } from "../interface-adapters/http/controllers/ClientAuthController.js";

// Realtime replay store (HTTP snapshot/resync uses Redis-backed store for consistency with sockets)
import { RedisRoomEventStore } from "../infrastructure/realtime/RoomEventStore.js";

export function buildControllers(deps?: { eventBus?: IEventBus; redis?: RedisClient }) {
  const eventBus = deps?.eventBus ?? new NoopEventBus();
  // Capture redis in a local const so TypeScript can safely narrow in async closures.
  const redis = deps?.redis;

  // ===== Tables / Sessions =====
  const tableRepo = new MySQLTableRepository();
  const sessionRepoBase = new MySQLTableSessionRepository();
  const sessionRepo = redis && env.REDIS_SESSION_STORE_ENABLED
    ? new RedisTableSessionRepository(sessionRepoBase, redis, env.REDIS_SESSION_TTL_SECONDS)
    : sessionRepoBase;
  const reservationRepo = new MySQLTableReservationRepository();

  const getTables = new GetTables(tableRepo);
  const getTableByDirection = new GetTableByDirection(tableRepo);

  const openTableSession = new OpenTableSession(
    tableRepo,
    sessionRepo,
    reservationRepo,
    env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
    eventBus,
  );

  const tableController = new TableController(getTables, getTableByDirection);

  // ===== Stock (Phase 1) =====
  const stockRepo = new MySQLMenuItemStockRepository();
  const stockHold = redis && env.REDIS_STOCK_HOLDS_ENABLED
    ? new RedisStockHoldService(redis, stockRepo, { holdTtlSeconds: env.REDIS_STOCK_HOLD_TTL_SECONDS })
    : new NoopStockHoldService();

  // ===== Menu catalog (cached optional) =====
  const menuCatalogBase = new MySQLMenuCatalogRepository();
  const menuCatalogRepo = redis && env.MENU_CACHE_ENABLED
    ? new CachedMenuCatalogRepository(menuCatalogBase, redis, { ttlSeconds: env.MENU_CACHE_TTL_SECONDS })
    : menuCatalogBase;

  // ===== Cart =====
  const cartRepo = new MySQLCartRepository();
  const cartItemRepo = new MySQLCartItemRepository();
  const menuItemRepo = new MySQLMenuItemRepository();

  // CloseTableSession cần cartRepo/stockHold => khởi tạo ở đây (CHỈ 1 LẦN)
  const closeTableSession = new CloseTableSession(
    tableRepo,
    sessionRepo,
    reservationRepo,
    env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
    eventBus,
    cartRepo,
    stockHold,
  );

  const tableSessionController = new TableSessionController(openTableSession, closeTableSession);

  const getOrCreateCart = new GetOrCreateCartForSession(sessionRepo, cartRepo);
  const getCartDetail = new GetCartDetail(cartRepo, cartItemRepo);

  const upsertCartItem = new UpsertCartItem(
    cartRepo,
    cartItemRepo,
    menuItemRepo,
    sessionRepo,
    stockHold,
    eventBus,
  );

  const removeCartItem = new RemoveCartItem(
    cartRepo,
    cartItemRepo,
    sessionRepo,
    stockHold,
    eventBus,
  );

  const cartController = new CartController(getOrCreateCart, getCartDetail, upsertCartItem, removeCartItem);

  // ===== Orders =====
  const orderRepo = new MySQLOrderRepository();
  const orderSnapshotRepo = new MySQLOrderSnapshotRepository();
  const orderCodeGen = new OrderCodeGenerator();
  const checkoutSvc = new MySQLOrderCheckoutService(stockRepo);

  const createOrderFromCart = new CreateOrderFromCart(
    cartRepo,
    cartItemRepo,
    menuCatalogRepo,
    orderCodeGen,
    checkoutSvc,
    sessionRepo,
    stockHold,
    eventBus,
  );

  const orderController = new OrderController(createOrderFromCart, orderRepo);

  // ===== Realtime snapshots/resync (HTTP) =====
  const replayStore = (redis && env.REALTIME_REPLAY_ENABLED)
    ? new RedisRoomEventStore(redis, {
      ttlSeconds: env.REALTIME_REPLAY_TTL_SECONDS,
      maxItems: env.REALTIME_REPLAY_MAX_ITEMS,
    })
    : null;

  const realtimeSnapshotController = new RealtimeSnapshotController({
    sessionRepo,
    tableRepo,
    cartRepo,
    cartItemRepo,
    orderRepo,
    orderSnapshotRepo,
    eventStore: replayStore,
  });

  // ===== Admin orders =====
  const adminOrderRepo = new MySQLAdminOrderRepository();
  const changeOrderStatus = new ChangeOrderStatus(adminOrderRepo, eventBus);
  const adminOrderController = new AdminOrderController(changeOrderStatus);

  // ===== Payments =====
  const paymentRepo = new MySQLPaymentRepository();
  const vnpayLogRepo = new MySQLVNPayLogRepository();
  const vnpayGateway = new VNPayGateway();

  const applyPaymentSuccess = new ApplyPaymentSuccess(paymentRepo, orderRepo, eventBus);
  const createVNPayPayment = new CreateVNPayPayment(orderRepo, paymentRepo, vnpayGateway);

  const paymentController = new PaymentController(
    createVNPayPayment,
    vnpayGateway,
    paymentRepo,
    vnpayLogRepo,
    applyPaymentSuccess,
  );

  const createMockPaymentSuccess = new CreateMockPaymentSuccess(orderRepo, paymentRepo, applyPaymentSuccess);
  const adminPaymentController = new AdminPaymentController(createMockPaymentSuccess);

  // ===== 7 roles: OPS/KITCHEN/CASHIER (internal, branch-scoped for STAFF tokens) =====
  const orderQueryRepo = new MySQLOrderQueryRepository();

  const opsTableSummaryRepo = new MySQLOpsTableOrderSummaryRepository();
  const listBranchTables = new ListBranchTables(tableRepo, opsTableSummaryRepo); const adminOpsController = new AdminOpsController(
    listBranchTables,
    tableRepo,
    sessionRepo,
    cartRepo,
    orderRepo,
    openTableSession,
    closeTableSession,
    getOrCreateCart,
    getCartDetail,
    upsertCartItem,
    removeCartItem,
    createOrderFromCart,
  );

  const listKitchenQueue = new ListKitchenQueue(orderQueryRepo);
  const adminKitchenController = new AdminKitchenController(listKitchenQueue);

  const listUnpaidOrders = new ListUnpaidOrders(orderQueryRepo);
  const settleCashPayment = new SettleCashPayment(orderRepo, paymentRepo, applyPaymentSuccess);
  const adminCashierController = new AdminCashierController(listUnpaidOrders, settleCashPayment);

  // ===== Admin auth =====
  const adminUserRepo = new MySQLAdminUserRepository();
  const staffUserRepo = new MySQLStaffUserRepository();
  const auditRepo = new MySQLAuditLogRepository();
  const adminLogin = new AdminLogin(adminUserRepo, staffUserRepo);
  const adminAuthController = new AdminAuthController(adminLogin, auditRepo);

  // ===== Staff directory (RBAC + audit) =====
  const listStaffUsers = new ListStaffUsers(staffUserRepo);
  const createStaffUser = new CreateStaffUser(staffUserRepo);
  const updateStaffRole = new UpdateStaffRole(staffUserRepo);
  const updateStaffStatus = new UpdateStaffStatus(staffUserRepo);
  const resetStaffPassword = new ResetStaffPassword(staffUserRepo);
  const adminStaffController = new AdminStaffController(
    listStaffUsers,
    createStaffUser,
    updateStaffRole,
    updateStaffStatus,
    resetStaffPassword,
    auditRepo,
  );

  // ===== Reservations =====
  const getReservationAvailability = new GetReservationAvailability(reservationRepo);

  const createReservation = new CreateReservation(
    reservationRepo,
    {
      maxDays: env.RESERVATION_MAX_DAYS,
      pendingMinutes: env.RESERVATION_PENDING_MINUTES,
    },
    eventBus,
  );

  const getReservation = new GetReservation(reservationRepo);

  // FIX: CancelReservation cần tableRepo (đừng truyền eventBus vào chỗ tableRepo)
  const cancelReservation = new CancelReservation(reservationRepo, tableRepo, eventBus);

  const reservationController = new ReservationController(
    getReservationAvailability,
    createReservation,
    getReservation,
    cancelReservation,
  );

  const listReservations = new ListReservations(reservationRepo);

  // FIX: ConfirmReservation cần tableRepo + lockAheadMinutes + eventBus
  const confirmReservation = new ConfirmReservation(
    reservationRepo,
    tableRepo,
    env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
    eventBus,
  );

  const checkInReservation = new CheckInReservation(
    reservationRepo,
    tableRepo,
    sessionRepo,
    {
      earlyMinutes: env.RESERVATION_CHECKIN_EARLY_MINUTES,
      lateMinutes: env.RESERVATION_CHECKIN_LATE_MINUTES,
    },
    eventBus,
  );

  const adminReservationController = new AdminReservationController(listReservations, confirmReservation, checkInReservation);

  // ===== Maintenance =====
  const maintenanceRepo = new MySQLMaintenanceRepository();
  const runMaintenanceJobs = new RunMaintenanceJobs(maintenanceRepo);
  const syncTableStatuses = new SyncTableStatuses(maintenanceRepo);
  const resetDevState = new ResetDevState(maintenanceRepo, {
    enabled: env.DEV_RESET_ENABLED,
    flushRedis: redis
      ? async () => {
        await redis.flushDb();
      }
      : null,
  });

  const setDevStock = new SetDevStock(maintenanceRepo, redis ?? null);

  const adminMaintenanceController = new AdminMaintenanceController(
    runMaintenanceJobs,
    syncTableStatuses,
    resetDevState,
    setDevStock,
    {
      lockAheadMinutes: env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
      noShowGraceMinutes: env.RESERVATION_CHECKIN_LATE_MINUTES,
      sessionStaleMinutes: env.MAINTENANCE_SESSION_STALE_MINUTES,
    },
  );

  // ===== Inventory operations (M2) =====
  const inventoryRepo = new MySQLInventoryRepository();
  const listBranchStock = new ListBranchStock(inventoryRepo);

  const adjustBranchStock = new AdjustBranchStock(inventoryRepo, {
    redis: redis ?? null,
    stockHoldsEnabled: Boolean(redis && env.REDIS_STOCK_HOLDS_ENABLED),
    menuCacheEnabled: Boolean(redis && env.MENU_CACHE_ENABLED),
    menuVersionKey: "menu:ver",
  });

  const listActiveHolds = redis ? new ListActiveHolds(redis) : null;
  const getStockDriftMetrics = redis ? new GetStockDriftMetrics(redis) : null;
  const triggerStockRehydrate = redis ? new TriggerStockRehydrate(redis) : null;
  const bumpMenuVersion = redis ? new BumpMenuVersion(redis) : null;

  const adminInventoryController = new AdminInventoryController(
    listBranchStock,
    adjustBranchStock,
    listActiveHolds,
    getStockDriftMetrics,
    triggerStockRehydrate,
    bumpMenuVersion,
    auditRepo,
  );

  // ===== Menu =====
  const getMenuCategories = new GetMenuCategories(menuCatalogRepo);
  const listMenuItems = new ListMenuItems(menuCatalogRepo);
  const getMenuItemDetail = new GetMenuItemDetail(menuCatalogRepo);
  const getComboDetail = new GetComboDetail(menuCatalogRepo);
  const getMeatProfile = new GetMeatProfile(menuCatalogRepo);

  const menuController = new MenuController(
    getMenuCategories,
    listMenuItems,
    getMenuItemDetail,
    getComboDetail,
    getMeatProfile,
  );

  // ===== Client OTP auth =====
  const clientRepo = new MySQLClientRepository();
  const otpRepo = new MySQLOtpRepository();
  const refreshRepo = new MySQLClientRefreshTokenRepository();

  const requestOtp = new RequestClientOtp(clientRepo, otpRepo, {
    otpHashSecret: env.OTP_HASH_SECRET,
    otpTtlSeconds: env.OTP_TTL_SECONDS,
    maxAttempts: 5,
    devEchoEnabled: env.DEV_OTP_ECHO_ENABLED,
    devFixedCode: env.DEV_OTP_FIXED_CODE,
  });

  const verifyOtp = new VerifyClientOtp(clientRepo, otpRepo, refreshRepo, {
    otpHashSecret: env.OTP_HASH_SECRET,
    accessTokenSecret: env.CLIENT_ACCESS_TOKEN_SECRET,
    accessTokenTtlMinutes: env.CLIENT_ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenSecret: env.CLIENT_REFRESH_TOKEN_SECRET,
    refreshTokenTtlDays: env.CLIENT_REFRESH_TOKEN_TTL_DAYS,
    refreshHashSecret: env.CLIENT_REFRESH_HASH_SECRET,
  });

  const rotateRefresh = new RotateClientRefreshToken(refreshRepo, {
    accessTokenSecret: env.CLIENT_ACCESS_TOKEN_SECRET,
    accessTokenTtlMinutes: env.CLIENT_ACCESS_TOKEN_TTL_MINUTES,
    refreshTokenSecret: env.CLIENT_REFRESH_TOKEN_SECRET,
    refreshTokenTtlDays: env.CLIENT_REFRESH_TOKEN_TTL_DAYS,
    refreshHashSecret: env.CLIENT_REFRESH_HASH_SECRET,
  });

  const logoutClient = new LogoutClient(refreshRepo, {
    refreshTokenSecret: env.CLIENT_REFRESH_TOKEN_SECRET,
  });

  const clientAuthController = new ClientAuthController(requestOtp, verifyOtp, rotateRefresh, logoutClient);

  // ===== Realtime audit (Phase 2) =====
  // Enabled via env.REALTIME_ADMIN_AUDIT_ENABLED. When disabled, controller returns empty list.
  const realtimeAuditRepo = env.REALTIME_ADMIN_AUDIT_ENABLED
    ? new MySQLRealtimeAdminAuditRepository()
    : {
      appendAdminEvent: async () => undefined,
      listAdminEvents: async () => [],
    };

  const listAdminRealtimeAudit = new ListAdminRealtimeAuditEvents(realtimeAuditRepo);
  const replayAdminRealtimeAudit = new ReplayAdminRealtimeAuditEvents(realtimeAuditRepo);
  const adminRealtimeController = new AdminRealtimeController(listAdminRealtimeAudit, replayAdminRealtimeAudit);

  // ===== Observability (Phase 3) =====
  const adminObservabilityController = new AdminObservabilityController();

  return {
    tableController,
    tableSessionController,
    cartController,
    orderController,
    adminOrderController,
    paymentController,
    adminPaymentController,
    adminAuthController,
    adminStaffController,
    adminInventoryController,
    adminOpsController,
    adminKitchenController,
    adminCashierController,
    reservationController,
    adminReservationController,
    adminMaintenanceController,
    adminObservabilityController,
    adminRealtimeController,
    realtimeSnapshotController,
    menuController,
    clientAuthController,
  };
}
