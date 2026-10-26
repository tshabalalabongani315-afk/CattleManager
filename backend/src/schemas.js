import { z } from "zod";
import { HttpError } from "./http.js";

/* ---- primitives ---- */

const emptyToNull = (v) => (typeof v === "string" && v.trim() === "" ? null : v);

const isoDate = z.iso
  .date("Use a valid date (YYYY-MM-DD)")
  .refine((d) => d >= "1900-01-01" && d <= "2100-12-31", "Date is out of range");

const optionalDate = z.preprocess(emptyToNull, isoDate.nullable().optional());

const optionalText = (max) =>
  z.preprocess(emptyToNull, z.string().trim().max(max, `Keep this under ${max} characters`).nullable().optional());

const id = z.coerce.number().int().positive().max(2_147_483_647);

/* ---- auth ---- */

const COMMON_PASSWORDS = new Set([
  "password1234", "1234567890", "qwertyuiop", "iloveyou123", "password123",
  "123456789012", "letmein1234", "welcome1234", "admin1234567", "passw0rd1234",
]);

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.-]{3,32}$/, "Username must be 3–32 characters: letters, numbers, . _ -");

export const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be 128 characters or fewer")
  .refine((p) => !COMMON_PASSWORDS.has(p.toLowerCase()), "That password is too common");

export const signupBody = z.object({ username, password });
export const loginBody = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(128),
});
export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});
export const deleteAccountBody = z.object({ password: z.string().min(1).max(128) });

/* ---- resources ---- */

export const idParams = z.object({ id });

export const cattleBody = z.object({
  tag: z.string().trim().min(1, "Tag is required").max(32, "Tag is too long"),
  breed: z.string().trim().min(1, "Breed is required").max(64, "Breed is too long"),
  sex: z.preprocess(emptyToNull, z.enum(["Male", "Female"]).nullable().optional()),
  date_of_birth: optionalDate.refine(
    (d) => !d || d <= new Date().toISOString().slice(0, 10),
    "Date of birth can't be in the future"
  ),
  status: z.enum(["Active", "Sold", "Deceased"]).optional(),
});
export const cattleUpdateBody = cattleBody.partial();

export const countBody = z.object({
  count: z.coerce.number().int("Count must be a whole number").min(0).max(1_000_000),
  date: optionalDate,
});

export const movementBody = z.object({
  type: z.enum(["IN", "OUT", "SOLD", "DIED"]),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1).max(100_000),
  note: optionalText(500),
  date: isoDate,
});

export const vaccinationBody = z
  .object({
    cattle_id: id,
    vaccine_name: z.string().trim().min(1, "Vaccine name is required").max(100),
    date_given: isoDate,
    next_due_date: optionalDate,
    notes: optionalText(500),
  })
  .refine((v) => !v.next_due_date || v.next_due_date >= v.date_given, {
    message: "Next due date can't be before the date given",
    path: ["next_due_date"],
  });

export const weightBody = z.object({
  cattle_id: id,
  date: isoDate,
  weight_kg: z.coerce.number().positive("Weight must be above 0").max(3000, "Weight looks too high"),
});

export const cattleIdQuery = z.object({ cattle_id: id.optional() });
export const requiredCattleIdQuery = z.object({ cattle_id: id });

/* ---- middleware ---- */

/** Validates req.body / req.query / req.params and replaces them with parsed values. */
export const validate = (shape) => (req, _res, next) => {
  for (const part of ["params", "query", "body"]) {
    if (!shape[part]) continue;
    const result = shape[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(new HttpError(400, details[0]?.message ?? "Invalid request", details));
    }
    // req.query is a getter in Express 5-style objects; define explicitly.
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
  }
  next();
};
