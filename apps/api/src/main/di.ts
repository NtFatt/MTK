import { env } from "../infrastructure/config/env.js";
import type { RedisClient } from "../infrastructure/redis/redisClient.js";
import { MySQLOpsTableOrderSummaryRepository } from "../infrastructure/db/mysql/repositories/MySQLOpsTableOrderSummaryRepository.js";

// ===== Services =====
import { OrderCodeGenerator } from "../infrastructure/services/OrderCodeGenerator.js";
import { MySQLOrderCheckoutService } from "../infrastructure/db/mysql/services/MySQLOrderCheckoutService.js";
import { MySQLMenuItemStockRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuItemStockRepository.js";
import { NoopStockHoldService } from "../application/ports/services/NoopStockHoldService.js";
import { RedisStockHoldService } from "../infrastructure/redis/stock/RedisStockHoldService.js";
import { RedisMenuStockProjectionSync } from "../infrastructure/redis/stock/RedisMenuStockProjectionSync.js";

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
import { MySQLMenuCategoryRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuCategoryRepository.js";
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
import { MySQLInventoryIngredientRepository } from "../infrastructure/db/mysql/repositories/MySQLInventoryIngredientRepository.js";
import { MySQLMenuRecipeRepository } from "../infrastructure/db/mysql/repositories/MySQLMenuRecipeRepository.js";
import { MySQLVoucherRepository } from "../infrastructure/db/mysql/repositories/MySQLVoucherRepository.js";
import { MySQLAdminDashboardRepository } from "../infrastructure/db/mysql/repositories/MySQLAdminDashboardRepository.js";
import { MySQLShiftRepository } from "../infrastructure/db/mysql/repositories/MySQLShiftRepository.js";
import { MySQLAttendanceRepository } from "../infrastructure/db/mysql/repositories/MySQLAttendanceRepository.js";
import { MySQLPayrollRepository } from "../infrastructure/db/mysql/repositories/MySQLPayrollRepository.js";
// ===== Client auth repositories =====
import { MySQLClientRepository } from "../infrastructure/db/mysql/repositories/MySQLClientRepository.js";
import { MySQLOtpRepository } from "../infrastructure/db/mysql/repositories/MySQLOtpRepository.js";
import { MySQLClientRefreshTokenRepository } from "../infrastructure/db/mysql/repositories/MySQLClientRefreshTokenRepository.js";

// ===== Redis repositories =====
import { CachedMenuCatalogRepository } from "../infrastructure/redis/repositories/CachedMenuCatalogRepository.js";
import { RedisAvailableMenuCatalogRepository } from "../infrastructure/redis/repositories/RedisAvailableMenuCatalogRepository.js";
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
import { ApplyCartVoucher } from "../application/use-cases/cart/ApplyCartVoucher.js";
import { RemoveCartVoucher } from "../application/use-cases/cart/RemoveCartVoucher.js";

import { CreateOrderFromCart } from "../application/use-cases/order/CreateOrderFromCart.js";
import { ListPublicVouchers } from "../application/use-cases/voucher/ListPublicVouchers.js";

import { ChangeOrderStatus } from "../application/use-cases/admin/ChangeOrderStatus.js";
import { ListOrders } from "../application/use-cases/admin/order/ListOrders.js";

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

import { CreateMenuItem } from "../application/use-cases/admin/menu/CreateMenuItem.js";
import { UpdateMenuItem } from "../application/use-cases/admin/menu/UpdateMenuItem.js";
import { SetMenuItemActive } from "../application/use-cases/admin/menu/SetMenuItemActive.js";
import { ListAdminMenuCategories } from "../application/use-cases/admin/menu/ListAdminMenuCategories.js";
import { CreateMenuCategory } from "../application/use-cases/admin/menu/CreateMenuCategory.js";
import { UpdateMenuCategory } from "../application/use-cases/admin/menu/UpdateMenuCategory.js";
import { DeleteMenuCategory } from "../application/use-cases/admin/menu/DeleteMenuCategory.js";
import { AdminMenuController } from "../interface-adapters/http/controllers/AdminMenuController.js";
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
import { ListInventoryAdjustmentAudit } from "../application/use-cases/admin/inventory/ListInventoryAdjustmentAudit.js";

import { ListInventoryItems } from "../application/use-cases/admin/inventory/ListInventoryItems.js";
import { CreateInventoryItem } from "../application/use-cases/admin/inventory/CreateInventoryItem.js";
import { UpdateInventoryItem } from "../application/use-cases/admin/inventory/UpdateInventoryItem.js";
import { AdjustInventoryItem } from "../application/use-cases/admin/inventory/AdjustInventoryItem.js";
import { ListInventoryAlerts } from "../application/use-cases/admin/inventory/ListInventoryAlerts.js";
import { GetMenuItemRecipe } from "../application/use-cases/admin/menu/GetMenuItemRecipe.js";
import { SaveMenuItemRecipe } from "../application/use-cases/admin/menu/SaveMenuItemRecipe.js";
import { ListBranchVouchers } from "../application/use-cases/admin/voucher/ListBranchVouchers.js";
import { CreateVoucher } from "../application/use-cases/admin/voucher/CreateVoucher.js";
import { UpdateVoucher } from "../application/use-cases/admin/voucher/UpdateVoucher.js";
import { SetVoucherActive } from "../application/use-cases/admin/voucher/SetVoucherActive.js";
import { GetBranchDashboardOverview } from "../application/use-cases/admin/dashboard/GetBranchDashboardOverview.js";
import { GetCurrentShift } from "../application/use-cases/admin/shifts/GetCurrentShift.js";
import { ListShiftHistory } from "../application/use-cases/admin/shifts/ListShiftHistory.js";
import { OpenShift } from "../application/use-cases/admin/shifts/OpenShift.js";
import { CloseShift } from "../application/use-cases/admin/shifts/CloseShift.js";
import { CreateTable } from "../application/use-cases/admin/ops/CreateTable.js";
import { UpdateTable } from "../application/use-cases/admin/ops/UpdateTable.js";
import { DeleteTable } from "../application/use-cases/admin/ops/DeleteTable.js";

import { ListAttendanceBoard } from "../application/use-cases/admin/attendance/ListAttendanceBoard.js";
import { ListStaffAttendanceHistory } from "../application/use-cases/admin/attendance/ListStaffAttendanceHistory.js";
import { ManualAttendanceCheckIn } from "../application/use-cases/admin/attendance/ManualAttendanceCheckIn.js";
import { ManualAttendanceCheckOut } from "../application/use-cases/admin/attendance/ManualAttendanceCheckOut.js";
import { MarkAttendanceAbsent } from "../application/use-cases/admin/attendance/MarkAttendanceAbsent.js";
import { AutoCheckInOnShiftOpened } from "../application/use-cases/admin/attendance/AutoCheckInOnShiftOpened.js";
import { AutoCheckOutOnShiftClosed } from "../application/use-cases/admin/attendance/AutoCheckOutOnShiftClosed.js";
import { ListPayrollSummary } from "../application/use-cases/admin/payroll/ListPayrollSummary.js";
import { GetPayrollStaffDetail } from "../application/use-cases/admin/payroll/GetPayrollStaffDetail.js";
import { UpsertPayrollProfile } from "../application/use-cases/admin/payroll/UpsertPayrollProfile.js";
import { CreatePayrollBonus } from "../application/use-cases/admin/payroll/CreatePayrollBonus.js";
import { UpdatePayrollBonus } from "../application/use-cases/admin/payroll/UpdatePayrollBonus.js";
import { VoidPayrollBonus } from "../application/use-cases/admin/payroll/VoidPayrollBonus.js";
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
import { AdminDashboardController } from "../interface-adapters/http/controllers/AdminDashboardController.js";
import { AdminTableController } from "../interface-adapters/http/controllers/AdminTableController.js";
import { AdminShiftController } from "../interface-adapters/http/controllers/AdminShiftController.js";
import { AdminAttendanceController } from "../interface-adapters/http/controllers/AdminAttendanceController.js";
import { AdminPayrollController } from "../interface-adapters/http/controllers/AdminPayrollController.js";
import { ReservationController } from "../interface-adapters/http/controllers/ReservationController.js";
import { AdminReservationController } from "../interface-adapters/http/controllers/AdminReservationController.js";
import { AdminMaintenanceController } from "../interface-adapters/http/controllers/AdminMaintenanceController.js";
import { AdminRealtimeController } from "../interface-adapters/http/controllers/AdminRealtimeController.js";
import { AdminObservabilityController } from "../interface-adapters/http/controllers/AdminObservabilityController.js";
import { RealtimeSnapshotController } from "../interface-adapters/http/controllers/RealtimeSnapshotController.js";
import { MenuController } from "../interface-adapters/http/controllers/MenuController.js";
import { ClientAuthController } from "../interface-adapters/http/controllers/ClientAuthController.js";
import { VoucherController } from "../interface-adapters/http/controllers/VoucherController.js";
import { AdminVoucherController } from "../interface-adapters/http/controllers/AdminVoucherController.js";

// Realtime replay store (HTTP snapshot/resync uses Redis-backed store for consistency with sockets)
import { RedisRoomEventStore } from "../infrastructure/realtime/RoomEventStore.js";
import { buildInternalAdminControllers } from "./composition/buildInternalAdminControllers.js";

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
  const orderRepo = new MySQLOrderRepository();

  const getTables = new GetTables(tableRepo);
  const getTableByDirection = new GetTableByDirection(tableRepo);

  const openTableSession = new OpenTableSession(
    tableRepo,
    sessionRepo,
    orderRepo,
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
  const menuProjectionSync = redis
    ? new RedisMenuStockProjectionSync(redis, {
        stockHoldsEnabled: Boolean(env.REDIS_STOCK_HOLDS_ENABLED),
        menuCacheEnabled: Boolean(env.MENU_CACHE_ENABLED),
        menuVersionKey: "menu:ver",
      })
    : null;

  // ===== Menu catalog (cached optional) =====
  const menuCatalogBase = new MySQLMenuCatalogRepository();
  const menuCatalogCachedRepo = redis && env.MENU_CACHE_ENABLED
    ? new CachedMenuCatalogRepository(menuCatalogBase, redis, { ttlSeconds: env.MENU_CACHE_TTL_SECONDS })
    : menuCatalogBase;
  const menuCatalogRepo = redis && env.REDIS_STOCK_HOLDS_ENABLED
    ? new RedisAvailableMenuCatalogRepository(menuCatalogCachedRepo, redis)
    : menuCatalogCachedRepo;

  // ===== Cart =====
  const cartRepo = new MySQLCartRepository();
  const cartItemRepo = new MySQLCartItemRepository();
  const menuItemRepo = new MySQLMenuItemRepository();
  const menuCategoryRepo = new MySQLMenuCategoryRepository();
  const voucherRepo = new MySQLVoucherRepository();

  // CloseTableSession cần cartRepo/stockHold => khởi tạo ở đây (CHỈ 1 LẦN)
  const closeTableSession = new CloseTableSession(
    tableRepo,
    sessionRepo,
    orderRepo,
    reservationRepo,
    env.TABLE_STATUS_LOCK_AHEAD_MINUTES,
    eventBus,
    cartRepo,
    stockHold,
  );

  const tableSessionController = new TableSessionController(openTableSession, closeTableSession);

  const getOrCreateCart = new GetOrCreateCartForSession(sessionRepo, cartRepo);
  const getCartDetail = new GetCartDetail(cartRepo, cartItemRepo, orderRepo, voucherRepo);

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

  const applyCartVoucher = new ApplyCartVoucher(
    cartRepo,
    cartItemRepo,
    voucherRepo,
    sessionRepo,
    eventBus,
  );
  const removeCartVoucher = new RemoveCartVoucher(
    cartRepo,
    voucherRepo,
    sessionRepo,
    eventBus,
  );

  const cartController = new CartController(
    getOrCreateCart,
    getCartDetail,
    upsertCartItem,
    removeCartItem,
    applyCartVoucher,
    removeCartVoucher,
  );
  const listPublicVouchers = new ListPublicVouchers(cartRepo, cartItemRepo, voucherRepo);
  const voucherController = new VoucherController(listPublicVouchers);

  // ===== Orders =====
  const orderSnapshotRepo = new MySQLOrderSnapshotRepository();
  const orderCodeGen = new OrderCodeGenerator();
  const checkoutSvc = new MySQLOrderCheckoutService(stockRepo, voucherRepo);

  const createOrderFromCart = new CreateOrderFromCart(
    cartRepo,
    cartItemRepo,
    menuCatalogRepo,
    orderCodeGen,
    checkoutSvc,
    sessionRepo,
    stockHold,
    eventBus,
    {
      syncMenuProjection: menuProjectionSync
        ? async ({ branchId, itemIds }) => {
            await menuProjectionSync.syncItems({ branchId, itemIds });
          }
        : null,
    },
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
  const changeOrderStatus = new ChangeOrderStatus(
    adminOrderRepo,
    eventBus,
    {
      syncMenuProjection: menuProjectionSync
        ? async ({ branchId, itemIds }) => {
            await menuProjectionSync.syncItems({ branchId, itemIds });
          }
        : null,
    },
  );
  // ===== Payments =====
  const paymentRepo = new MySQLPaymentRepository();
  const vnpayLogRepo = new MySQLVNPayLogRepository();
  const vnpayGateway = new VNPayGateway();

  const applyPaymentSuccess = new ApplyPaymentSuccess(
    paymentRepo,
    orderRepo,
    eventBus,
    sessionRepo,
    closeTableSession,
  );
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
  const {
    shiftRepo,
    attendanceRepo,
    payrollRepo,
    auditRepo,
    staffUserRepo,
    adminOrderController,
    adminOpsController,
    adminKitchenController,
    adminCashierController,
    adminDashboardController,
    adminTableController,
    adminShiftController,
    adminAttendanceController,
    adminPayrollController,
  } = buildInternalAdminControllers({
    eventBus,
    menuProjectionSync,
    tableRepo,
    sessionRepo,
    cartRepo,
    orderRepo,
    paymentRepo,
    openTableSession,
    closeTableSession,
    getOrCreateCart,
    getCartDetail,
    upsertCartItem,
    removeCartItem,
    createOrderFromCart,
    applyPaymentSuccess,
  });

  // ===== Admin auth =====
  const adminUserRepo = new MySQLAdminUserRepository();
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
    orderRepo,
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
  const listBranchStock = new ListBranchStock(inventoryRepo, {
    redis: redis ?? null,
    stockHoldsEnabled: Boolean(redis && env.REDIS_STOCK_HOLDS_ENABLED),
  });

  const adjustBranchStock = new AdjustBranchStock(
    inventoryRepo,
    {
      redis: redis ?? null,
      stockHoldsEnabled: Boolean(redis && env.REDIS_STOCK_HOLDS_ENABLED),
      menuCacheEnabled: Boolean(redis && env.MENU_CACHE_ENABLED),
      menuVersionKey: "menu:ver",
    },
    eventBus,
  );
  const listActiveHolds = redis ? new ListActiveHolds(redis) : null;
  const getStockDriftMetrics = redis ? new GetStockDriftMetrics(redis) : null;
  const triggerStockRehydrate = redis ? new TriggerStockRehydrate(redis) : null;
  const bumpMenuVersion = redis ? new BumpMenuVersion(redis) : null;
  const listInventoryAdjustmentAudit = new ListInventoryAdjustmentAudit(auditRepo);

  const inventoryIngredientRepo = new MySQLInventoryIngredientRepository();
  const menuRecipeRepo = new MySQLMenuRecipeRepository();

  const listInventoryItems = new ListInventoryItems(inventoryIngredientRepo);
  const createInventoryItem = new CreateInventoryItem(inventoryIngredientRepo);
  const updateInventoryItem = new UpdateInventoryItem(inventoryIngredientRepo);
  const adjustInventoryItem = new AdjustInventoryItem(
    inventoryIngredientRepo,
    menuRecipeRepo,
    {
      bumpMenuVersion: bumpMenuVersion
        ? async () => {
          await bumpMenuVersion.execute();
        }
        : null,
      triggerStockRehydrate: triggerStockRehydrate
        ? async () => {
          await triggerStockRehydrate.execute();
        }
        : null,
    },
  );
  const listInventoryAlerts = new ListInventoryAlerts(inventoryIngredientRepo);

  const getMenuItemRecipe = new GetMenuItemRecipe(menuRecipeRepo);
  const saveMenuItemRecipe = new SaveMenuItemRecipe(
    menuRecipeRepo,
    {
      bumpMenuVersion: bumpMenuVersion
        ? async () => {
          await bumpMenuVersion.execute();
        }
        : null,
      triggerStockRehydrate: triggerStockRehydrate
        ? async () => {
          await triggerStockRehydrate.execute();
        }
        : null,
    },
  );

  const adminInventoryController = new AdminInventoryController(
    listBranchStock,
    adjustBranchStock,
    listActiveHolds,
    getStockDriftMetrics,
    triggerStockRehydrate,
    bumpMenuVersion,
    listInventoryAdjustmentAudit,

    listInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    adjustInventoryItem,
    listInventoryAlerts,
    getMenuItemRecipe,
    saveMenuItemRecipe,

    auditRepo,
  );

  const listBranchVouchers = new ListBranchVouchers(voucherRepo);
  const createVoucher = new CreateVoucher(voucherRepo);
  const updateVoucher = new UpdateVoucher(voucherRepo);
  const setVoucherActive = new SetVoucherActive(voucherRepo);
  const adminVoucherController = new AdminVoucherController(
    listBranchVouchers,
    createVoucher,
    updateVoucher,
    setVoucherActive,
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

  const createMenuItem = new CreateMenuItem(menuItemRepo);
  const updateMenuItem = new UpdateMenuItem(menuItemRepo);
  const setMenuItemActive = new SetMenuItemActive(menuItemRepo);
  const listAdminMenuCategories = new ListAdminMenuCategories(menuCategoryRepo);
  const createMenuCategory = new CreateMenuCategory(menuCategoryRepo);
  const updateMenuCategory = new UpdateMenuCategory(menuCategoryRepo);
  const deleteMenuCategory = new DeleteMenuCategory(menuCategoryRepo);

  const adminMenuController = new AdminMenuController(
    listAdminMenuCategories,
    listMenuItems,
    createMenuItem,
    updateMenuItem,
    setMenuItemActive,
    createMenuCategory,
    updateMenuCategory,
    deleteMenuCategory,
    auditRepo,
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
    adminDashboardController,
    adminTableController,
    adminShiftController,
    adminAttendanceController,
    adminPayrollController,
    reservationController,
    adminReservationController,
    adminMaintenanceController,
    adminObservabilityController,
    adminRealtimeController,
    realtimeSnapshotController,
    menuController,
    clientAuthController,
    adminMenuController,
    voucherController,
    adminVoucherController,
  };
}
