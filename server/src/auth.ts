import bcrypt from "bcryptjs";
import { Router, type Request, type Response, type NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { db } from "./db.js";

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted_at: string | null;
}

interface UserProfile {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted: boolean;
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export const authRouter = Router();

const findUserByUsername = db.prepare(
  `SELECT id, username, password_hash, first_name, last_name, bio, deleted_at
   FROM users WHERE username = ? COLLATE NOCASE`,
);

const findActiveUserById = db.prepare(
  `SELECT id, username, password_hash, first_name, last_name, bio, deleted_at
   FROM users WHERE id = ? AND deleted_at IS NULL`,
);

function getUserByUsername(username: string): UserRow | undefined {
  return findUserByUsername.get(username) as UserRow | undefined;
}

function getActiveUserById(userId: number): UserRow | undefined {
  return findActiveUserById.get(userId) as UserRow | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toUserProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    bio: user.bio,
    deleted: user.deleted_at !== null,
  };
}

function signToken(userId: number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required. Set it in server/.env.");
  }

  return jwt.sign({}, secret, { subject: String(userId), expiresIn: "7d" });
}

authRouter.post("/signup", async (request: Request, response: Response) => {
  const body: unknown = request.body;
  if (!isRecord(body)) {
    return response.status(400).json({ error: "Username and password are required." });
  }

  const { username, password } = body;
  if (
    typeof username !== "string" ||
    !/^[a-zA-Z0-9_]{3,20}$/.test(username) ||
    typeof password !== "string" ||
    password.length < 6
  ) {
    return response.status(400).json({
      error: "Username must be 3–20 letters, numbers, or underscores, and password must be at least 6 characters.",
    });
  }

  if (getUserByUsername(username)) {
    return response.status(409).json({ error: "That username is already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let userId: number;
  try {
    const result = db
      .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
      .run(username, passwordHash);
    userId = Number(result.lastInsertRowid);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: users.username")) {
      return response.status(409).json({ error: "That username is already taken." });
    }
    throw error;
  }

  const user = getActiveUserById(userId);
  if (!user) {
    throw new Error("Newly created account could not be loaded.");
  }

  return response.status(201).json({ token: signToken(user.id), user: toUserProfile(user) });
});

authRouter.post("/login", async (request: Request, response: Response) => {
  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.username !== "string" || typeof body.password !== "string") {
    return response.status(400).json({ error: "Username and password are required." });
  }

  const user = getUserByUsername(body.username);
  if (!user || user.deleted_at !== null || !(await bcrypt.compare(body.password, user.password_hash))) {
    return response.status(401).json({ error: "Invalid username or password." });
  }

  return response.json({ token: signToken(user.id), user: toUserProfile(user) });
});

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const secret = process.env.JWT_SECRET;

  if (!match || !secret) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  let payload: string | JwtPayload;
  try {
    payload = jwt.verify(match[1], secret);
  } catch {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId < 1 || !getActiveUserById(userId)) {
    response.status(401).json({ error: "Not authenticated." });
    return;
  }

  request.userId = userId;
  next();
}
