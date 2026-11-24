import { Link, NavLink, Outlet } from "react-router";
import { ArrowLeft, ArrowRight, LayoutDashboard, LogOut, Package, Shirt } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useMe, useSession } from "../../lib/queries";
import { DemoBanner, LangToggle } from "../../components/Layout";
import { Logo } from "../../components/ui";

export default function AdminLayout() {
  const { t, dir } = useI18n();
  const me = useMe();
  const session = useSession();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const links = [
    { to: "/admin", label: t.admin.overview, icon: LayoutDashboard, end: true },
    { to: "/admin/products", label: t.admin.products, icon: Shirt, end: false },
    { to: "/admin/orders", label: t.admin.orders, icon: Package, end: false },
  ];
  const link = ({ isActive }: { isActive: boolean }) => `ring-focus flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-ink text-linen" : "text-soft hover:bg-black/[0.05] hover:text-ink"}`;
  return (
    <div className="min-h-dvh">
      <div className="lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-card/60 p-4 lg:flex">
          <Link to="/admin" className="ring-focus rounded-xl px-2 py-1">
            <Logo />
          </Link>
          <nav className="mt-8 flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}>
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto space-y-1 border-t border-line pt-4">
            <div className="truncate px-3 pb-1 text-xs text-faint">{me.data?.isDemo ? me.data.name : me.data?.email}</div>
            <Link to="/" className="btn-quiet w-full justify-start">
              <Back className="size-4" />
              {t.admin.store}
            </Link>
            <LangToggle />
            <button type="button" onClick={session.logout} className="btn-quiet w-full justify-start">
              <LogOut className="size-4 rtl:-scale-x-100" />
              {me.data?.isDemo ? t.nav.endDemo : t.nav.logout}
            </button>
          </div>
        </aside>
        <div className="min-w-0">
          <DemoBanner />
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-linen/90 px-4 backdrop-blur lg:hidden">
            <Link to="/admin">
              <Logo />
            </Link>
            <div className="ms-auto flex items-center">
              <LangToggle />
              <Link to="/" className="btn-quiet p-2.5" aria-label={t.admin.store}>
                <Back className="size-4" />
              </Link>
            </div>
          </header>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-4 py-2 lg:hidden">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `${link({ isActive })} shrink-0 py-2`}>
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
