import type { IEventBus } from "../../application/ports/events/IEventBus.js";
import type { ICartRepository } from "../../application/ports/repositories/ICartRepository.js";
import type { IOrderRepository } from "../../application/ports/repositories/IOrderRepository.js";
import type { IPaymentRepository } from "../../application/ports/repositories/IPaymentRepository.js";
import type { ITableRepository } from "../../application/ports/repositories/ITableRepository.js";
import type { ITableSessionRepository } from "../../application/ports/repositories/ITableSessionRepository.js";
import type { GetCartDetail } from "../../application/use-cases/cart/GetCartDetail.js";
import type { GetOrCreateCartForSession } from "../../application/use-cases/cart/GetOrCreateCartForSession.js";
import type { RemoveCartItem } from "../../application/use-cases/cart/RemoveCartItem.js";
import type { UpsertCartItem } from "../../application/use-cases/cart/UpsertCartItem.js";
import type { CreateOrderFromCart } from "../../application/use-cases/order/CreateOrderFromCart.js";
import type { ApplyPaymentSuccess } from "../../application/use-cases/payment/ApplyPaymentSuccess.js";
import type { CloseTableSession } from "../../application/use-cases/table/CloseTableSession.js";
import type { OpenTableSession } from "../../application/use-cases/table/OpenTableSession.js";
import { ListOrders } from "../../application/use-cases/admin/order/ListOrders.js";
import { ChangeOrderStatus } from "../../application/use-cases/admin/ChangeOrderStatus.js";
import { ListBranchTables } from "../../application/use-cases/admin/ops/ListBranchTables.js";
import { ListKitchenQueue } from "../../application/use-cases/admin/kitchen/ListKitchenQueue.js";
import { ListUnpaidOrders } from "../../application/use-cases/admin/cashier/ListUnpaidOrders.js";
import { SettleCashPayment } from "../../application/use-cases/admin/cashier/SettleCashPayment.js";
import { GetBranchDashboardOverview } from "../../application/use-cases/admin/dashboard/GetBranchDashboardOverview.js";
import { GetCurrentShift } from "../../application/use-cases/admin/shifts/GetCurrentShift.js";
import { ListShiftHistory } from "../../application/use-cases/admin/shifts/ListShiftHistory.js";
import { OpenShift } from "../../application/use-cases/admin/shifts/OpenShift.js";
import { CloseShift } from "../../application/use-cases/admin/shifts/CloseShift.js";
import { CreateTable } from "../../application/use-cases/admin/ops/CreateTable.js";
import { UpdateTable } from "../../application/use-cases/admin/ops/UpdateTable.js";
import { DeleteTable } from "../../application/use-cases/admin/ops/DeleteTable.js";
import { ListAttendanceBoard } from "../../application/use-cases/admin/attendance/ListAttendanceBoard.js";
import { ListStaffAttendanceHistory } from "../../application/use-cases/admin/attendance/ListStaffAttendanceHistory.js";
import { ManualAttendanceCheckIn } from "../../application/use-cases/admin/attendance/ManualAttendanceCheckIn.js";
import { ManualAttendanceCheckOut } from "../../application/use-cases/admin/attendance/ManualAttendanceCheckOut.js";
import { MarkAttendanceAbsent } from "../../application/use-cases/admin/attendance/MarkAttendanceAbsent.js";
import { AutoCheckInOnShiftOpened } from "../../application/use-cases/admin/attendance/AutoCheckInOnShiftOpened.js";
import { AutoCheckOutOnShiftClosed } from "../../application/use-cases/admin/attendance/AutoCheckOutOnShiftClosed.js";
import { ListPayrollSummary } from "../../application/use-cases/admin/payroll/ListPayrollSummary.js";
import { GetPayrollStaffDetail } from "../../application/use-cases/admin/payroll/GetPayrollStaffDetail.js";
import { UpsertPayrollProfile } from "../../application/use-cases/admin/payroll/UpsertPayrollProfile.js";
import { CreatePayrollBonus } from "../../application/use-cases/admin/payroll/CreatePayrollBonus.js";
import { UpdatePayrollBonus } from "../../application/use-cases/admin/payroll/UpdatePayrollBonus.js";
import { VoidPayrollBonus } from "../../application/use-cases/admin/payroll/VoidPayrollBonus.js";
import { MySQLAdminOrderRepository } from "../../infrastructure/db/mysql/repositories/MySQLAdminOrderRepository.js";
import { MySQLAdminDashboardRepository } from "../../infrastructure/db/mysql/repositories/MySQLAdminDashboardRepository.js";
import { MySQLOpsTableOrderSummaryRepository } from "../../infrastructure/db/mysql/repositories/MySQLOpsTableOrderSummaryRepository.js";
import { MySQLOrderQueryRepository } from "../../infrastructure/db/mysql/repositories/MySQLOrderQueryRepository.js";
import { MySQLShiftRepository } from "../../infrastructure/db/mysql/repositories/MySQLShiftRepository.js";
import { MySQLAttendanceRepository } from "../../infrastructure/db/mysql/repositories/MySQLAttendanceRepository.js";
import { MySQLPayrollRepository } from "../../infrastructure/db/mysql/repositories/MySQLPayrollRepository.js";
import { MySQLAuditLogRepository } from "../../infrastructure/db/mysql/repositories/MySQLAuditLogRepository.js";
import { MySQLStaffUserRepository } from "../../infrastructure/db/mysql/repositories/MySQLStaffUserRepository.js";
import { AdminOrderController } from "../../interface-adapters/http/controllers/AdminOrderController.js";
import { AdminOpsController } from "../../interface-adapters/http/controllers/AdminOpsController.js";
import { AdminKitchenController } from "../../interface-adapters/http/controllers/AdminKitchenController.js";
import { AdminCashierController } from "../../interface-adapters/http/controllers/AdminCashierController.js";
import { AdminDashboardController } from "../../interface-adapters/http/controllers/AdminDashboardController.js";
import { AdminTableController } from "../../interface-adapters/http/controllers/AdminTableController.js";
import { AdminShiftController } from "../../interface-adapters/http/controllers/AdminShiftController.js";
import { AdminAttendanceController } from "../../interface-adapters/http/controllers/AdminAttendanceController.js";
import { AdminPayrollController } from "../../interface-adapters/http/controllers/AdminPayrollController.js";

