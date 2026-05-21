import { createApp } from "./app.js";
import { getSettings } from "./config.js";
import { connectDatabase } from "./db.js";

const settings = getSettings();

await connectDatabase(settings);

const app = createApp({ settings });
app.listen(settings.port, "0.0.0.0", () => {
  console.log(`SpeakAble API listening on ${settings.port}`);
});
