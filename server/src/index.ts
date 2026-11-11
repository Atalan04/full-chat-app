import cors from "cors";
import express from "express";
import { db } from "./db.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Set it in server/.env.");
}

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000" }));
app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
