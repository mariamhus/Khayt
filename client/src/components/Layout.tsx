import { useEffect, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { LayoutDashboard, Loader2, LogOut, Package, ShoppingBag, Sparkles, User } from "lucide-react";
import { setCartOpen, SHIPPING, totals, useCart } from "../lib/cart";
import { useI18n } from "../lib/i18n";
import { useMe, useSession } from "../lib/queries";
import { CartDrawer } from "./CartDrawer";
import { Logo } from "./ui";

export function LangToggle() {
  const { t, lang, setLang } = useI18n();
  return (
    <button type="button" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="btn-quiet px-2.5 text-[13px]" lang={lang === "en" ? "ar" : "en"}>
      {t.nav.language}
    </button>
  );
}

export function Header() {
  const { t } = useI18n();
  const me = useMe();
  const session = useSession();
  const cart = useCart();
  const count = totals(cart, SHIPPING).count;
  const user = me.data;
  const link = ({ isActive }: { isActive: boolean }) => `ring-focus rounded-full px-3 py-2 text-sm font-medium transition ${isActive ? "text-ink" : "text-soft hover:text-ink"}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-linen/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="ring-focus rounded-xl" aria-label={t.brand}>
          <Logo />
        </Link>
        <nav className="ms-4 hidden items-center md:flex">
          <NavLink to="/shop" className={link}>
            {t.nav.shop}
          </NavLink>
          {(["dresses", "tops", "outerwear"] as const).map((category) => (
            <Link key={category} to={`/shop?category=${category}`} className="ring-focus rounded-full px-3 py-2 text-sm font-medium text-soft transition hover:text-ink">
              {t.category[category]}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-0.5">
          <LangToggle />
          {user ? (
            <>
              {user.role === "admin" && (
                <Link to="/admin" className="btn-quiet px-2.5" title={t.nav.admin}>
                  <LayoutDashboard className="size-4" />
                  <span className="hidden lg:inline">{t.nav.admin}</span>
                </Link>
              )}
              <Link to="/account" className="btn-quiet px-2.5" title={t.nav.account}>
                <Package className="size-4" />
                <span className="hidden lg:inline">{t.nav.account}</span>
              </Link>
              <button type="button" onClick={session.logout} className="btn-quiet px-2.5" title={user.isDemo ? t.nav.endDemo : t.nav.logout}>
                <LogOut className="size-4 rtl:-scale-x-100" />
                <span className="hidden lg:inline">{user.isDemo ? t.nav.endDemo : t.nav.logout}</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={session.demo} disabled={session.busy} className="btn-quiet hidden px-2.5 text-clay sm:inline-flex">
                {session.busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {t.nav.demo}
              </button>
              <Link to="/login" className="btn-quiet px-2.5" title={t.nav.login}>
                <User className="size-4" />
                <span className="hidden sm:inline">{t.nav.login}</span>
              </Link>
            </>
          )}
          <button type="button" onClick={() => setCartOpen(true)} className="btn-dark ms-1 px-3.5" aria-label={`${t.nav.cart} (${count})`}>
            <ShoppingBag className="size-4" />
            <span className="num">{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function DemoBanner() {
  const { t } = useI18n();
  const me = useMe();
  if (!me.data?.isDemo) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-gold/20 bg-gold-soft px-4 py-2 text-center text-xs font-medium text-gold">
      <span className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 shrink-0" />
        {t.demo.banner}
      </span>
      <Link to="/admin" className="font-bold underline underline-offset-2">
        {t.demo.open}
      </Link>
    </div>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          {t.brand} · {t.tagline}
        </span>
        <span>
          {t.footer.demo} {t.footer.by}{" "}
          <a href="https://www.mariam-hussein.website" className="ring-focus rounded text-soft underline-offset-4 hover:text-clay hover:underline">
            Mariam Hussein
          </a>
        </span>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  useEffect(() => setCartOpen(false), [location.pathname]);
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <Header />
      <main className="flex-1">{children ?? <Outlet />}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