type MenuProjectionSync = {
  syncItems(input: { branchId: string; itemIds: string[] }): Promise<unknown>;
} | null;

type BuildInternalAdminControllersDeps = {
  eventBus: IEventBus;
  menuProjectionSync: MenuProjectionSync;
  tableRepo: ITableRepository;
  sessionRepo: ITableSessionRepository;
  cartRepo: ICartRepository;
  orderRepo: IOrderRepository;
  paymentRepo: IPaymentRepository;
  openTableSession: OpenTableSession;
  closeTableSession: CloseTableSession;
  getOrCreateCart: GetOrCreateCartForSession;
  getCartDetail: GetCartDetail;
  upsertCartItem: UpsertCartItem;
  removeCartItem: RemoveCartItem;
  createOrderFromCart: CreateOrderFromCart;
  applyPaymentSuccess: ApplyPaymentSuccess;
};

export function buildInternalAdminControllers(deps: BuildInternalAdminControllersDeps) {
  const adminOrderRepo = new MySQLAdminOrderRepository();
  const changeOrderStatus = new ChangeOrderStatus(
    adminOrderRepo,
    deps.eventBus,
    {
      syncMenuProjection: deps.menuProjectionSync
        ? async ({ branchId, itemIds }) => {
            await deps.menuProjectionSync?.syncItems({ branchId, itemIds });
          }
        : null,
    },
  );

  const orderQueryRepo = new MySQLOrderQueryRepository();
  const adminDashboardRepo = new MySQLAdminDashboardRepository();
  const shiftRepo = new MySQLShiftRepository();
  const attendanceRepo = new MySQLAttendanceRepository();
  const payrollRepo = new MySQLPayrollRepository();
  const auditRepo = new MySQLAuditLogRepository();
  const staffUserRepo = new MySQLStaffUserRepository();
  const opsTableSummaryRepo = new MySQLOpsTableOrderSummaryRepository();

  const listOrders = new ListOrders(orderQueryRepo);
  const adminOrderController = new AdminOrderController(listOrders, changeOrderStatus);

  const listBranchTables = new ListBranchTables(deps.tableRepo, opsTableSummaryRepo);
  const adminOpsController = new AdminOpsController(
    listBranchTables,
    deps.tableRepo,
    deps.sessionRepo,
    deps.cartRepo,
    deps.orderRepo,
    deps.openTableSession,
    deps.closeTableSession,
    deps.getOrCreateCart,
    deps.getCartDetail,
    deps.upsertCartItem,
    deps.removeCartItem,
    deps.createOrderFromCart,
  );

  const listKitchenQueue = new ListKitchenQueue(orderQueryRepo);
  const adminKitchenController = new AdminKitchenController(listKitchenQueue);

  const listUnpaidOrders = new ListUnpaidOrders(orderQueryRepo);
  const settleCashPayment = new SettleCashPayment(
    deps.orderRepo,
    deps.paymentRepo,
    shiftRepo,
    deps.applyPaymentSuccess,
  );
  const adminCashierController = new AdminCashierController(listUnpaidOrders, settleCashPayment);

  const getBranchDashboardOverview = new GetBranchDashboardOverview(adminDashboardRepo);
  const adminDashboardController = new AdminDashboardController(getBranchDashboardOverview);

  const createTable = new CreateTable(deps.tableRepo, deps.eventBus);
  const updateTable = new UpdateTable(deps.tableRepo, deps.eventBus);
  const deleteTable = new DeleteTable(deps.tableRepo, deps.sessionRepo, deps.orderRepo, deps.eventBus);
  const adminTableController = new AdminTableController(createTable, updateTable, deleteTable);

  const getCurrentShift = new GetCurrentShift(shiftRepo);
  const listShiftHistory = new ListShiftHistory(shiftRepo);
  const openShift = new OpenShift(shiftRepo, deps.eventBus);
  const closeShift = new CloseShift(shiftRepo, deps.eventBus);
  const adminShiftController = new AdminShiftController(
    getCurrentShift,
    listShiftHistory,
    openShift,
    closeShift,
    auditRepo,
  );

  const listAttendanceBoard = new ListAttendanceBoard(attendanceRepo, staffUserRepo);
  const listStaffAttendanceHistory = new ListStaffAttendanceHistory(attendanceRepo, staffUserRepo);
  const manualAttendanceCheckIn = new ManualAttendanceCheckIn(attendanceRepo, staffUserRepo, deps.eventBus);
  const manualAttendanceCheckOut = new ManualAttendanceCheckOut(attendanceRepo, deps.eventBus);
  const markAttendanceAbsent = new MarkAttendanceAbsent(attendanceRepo, staffUserRepo, deps.eventBus);
  const adminAttendanceController = new AdminAttendanceController(
    listAttendanceBoard,
    listStaffAttendanceHistory,
    manualAttendanceCheckIn,
    manualAttendanceCheckOut,
    markAttendanceAbsent,
    auditRepo,
  );

  const autoCheckIn = new AutoCheckInOnShiftOpened(attendanceRepo, deps.eventBus);
  const autoCheckOut = new AutoCheckOutOnShiftClosed(attendanceRepo, deps.eventBus);
  deps.eventBus.subscribe(autoCheckIn.handler);
  deps.eventBus.subscribe(autoCheckOut.handler);

  const listPayrollSummary = new ListPayrollSummary(payrollRepo);
  const getPayrollStaffDetail = new GetPayrollStaffDetail(payrollRepo);
  const upsertPayrollProfile = new UpsertPayrollProfile(payrollRepo, staffUserRepo);
  const createPayrollBonus = new CreatePayrollBonus(payrollRepo, staffUserRepo);
  const updatePayrollBonus = new UpdatePayrollBonus(payrollRepo);
  const voidPayrollBonus = new VoidPayrollBonus(payrollRepo);
  const adminPayrollController = new AdminPayrollController(
    listPayrollSummary,
    getPayrollStaffDetail,
    upsertPayrollProfile,
    createPayrollBonus,
    updatePayrollBonus,
    voidPayrollBonus,
    auditRepo,
  );

  return {
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
  };
}
