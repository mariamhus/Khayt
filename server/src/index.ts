import { createApp } from "./app.js";
import { env } from "./env.js";
import { getDb } from "./db/index.js";

await getDb();
createApp().listen(env.port, () => {
  console.log(`Khayt API listening on :${env.port}`);
});
