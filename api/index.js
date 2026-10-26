import { createApp } from "../backend/src/app.js";

// Vercel serverless entry. vercel.json rewrites /api/* here; Express then
// routes on the original URL. The app is built once per warm instance.
let appPromise;

export default async function handler(req, res) {
  appPromise ??= createApp();
  const app = await appPromise;
  return app(req, res);
}
