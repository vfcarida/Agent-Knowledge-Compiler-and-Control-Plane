import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 9999;

// Serve the static html directory
app.use(express.static(path.join(__dirname, "../html")));

app.listen(PORT, () => {
  console.log(
    `[Mock Server] Serving test fixtures on http://localhost:${PORT}`,
  );
});
