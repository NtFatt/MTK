import { createBrowserRouter, Navigate } from "react-router-dom";

import { CustomerMenuPage } from "../features/customer/menu/pages/CustomerMenuPage";
import { CustomerQrPage } from "../features/customer/qr/pages/CustomerQrPage";
import { CustomerSessionBootstrapPage } from "../features/customer/session/pages/CustomerSessionBootstrapPage";
import { CustomerCartPage } from "../features/customer/cart/pages/CustomerCartPage";
import { CustomerCheckoutPage } from "../features/customer/order/pages/CustomerCheckoutPage";
import { CustomerOrderStatusPage } from "../features/customer/order/pages/CustomerOrderStatusPage";

import { RequireAuth } from "../shared/auth/guards";
import { RequireAdmin } from "../shared/auth/RequireAdmin";
import { RequireCustomerSession } from "../shared/customer/session/guards";

import { AppEntryPage } from "../features/entry/pages/AppEntryPage";
import { InternalLoginPage } from "../features/internal/auth/pages/InternalLoginPage";
import { InternalLogoutPage } from "../features/internal/auth/pages/InternalLogoutPage";
import { InternalIndexRedirect } from "../features/internal/auth/pages/InternalIndexRedirect";

import { InternalTablesPage } from "../features/internal/ops/tables/pages/InternalTablesPage";
import { InternalPosMenuPage } from "../features/internal/pos/pages/InternalPosMenuPage";
import { InternalKitchenPage } from "../features/internal/kitchen/pages/InternalKitchenPage";
import { InternalCashierPage } from "../features/internal/cashier/pages/InternalCashierPage";

import { InternalAdminPage } from "../features/internal/admin/pages/InternalAdminPage";
import { InternalDashboardPage } from "../features/internal/dashboard/pages/InternalDashboardPage";
import { InternalInventoryStockPage } from "../features/internal/inventory/pages/InternalInventoryStockPage";
import { InternalInventoryHoldsPage } from "../features/internal/inventory/pages/InternalInventoryHoldsPage";
import { InternalInventoryAdjustmentsPage } from "../features/internal/inventory/pages/InternalInventoryAdjustmentsPage";

import { InternalLayout } from "../layouts/internal/InternalLayout"; // có sidebar
import { InternalShellLayout } from "../layouts/internal/InternalShellLayout"; // không sidebar



export const router = createBrowserRouter([
  // ✅ App entry
  { path: "/", element: <AppEntryPage /> },

  // ✅ Customer routes
  {
    path: "c/menu",
    element: (
      <RequireCustomerSession>
        <CustomerMenuPage />
      </RequireCustomerSession>
    ),
  },
  { path: "c/qr", element: <CustomerQrPage /> },
  { path: "c/session/:sessionKey", element: <CustomerSessionBootstrapPage /> },
  {
    path: "c/cart",
    element: (
      <RequireCustomerSession>
        <CustomerCartPage />
      </RequireCustomerSession>
    ),
  },
  {
    path: "c/checkout",
    element: (
      <RequireCustomerSession>
        <CustomerCheckoutPage />
      </RequireCustomerSession>
    ),
  },
  {
    path: "c/orders/:orderCode",
    element: (
      <RequireCustomerSession>
        <CustomerOrderStatusPage />
      </RequireCustomerSession>
    ),
  },

  // ✅ Back-compat redirects
  { path: "customer/menu", element: <Navigate to="/c/menu" replace /> },
  { path: "internal", element: <Navigate to="/i/login" replace /> },

  // ✅ Internal auth
  { path: "i/login", element: <InternalLoginPage /> },
  { path: "i/logout", element: <InternalLogoutPage /> },

  // ✅ ADMIN zone (CÓ SIDEBAR) — chỉ ADMIN vào được
  {
    path: "i/:branchId/admin",
    element: (
      <RequireAuth>
        <RequireAdmin>
          <InternalLayout />
        </RequireAdmin>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <InternalDashboardPage /> },
      { path: "tables", element: <InternalTablesPage /> },
      { path: "kitchen", element: <InternalKitchenPage /> },
      { path: "cashier", element: <InternalCashierPage /> },
      { path: "staff", element: <InternalAdminPage /> },
      {
        path: "inventory",
        children: [
          { index: true, element: <Navigate to="stock" replace /> },
          { path: "stock", element: <InternalInventoryStockPage /> },
          { path: "holds", element: <InternalInventoryHoldsPage /> },
          { path: "adjustments", element: <InternalInventoryAdjustmentsPage /> },
        ],
      },
    ],
  },

  // ✅ Internal zone (KHÔNG SIDEBAR)
  {
    path: "i/:branchId",
    element: (
      <RequireAuth>
        <InternalShellLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <InternalIndexRedirect /> },

      { path: "tables", element: <InternalTablesPage />, handle: { title: "Tables" } },
      { path: "kitchen", element: <InternalKitchenPage />, handle: { title: "Kitchen" } },
      { path: "cashier", element: <InternalCashierPage />, handle: { title: "Cashier" } },
      {
        path: "inventory",
        children: [
          { index: true, element: <Navigate to="stock" replace /> },
          { path: "stock", element: <InternalInventoryStockPage />, handle: { title: "Inventory — Stock" } },
          { path: "holds", element: <InternalInventoryHoldsPage />, handle: { title: "Inventory — Holds" } },
          { path: "adjustments", element: <InternalInventoryAdjustmentsPage />, handle: { title: "Inventory — Lịch sử" } },
        ],
      },
    ],
  },

  // ✅ POS routes (giữ nguyên nếu còn dùng)
  {
    path: "i/pos/tables",
    element: (
      <RequireAuth>
        <InternalTablesPage />
      </RequireAuth>
    ),
  },
  {
    path: "i/pos/menu",
    element: (
      <RequireAuth>
        <InternalPosMenuPage />
      </RequireAuth>
    ),
  },

  { path: "i/admin/system", element: <Navigate to="/i/login?reason=missing_branch" replace /> },

  // ✅ Catch-all
  { path: "*", element: <Navigate to="/" replace /> },
]);