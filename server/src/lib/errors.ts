import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export const notFound = (what = "not_found") => new HttpError(404, what);

export const routeNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: "route_not_found" } });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: "validation", fields: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) } });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "bad_json" } });
    return;
  }
  if (error?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "too_large" } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: "server_error" } });
};
