import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from "react-router";
import { useMe } from "./lib/queries";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { Home } from "./pages/Home";
import { Shop } from "./pages/Shop";
import { ProductPage } from "./pages/ProductPage";
import { Checkout } from "./pages/Checkout";
import { OrderPage } from "./pages/OrderPage";
import { Account } from "./pages/Account";
import { AuthPage } from "./pages/AuthPage";
import { NotFound } from "./pages/NotFound";

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("./pages/admin/AdminProductEdit"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

function Private({ admin = false }: { admin?: boolean }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <Spinner />;
  if (!me.data) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && me.data.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: "/", element: <Home /> },
          { path: "/shop", element: <Shop /> },
          { path: "/p/:slug", element: <ProductPage /> },
          { path: "/login", element: <AuthPage mode="login" /> },
          { path: "/register", element: <AuthPage mode="register" /> },
          {
            element: <Private />,
            children: [
              { path: "/checkout", element: <Checkout /> },
              { path: "/account", element: <Account /> },
              { path: "/orders/:id", element: <OrderPage /> },
            ],
          },
          { path: "*", element: <NotFound /> },
        ],
      },
      {
        element: <Private admin />,
        children: [
          {
            path: "/admin",
            element: (
              <Suspense fallback={<Spinner />}>
                <AdminLayout />
              </Suspense>
            ),
            children: [
              { index: true, element: <AdminOverview /> },
              { path: "products", element: <AdminProducts /> },
              { path: "products/new", element: <AdminProductEdit /> },
              { path: "products/:id", element: <AdminProductEdit /> },
              { path: "orders", element: <AdminOrders /> },
            ],
          },
        ],
      },
    ],
  },
]);
