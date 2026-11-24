const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" });

export const today = (now = new Date()) => format.format(now);

export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function addDays(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const monthKey = (key: string) => key.slice(0, 7);

export function lastMonths(key: string, count: number) {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
}
