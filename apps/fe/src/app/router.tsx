import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import { RequireAuth } from "../shared/auth/guards";
import { RequireAdmin } from "../shared/auth/RequireAdmin";
import { RequireCustomerSession } from "../shared/customer/session/guards";

import { InternalLayout } from "../layouts/internal/InternalLayout";
import { InternalShellLayout } from "../layouts/internal/InternalShellLayout";

const AppEntryPage = lazy(async () => ({
  default: (await import("../features/entry/pages/AppEntryPage")).AppEntryPage,
}));

const CustomerMenuPage = lazy(async () => ({
  default: (await import("../features/customer/menu/pages/CustomerMenuPage")).CustomerMenuPage,
}));

const CustomerQrPage = lazy(async () => ({
  default: (await import("../features/customer/qr/pages/CustomerQrPage")).CustomerQrPage,
}));

const CustomerSessionBootstrapPage = lazy(async () => ({
  default: (await import("../features/customer/session/pages/CustomerSessionBootstrapPage"))
    .CustomerSessionBootstrapPage,
}));

const CustomerCartPage = lazy(async () => ({
  default: (await import("../features/customer/cart/pages/CustomerCartPage")).CustomerCartPage,
}));

const CustomerCheckoutPage = lazy(async () => ({
  default: (await import("../features/customer/order/pages/CustomerCheckoutPage"))
    .CustomerCheckoutPage,
}));

const CustomerOrderStatusPage = lazy(async () => ({
  default: (await import("../features/customer/order/pages/CustomerOrderStatusPage"))
    .CustomerOrderStatusPage,
}));

const CustomerPaymentPage = lazy(async () => ({
  default: (await import("../features/customer/payment/pages/CustomerPaymentPage"))
    .CustomerPaymentPage,
}));

const CustomerPaymentReturnPage = lazy(async () => ({
  default: (await import("../features/customer/payment/pages/CustomerPaymentReturnPage"))
    .CustomerPaymentReturnPage,
}));

const InternalLoginPage = lazy(async () => ({
  default: (await import("../features/internal/auth/pages/InternalLoginPage")).InternalLoginPage,
}));

const InternalLogoutPage = lazy(async () => ({
  default: (await import("../features/internal/auth/pages/InternalLogoutPage")).InternalLogoutPage,
}));

const InternalIndexRedirect = lazy(async () => ({
  default: (await import("../features/internal/auth/pages/InternalIndexRedirect"))
    .InternalIndexRedirect,
}));

const InternalTablesPage = lazy(async () => ({
  default: (await import("../features/internal/ops/tables/pages/InternalTablesPage"))
    .InternalTablesPage,
}));

const InternalPosMenuPage = lazy(async () => ({
  default: (await import("../features/internal/pos/pages/InternalPosMenuPage"))
    .InternalPosMenuPage,
}));

const InternalKitchenPage = lazy(async () => ({
  default: (await import("../features/internal/kitchen/pages/InternalKitchenPage"))
    .InternalKitchenPage,
}));

const InternalCashierPage = lazy(async () => ({
  default: (await import("../features/internal/cashier/pages/InternalCashierPage"))
    .InternalCashierPage,
}));

const InternalAdminPage = lazy(async () => ({
  default: (await import("../features/internal/admin/pages/InternalAdminPage"))
    .InternalAdminPage,
}));

const InternalDashboardPage = lazy(async () => ({
  default: (await import("../features/internal/dashboard/pages/InternalDashboardPage"))
    .InternalDashboardPage,
}));

const InternalInventoryStockPage = lazy(async () => ({
  default: (await import("../features/internal/inventory/pages/InternalInventoryStockPage"))
    .InternalInventoryStockPage,
}));

const InternalInventoryHoldsPage = lazy(async () => ({
  default: (await import("../features/internal/inventory/pages/InternalInventoryHoldsPage"))
    .InternalInventoryHoldsPage,
}));

const InternalInventoryAdjustmentsPage = lazy(async () => ({
  default: (
    await import("../features/internal/inventory/pages/InternalInventoryAdjustmentsPage")
  ).InternalInventoryAdjustmentsPage,
}));

