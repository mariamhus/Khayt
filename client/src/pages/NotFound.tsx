import { Link } from "react-router";
import { useI18n } from "../lib/i18n";

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center px-4 py-28 text-center">
      <svg viewBox="0 0 200 60" className="w-48" aria-hidden>
        <path d="M10 40c30-30 50-30 70 0s50 20 70-10" fill="none" stroke="#b5573a" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 7" />
      </svg>
      <h1 className="display mt-4 text-4xl rtl:text-3xl">{t.notFound.title}</h1>
      <p className="mt-2 text-soft">{t.notFound.text}</p>
      <Link to="/shop" className="btn-dark mt-8">
        {t.notFound.home}
      </Link>
    </div>
  );
}
