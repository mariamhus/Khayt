import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { Loader2, Sparkles } from "lucide-react";
import { api, ApiError, type User } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useTitle } from "../lib/hooks";
import { useMe, useSession } from "../lib/queries";
import { Field } from "../components/ui";
import { GarmentArt } from "../components/GarmentArt";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const me = useMe();
  const session = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  useTitle(`${register ? t.auth.registerTitle : t.auth.loginTitle} · ${t.brand}`);
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (me.data) return <Navigate to={target} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const { user } = await api<{ user: User }>(`/auth/${mode}`, { method: "POST", body: register ? form : { email: form.email, password: form.password } });
      session.enter(user);
      navigate(target, { replace: true });
    } catch (failure) {
      if (failure instanceof ApiError) {
        setError(failure.code);
        setFields(Object.fromEntries(failure.fields.map((field) => [field.path, true])));
      } else setError("network");
      setBusy(false);
    }
  }

  const message = error ? ((t.auth.errors as Record<string, string>)[error] ?? (error === "validation" ? null : t.common.error)) : null;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
      <div className="relative hidden aspect-square place-items-center overflow-hidden rounded-[2.5rem] bg-card md:grid">
        <GarmentArt garment="dress" pattern="solid" fabric="linen" hex="#b5573a" className="absolute w-1/2 -rotate-6 opacity-90 ltr:left-[12%] rtl:right-[12%]" />
        <GarmentArt garment="shirt" pattern="stripe" fabric="cotton" hex="#2f5d62" className="absolute w-1/2 rotate-6 ltr:right-[10%] rtl:left-[10%]" />
      </div>
      <div className="mx-auto w-full max-w-sm">
        <h1 className="display text-4xl rtl:text-3xl">{register ? t.auth.registerTitle : t.auth.loginTitle}</h1>
        <form onSubmit={submit} noValidate className="mt-8 space-y-4">
          {register && (
            <Field id="name" label={t.auth.name} error={fields.name ? t.common.required : undefined}>
              <input id="name" className="field" value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={fields.name} />
            </Field>
          )}
          <Field id="email" label={t.auth.email} error={fields.email ? t.common.required : undefined}>
            <input id="email" type="email" dir="ltr" className="field rtl:text-right" value={form.email} onChange={set("email")} autoComplete="email" aria-invalid={fields.email} />
          </Field>
          <Field id="password" label={t.auth.password} hint={register ? t.auth.passwordHint : undefined} error={fields.password ? t.auth.passwordHint : undefined}>
            <input id="password" type="password" dir="ltr" className="field rtl:text-right" value={form.password} onChange={set("password")} autoComplete={register ? "new-password" : "current-password"} aria-invalid={fields.password} />
          </Field>
          {message && (
            <p className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay" role="alert">
              {message}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-dark w-full py-3.5">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {register ? t.auth.register : t.auth.login}
          </button>
        </form>
        <p className="mt-5 text-sm text-soft">
          {register ? t.auth.haveAccount : t.auth.noAccount}{" "}
          <Link to={`${register ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline-offset-4 hover:underline">
            {register ? t.auth.login : t.auth.register}
          </Link>
        </p>
        <button type="button" onClick={session.demo} disabled={session.busy} className="btn-quiet -ms-3 mt-2 text-clay">
          {session.busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {t.auth.orDemo}
        </button>
      </div>
    </div>
  );
}
