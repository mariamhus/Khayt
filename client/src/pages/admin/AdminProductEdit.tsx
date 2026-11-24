import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, ExternalLink, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { api, ApiError, prepareImage, uploadImage, CATEGORIES, FABRICS, GARMENTS, PATTERNS, type Category, type Fabric, type Garment, type Pattern } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useTitle } from "../../lib/hooks";
import { useAdminProduct, useMeta } from "../../lib/queries";
import { GarmentArt } from "../../components/GarmentArt";
import { ErrorBox, Field, Modal, Spinner } from "../../components/ui";

type Form = {
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  category: Category;
  garment: Garment;
  fabric: Fabric;
  pattern: Pattern;
  price: string;
  compareAt: string;
  colors: string[];
  sizes: string[];
  featured: boolean;
  active: boolean;
  stock: Record<string, string>;
  images: Record<string, string>;
  swatches: Record<string, string>;
};

const BLANK: Form = { nameEn: "", nameAr: "", descEn: "", descAr: "", category: "tops", garment: "tee", fabric: "cotton", pattern: "solid", price: "", compareAt: "", colors: ["ivory"], sizes: ["S", "M", "L"], featured: false, active: true, stock: {}, images: {}, swatches: {} };
const toEgp = (piastres: number) => String(Math.round(piastres / 100));
const fromEgp = (value: string) => {
  const digits = value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[,\s]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) * 100 : null;
};