function RouteLoadingPage() {
  return (
    <main className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        Đang tải trang…
      </div>
    </main>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteLoadingPage />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: withSuspense(<AppEntryPage />),
  },

  {
    path: "c/menu",
    element: (
      <RequireCustomerSession>
        {withSuspense(<CustomerMenuPage />)}
      </RequireCustomerSession>
    ),
  },
  {
    path: "c/qr",
    element: withSuspense(<CustomerQrPage />),
  },
  {
    path: "c/session/:sessionKey",
    element: withSuspense(<CustomerSessionBootstrapPage />),
  },
  {
    path: "c/cart",
    element: (
      <RequireCustomerSession>
        {withSuspense(<CustomerCartPage />)}
      </RequireCustomerSession>
    ),
  },
  {
    path: "c/checkout",
    element: (
      <RequireCustomerSession>
        {withSuspense(<CustomerCheckoutPage />)}
      </RequireCustomerSession>
    ),
  },
  {
    path: "c/payment/return",
    element: withSuspense(<CustomerPaymentReturnPage />),
  },
  {
    path: "c/payment/:orderCode",
    element: withSuspense(<CustomerPaymentPage />),
  },
  {
    path: "c/orders/:orderCode",
    element: (
      <RequireCustomerSession>
        {withSuspense(<CustomerOrderStatusPage />)}
      </RequireCustomerSession>
    ),
  },

  { path: "customer/menu", element: <Navigate to="/c/menu" replace /> },
  { path: "internal", element: <Navigate to="/i/login" replace /> },

  {
    path: "i/login",
    element: withSuspense(<InternalLoginPage />),
  },
  {
    path: "i/logout",
    element: withSuspense(<InternalLogoutPage />),
  },

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
      { path: "dashboard", element: withSuspense(<InternalDashboardPage />) },
      { path: "tables", element: withSuspense(<InternalTablesPage />) },
      { path: "kitchen", element: withSuspense(<InternalKitchenPage />) },
      { path: "cashier", element: withSuspense(<InternalCashierPage />) },
      { path: "staff", element: withSuspense(<InternalAdminPage />) },
      {
        path: "inventory",
        children: [
          { index: true, element: <Navigate to="stock" replace /> },
          { path: "stock", element: withSuspense(<InternalInventoryStockPage />) },
          { path: "holds", element: withSuspense(<InternalInventoryHoldsPage />) },
          {
            path: "adjustments",
            element: withSuspense(<InternalInventoryAdjustmentsPage />),
          },
        ],
      },
    ],
  },

  {
    path: "i/:branchId",
    element: (
      <RequireAuth>
        <InternalShellLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(<InternalIndexRedirect />) },
      {
        path: "tables",
        element: withSuspense(<InternalTablesPage />),
        handle: { title: "Tables" },
      },
      {
        path: "kitchen",
        element: withSuspense(<InternalKitchenPage />),
        handle: { title: "Kitchen" },
      },
      {
        path: "cashier",
        element: withSuspense(<InternalCashierPage />),
        handle: { title: "Cashier" },
      },
      {
        path: "inventory",
        children: [
          { index: true, element: <Navigate to="stock" replace /> },
          {
            path: "stock",
            element: withSuspense(<InternalInventoryStockPage />),
            handle: { title: "Inventory — Stock" },
          },
          {
            path: "holds",
            element: withSuspense(<InternalInventoryHoldsPage />),
            handle: { title: "Inventory — Holds" },
          },
          {
            path: "adjustments",
            element: withSuspense(<InternalInventoryAdjustmentsPage />),
            handle: { title: "Inventory — Lịch sử" },
          },
        ],
      },
    ],
  },

  {
    path: "i/pos/tables",
    element: (
      <RequireAuth>
        {withSuspense(<InternalTablesPage />)}
      </RequireAuth>
    ),
  },
  {
    path: "i/pos/menu",
    element: (
      <RequireAuth>
        {withSuspense(<InternalPosMenuPage />)}
      </RequireAuth>
    ),
  },

  {
    path: "i/admin/system",
    element: <Navigate to="/i/login?reason=missing_branch" replace />,
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);