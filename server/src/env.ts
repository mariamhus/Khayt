const production = process.env.NODE_ENV === "production";

function secret() {
  const value = process.env.JWT_SECRET;
  if (value && value.length >= 32) return value;
  if (production && process.env.DATABASE_URL) throw new Error("JWT_SECRET must be set to at least 32 characters in production");
  return "khayt-local-development-secret-change-me";
}

export const env = {
  production,
  test: process.env.NODE_ENV === "test" || Boolean(process.env.VITEST),
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: secret(),
  clientOrigins: (process.env.CLIENT_URL ?? "http://localhost:5173")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM || "Khayt <onboarding@resend.dev>",
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
};
