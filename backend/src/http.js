import crypto from "node:crypto";

/** An error whose message is safe to show the client. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.expose = true;
    this.details = details;
  }
}

export const notFound = () => new HttpError(404, "Not found");

/** Express 4 does not catch rejected promises — this forwards them to the error handler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function requestId(req, res, next) {
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}

// Postgres error codes we translate into friendly client errors.
const PG_UNIQUE_VIOLATION = "23505";
const PG_CHECK_VIOLATION = "23514";
const PG_FK_VIOLATION = "23503";
const PG_INVALID_TEXT = "22P02";

/**
 * Last-resort handler. Known errors become clean JSON; anything unexpected is
 * logged server-side (with the request id, never the body) and returned as a
 * generic 500 — no stack traces, SQL, or column names reach the client.
 */
export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large" });
  }
  if (err.expose && err.status) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.code === PG_UNIQUE_VIOLATION) {
    return res.status(409).json({ error: "That record already exists" });
  }
  if (err.code === PG_CHECK_VIOLATION || err.code === PG_INVALID_TEXT) {
    return res.status(400).json({ error: "Invalid value" });
  }
  if (err.code === PG_FK_VIOLATION) {
    return res.status(404).json({ error: "Not found" });
  }

  console.error(`[error] ${req.id} ${req.method} ${req.path}`, err);
  res.status(500).json({ error: "Something went wrong. Please try again.", requestId: req.id });
}