export default function AdminProductEdit() {
  const { id } = useParams();
  const editing = Boolean(id);
  const query = useAdminProduct(id);
  const meta = useMeta();
  const { t, pick, dir } = useI18n();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form, setForm] = useState<Form | null>(editing ? null : BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirm, setConfirm] = useState(false);
  useTitle(`${editing ? t.admin.edit : t.admin.newProduct} · ${t.brand}`);

  useEffect(() => {
    if (!query.data || form) return;
    const p = query.data;
    setForm({
      nameEn: p.name.en,
      nameAr: p.name.ar,
      descEn: p.description.en,
      descAr: p.description.ar,
      category: p.category,
      garment: p.garment,
      fabric: p.fabric,
      pattern: p.pattern,
      price: toEgp(p.price),
      compareAt: p.compareAt ? toEgp(p.compareAt) : "",
      colors: p.colors.map((c) => c.key),
      sizes: p.sizes,
      featured: p.featured,
      active: p.active,
      stock: Object.fromEntries(p.stock.map((row) => [`${row.color}|${row.size}`, String(row.quantity)])),
      images: p.images ?? {},
      swatches: p.swatches ?? {},
    });
  }, [query.data, form]);

  if (query.isError) return <ErrorBox onRetry={() => query.refetch()} />;
  if (!form || !meta.data) return <Spinner />;
  const palette = meta.data.palette;
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const preview = palette.find((c) => c.key === form.colors[0]) ?? palette[0]!;
  const update = (patch: Partial<Form>) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setState("idle");
  };
  const toggle = (key: "colors" | "sizes", value: string) => {
    const list = form[key];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    const order = key === "sizes" ? meta.data!.sizes : palette.map((c) => c.key);
    update({ [key]: order.filter((item) => next.includes(item)) } as Partial<Form>);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const price = fromEgp(form.price);
    const compareAt = form.compareAt ? fromEgp(form.compareAt) : null;
    const next: Record<string, string> = {};
    if (form.nameEn.trim().length < 2) next.nameEn = t.common.required;
    if (form.nameAr.trim().length < 2) next.nameAr = t.common.required;
    if (!price || price < 100) next.price = t.common.required;
    if (form.compareAt && (!compareAt || (price && compareAt <= price))) next.compareAt = t.admin.errors.compare_not_higher;
    if (!form.colors.length) next.colors = t.common.required;
    if (!form.sizes.length) next.sizes = t.common.required;
    setErrors(next);
    if (Object.keys(next).length) return;
    setState("saving");
    const body = {
      name: { en: form.nameEn.trim(), ar: form.nameAr.trim() },
      description: { en: form.descEn.trim(), ar: form.descAr.trim() },
      category: form.category,
      garment: form.garment,
      fabric: form.fabric,
      pattern: form.pattern,
      price,
      compareAt,
      colors: form.colors,
      sizes: form.sizes,
      featured: form.featured,
      active: form.active,
      stock: form.colors.flatMap((color) => form.sizes.map((size) => ({ color, size, quantity: Math.max(0, Math.min(9999, Number(form.stock[`${color}|${size}`] ?? 0) || 0)) }))),
      images: Object.fromEntries(Object.entries(form.images).filter(([key]) => form.colors.includes(key))),
      swatches: Object.fromEntries(Object.entries(form.swatches).filter(([key]) => form.colors.includes(key))),
    };
    try {
      if (editing) await api(`/admin/products/${id}`, { method: "PUT", body });
      else {
        const { product } = await api<{ product: { id: string } }>("/admin/products", { method: "POST", body });
        client.invalidateQueries();
        navigate(`/admin/products/${product.id}`, { replace: true });
        return;
      }
      client.invalidateQueries();
      setState("saved");
    } catch (failure) {
      const code = failure instanceof ApiError ? (failure.fields[0]?.message ?? failure.code) : "generic";
      setErrors({ form: (t.admin.errors as Record<string, string>)[code] ?? t.admin.errors.generic });
      setState("idle");
    }
  }

  const remove = async () => {
    setConfirm(false);
    await api(`/admin/products/${id}`, { method: "DELETE" });
    client.invalidateQueries();
    navigate("/admin/products", { replace: true });
  };

  const select = <K extends keyof Form>(key: K, options: readonly string[], labels: Record<string, string>) => (
    <select id={`p-${key}`} className="field" value={form[key] as string} onChange={(event) => update({ [key]: event.target.value } as Partial<Form>)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} noValidate className="rise">
      <Link to="/admin/products" className="btn-quiet -ms-3 mb-2">
        <Back className="size-4" />
        {t.admin.products}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-4xl rtl:text-3xl">{editing ? form.nameEn || t.admin.edit : t.admin.newProduct}</h1>
        {editing && query.data && (
          <div className="flex gap-2">
            <a href={`/p/${query.data.slug}`} target="_blank" rel="noreferrer" className="btn-ghost">
              <ExternalLink className="size-4" />
              {t.admin.preview}
            </a>
            <button type="button" onClick={() => setConfirm(true)} className="btn-danger">
              <Trash2 className="size-4" />
              {t.admin.delete}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_17rem]">
        <div className="space-y-4">
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field id="p-nameEn" label={t.admin.nameEn} error={errors.nameEn}>
              <input id="p-nameEn" dir="ltr" className="field" value={form.nameEn} onChange={(e) => update({ nameEn: e.target.value })} maxLength={80} aria-invalid={Boolean(errors.nameEn)} />
            </Field>
            <Field id="p-nameAr" label={t.admin.nameAr} error={errors.nameAr}>
              <input id="p-nameAr" dir="rtl" className="field" value={form.nameAr} onChange={(e) => update({ nameAr: e.target.value })} maxLength={80} aria-invalid={Boolean(errors.nameAr)} />
            </Field>
            <Field id="p-descEn" label={t.admin.descEn}>
              <textarea id="p-descEn" dir="ltr" className="field min-h-24" value={form.descEn} onChange={(e) => update({ descEn: e.target.value })} maxLength={600} />
            </Field>
            <Field id="p-descAr" label={t.admin.descAr}>
              <textarea id="p-descAr" dir="rtl" className="field min-h-24" value={form.descAr} onChange={(e) => update({ descAr: e.target.value })} maxLength={600} />
            </Field>
          </section>

          <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field id="p-category" label={t.admin.category}>
              {select("category", CATEGORIES, t.category)}
            </Field>
            <Field id="p-garment" label={t.admin.garment}>
              {select("garment", GARMENTS, t.garment)}
            </Field>
            <Field id="p-fabric" label={t.admin.fabric}>
              {select("fabric", FABRICS, t.fabric)}
            </Field>
            <Field id="p-pattern" label={t.admin.pattern}>
              {select("pattern", PATTERNS, t.pattern)}
            </Field>
            <Field id="p-price" label={t.admin.price} error={errors.price}>
              <input id="p-price" className="field num" inputMode="numeric" value={form.price} onChange={(e) => update({ price: e.target.value })} aria-invalid={Boolean(errors.price)} />
            </Field>
            <Field id="p-compareAt" label={t.admin.compareAt} error={errors.compareAt}>
              <input id="p-compareAt" className="field num" inputMode="numeric" value={form.compareAt} onChange={(e) => update({ compareAt: e.target.value })} aria-invalid={Boolean(errors.compareAt)} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4 accent-clay" checked={form.featured} onChange={(e) => update({ featured: e.target.checked })} />
              {t.admin.featured}
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4 accent-clay" checked={form.active} onChange={(e) => update({ active: e.target.checked })} />
              {t.admin.active}
            </label>
          </section>

          <section className="card p-5">
            <div className="label">{t.admin.colours}</div>
            <div className="flex flex-wrap gap-2">
              {palette.map((color) => (
                <button key={color.key} type="button" onClick={() => toggle("colors", color.key)} aria-pressed={form.colors.includes(color.key)} className={`ring-focus flex items-center gap-2 rounded-full border py-1.5 ps-1.5 pe-3 text-xs font-medium transition ${form.colors.includes(color.key) ? "border-ink bg-white" : "border-line-strong text-soft"}`}>
                  <span className="size-5 rounded-full border border-black/10" style={{ background: color.hex }} />
                  {pick(color.name)}
                  {form.colors.includes(color.key) && <Check className="size-3.5" />}
                </button>
              ))}
            </div>
            {errors.colors && <p className="mt-1.5 text-xs text-clay">{errors.colors}</p>}
            <div className="label mt-5">{t.admin.sizes}</div>
            <div className="flex flex-wrap gap-2">
              {meta.data.sizes.map((size) => (
                <button key={size} type="button" onClick={() => toggle("sizes", size)} aria-pressed={form.sizes.includes(size)} className={`ring-focus rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${form.sizes.includes(size) ? "border-ink bg-ink text-linen" : "border-line-strong text-soft"}`}>
                  {size}
                </button>
              ))}
            </div>
            {errors.sizes && <p className="mt-1.5 text-xs text-clay">{errors.sizes}</p>}
          </section>

          {form.colors.length > 0 && (
            <section className="card p-5">
              <div className="label">{t.admin.photos}</div>
              <p className="-mt-1 mb-4 text-xs text-faint">{t.admin.photosHint} {t.admin.fabricHint}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {form.colors.map((key) => {
                  const color = palette.find((c) => c.key === key)!;
                  return (
                    <div key={key} className="rounded-2xl border border-line p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
                        <span className="inline-block size-3 rounded-full" style={{ background: color.hex }} />
                        {pick(color.name)}
                      </div>
                      <div className="flex items-start gap-3">
                        <PhotoSlot label={pick(color.name)} url={form.images[key]} tall onChange={(url) => update({ images: withKey(form.images, key, url) })} fallback={<GarmentArt garment={form.garment} pattern={form.pattern} fabric={form.fabric} hex={color.hex} className="h-full" />} />
                        <PhotoSlot label={`${t.admin.fabricPhoto} · ${pick(color.name)}`} url={form.swatches[key]} onChange={(url) => update({ swatches: withKey(form.swatches, key, url) })} fallback={<span className="text-[10px] text-faint">{t.admin.fabricPhoto}</span>} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {form.colors.length > 0 && form.sizes.length > 0 && (
            <section className="card overflow-x-auto p-5">
              <div className="label">{t.admin.stock}</div>
              <p className="-mt-1 mb-3 text-xs text-faint">{t.admin.stockHint}</p>
              <table className="text-sm">
                <thead>
                  <tr>
                    <th />
                    {form.sizes.map((size) => (
                      <th key={size} className="px-1 pb-2 text-xs font-semibold text-soft">
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.colors.map((key) => {
                    const color = palette.find((c) => c.key === key)!;
                    return (
                      <tr key={key}>
                        <th className="pe-3 text-start text-xs font-medium whitespace-nowrap">
                          <span className="me-2 inline-block size-3 rounded-full align-middle" style={{ background: color.hex }} />
                          {pick(color.name)}
                        </th>
                        {form.sizes.map((size) => (
                          <td key={size} className="p-1">
                            <input className="field num w-16 px-2 py-1.5 text-center" inputMode="numeric" aria-label={`${pick(color.name)} ${size}`} value={form.stock[`${key}|${size}`] ?? "0"} onChange={(e) => update({ stock: { ...form.stock, [`${key}|${size}`]: e.target.value.replace(/\D/g, "").slice(0, 4) } })} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card grid place-items-center p-6">
            <GarmentArt garment={form.garment} pattern={form.pattern} fabric={form.fabric} hex={preview.hex} image={form.images[preview.key]} className="w-40" />
            <div className="mt-3 text-center text-sm font-semibold">{form.nameEn || "—"}</div>
          </div>
          {errors.form && <p className="rounded-2xl bg-clay-soft px-4 py-3 text-sm text-clay">{errors.form}</p>}
          <button type="submit" disabled={state === "saving"} className="btn-dark w-full py-3">
            {state === "saving" ? <Loader2 className="size-4 animate-spin" /> : state === "saved" ? <Check className="size-4" /> : null}
            {state === "saved" ? t.admin.saved : t.admin.save}
          </button>
        </aside>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title={t.admin.delete}>
        <p className="text-sm text-soft">{t.admin.deleteConfirm}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>
            {t.common.cancel}
          </button>
          <button type="button" className="btn-danger" onClick={remove}>
            {t.admin.delete}
          </button>
        </div>
      </Modal>
    </form>
  );
}

function withKey(map: Record<string, string>, key: string, url: string | null) {
  const next = { ...map };
  if (url) next[key] = url;
  else delete next[key];
  return next;
}

function PhotoSlot({ label, url, tall = false, onChange, fallback }: { label: string; url?: string; tall?: boolean; onChange: (url: string | null) => void; fallback: ReactNode }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pickFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url: next } = await uploadImage(await prepareImage(file, tall ? 1400 : 700));
      onChange(next);
    } catch (problem) {
      const code = problem instanceof ApiError ? problem.code : "generic";
      setError((t.admin.uploadErrors as Record<string, string>)[code] ?? t.admin.uploadErrors.generic);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={tall ? "w-32" : "w-24"}>
      <div className={`relative grid place-items-center overflow-hidden rounded-xl bg-linen ${tall ? "aspect-[100/130]" : "aspect-square"}`}>
        {url ? <img src={url} alt="" className={tall ? "h-full w-full object-contain" : "h-full w-full object-cover"} /> : <div className={`grid h-full w-full place-items-center opacity-50 ${tall ? "p-4" : ""}`}>{fallback}</div>}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {url && !busy && (
          <button type="button" onClick={() => onChange(null)} aria-label={`${t.admin.remove} ${label}`} className="ring-focus absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 shadow">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <label className="btn-ghost mt-2 w-full cursor-pointer justify-center px-2 py-1.5 text-xs">
        <ImagePlus className="size-3.5" />
        {busy ? t.admin.uploading : url ? t.admin.replace : t.admin.upload}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={label} onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {error && <p className="mt-1 text-[11px] text-clay">{error}</p>}
    </div>
  );
}
