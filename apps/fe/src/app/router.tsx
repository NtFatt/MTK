import { createBrowserRouter, Navigate } from 'react-router-dom';

import { CustomerMenuPage } from '../features/customer/menu/pages/CustomerMenuPage';
import { CustomerQrPage } from '../features/customer/qr/pages/CustomerQrPage';
import { CustomerSessionBootstrapPage } from '../features/customer/session/pages/CustomerSessionBootstrapPage';
import { CustomerCartPage } from '../features/customer/cart/pages/CustomerCartPage';
import { CustomerCheckoutPage } from '../features/customer/order/pages/CustomerCheckoutPage';
import { CustomerOrderStatusPage } from '../features/customer/order/pages/CustomerOrderStatusPage';

import { RequireAuth } from '../shared/auth/guards';
import { RequireCustomerSession } from '../shared/customer/session/guards';
import { AppEntryPage } from "../features/entry/pages/AppEntryPage";
import { InternalLoginPage } from '../features/internal/auth/pages/InternalLoginPage';
import { InternalLogoutPage } from '../features/internal/auth/pages/InternalLogoutPage';
import { InternalTablesPage } from '../features/internal/ops/tables/pages/InternalTablesPage';
import { InternalPosMenuPage } from '../features/internal/pos/pages/InternalPosMenuPage';
import { InternalKitchenPage } from "../features/internal/kitchen/pages/InternalKitchenPage";
import { InternalAdminPage } from "../features/internal/admin/pages/InternalAdminPage";
import { InternalCashierPage } from "../features/internal/cashier/pages/InternalCashierPage";
import { InternalIndexRedirect } from "../features/internal/auth/pages/InternalIndexRedirect";
export const router = createBrowserRouter([
  // ✅ App entry: vào menu trước
{ path: "/", element: <AppEntryPage /> },
{
  path: "i/:branchId",
  element: (
    <RequireAuth>
      <InternalIndexRedirect />
    </RequireAuth>
  ),
},
{
  path: "i/:branchId/admin",
  element: (
    <RequireAuth>
      <InternalAdminPage />
    </RequireAuth>
  ),
},
  // ✅ Customer public routes
  {
    path: "c/menu",
    element: (
      <RequireCustomerSession>
        <CustomerMenuPage />
      </RequireCustomerSession>
    ),
  }, { path: 'c/qr', element: <CustomerQrPage /> },
  { path: 'c/session/:sessionKey', element: <CustomerSessionBootstrapPage /> },

  // ✅ Customer protected routes (cần session)
  {
    path: 'c/cart',
    element: (
      <RequireCustomerSession>
        <CustomerCartPage />
      </RequireCustomerSession>
    ),
  },
  {
    path: 'c/checkout',
    element: (
      <RequireCustomerSession>
        <CustomerCheckoutPage />
      </RequireCustomerSession>
    ),
  },
  {
    path: 'c/orders/:orderCode',
    element: (
      <RequireCustomerSession>
        <CustomerOrderStatusPage />
      </RequireCustomerSession>
    ),
  },

  // ✅ Back-compat redirects
  { path: 'customer/menu', element: <Navigate to="/c/menu" replace /> },
  { path: 'internal', element: <Navigate to="/i/login" replace /> },

  // ✅ Internal routes
  { path: 'i/login', element: <InternalLoginPage /> },
  { path: 'i/logout', element: <InternalLogoutPage /> },

  {
    path: "i/:branchId/kitchen",
    element: (
      <RequireAuth>
        <InternalKitchenPage />
      </RequireAuth>
    ),
  },
  {
    path: 'i/:branchId/tables',
    element: (
      <RequireAuth>
        <InternalTablesPage />
      </RequireAuth>
    ),
  },
  {
  path: "i/:branchId/cashier",
  element: (
    <RequireAuth>
      <InternalCashierPage />
    </RequireAuth>
  ),
},
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
  {
    path: 'i/admin/system',
    element: <Navigate to="/i/login?reason=missing_branch" replace />,
  },

  // ✅ Catch-all (đỡ 404 trắng)
{ path: "*", element: <Navigate to="/" replace /> },

]);
