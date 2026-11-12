import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { authRouter } from "./auth.js";
import { conversationsRouter } from "./conversations.js";
import { db } from "./db.js";
import { usersRouter } from "./users.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Set it in server/.env.");
}

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000" }));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api", usersRouter);
app.use("/api", conversationsRouter);
app.get("/api/health", (_request, response) => response.json({ ok: true }));

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  const status =
    typeof error === "object" && error !== null && "status" in error &&
    typeof error.status === "number" && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  const message = status === 400 ? "Invalid request body." : "Internal server error.";
  response.status(status).json({ error: message });
});

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
