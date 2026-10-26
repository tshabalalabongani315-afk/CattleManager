import "dotenv/config";
import { createApp } from "./src/app.js";

// Local development entry point. On Vercel the same app is exported through
// api/index.js instead, so this file is never used there.
const app = await createApp();
const { port } = app.locals.config;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}/api (${app.locals.db.kind})`);
});

process.on("unhandledRejection", (err) => console.error("[unhandledRejection]", err));
