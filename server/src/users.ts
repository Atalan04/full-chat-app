import { Router } from "express";
import { requireAuth } from "./auth.js";
import { db } from "./db.js";

interface UserProfileRow {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted_at: string | null;
}

const findUserProfile = db.prepare(
  `SELECT id, username, first_name, last_name, bio, deleted_at
   FROM users WHERE id = ? AND deleted_at IS NULL`,
);

const searchActiveUsers = db.prepare(
  `SELECT id, username, first_name, last_name, bio, deleted_at
   FROM users
   WHERE id <> ? AND deleted_at IS NULL AND username LIKE ? ESCAPE '\\'
   ORDER BY username COLLATE NOCASE
   LIMIT 10`,
);

function getUserProfile(userId: number): UserProfileRow | undefined {
  return findUserProfile.get(userId) as UserProfileRow | undefined;
}

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const user = getUserProfile(request.userId);
  if (!user) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  return response.json({
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    bio: user.bio,
    deleted: user.deleted_at !== null,
  });
});

usersRouter.patch("/me", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const body: unknown = request.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return response.status(400).json({ error: "Profile fields are required." });
  }

  const fields = body as Record<string, unknown>;
  const allowedFields = ["first_name", "last_name", "bio"] as const;
  const keys = Object.keys(fields);
  if (keys.length === 0 || keys.some((key) => !allowedFields.includes(key as (typeof allowedFields)[number]))) {
    return response.status(400).json({ error: "Provide first_name, last_name, or bio to update." });
  }

  const currentUser = getUserProfile(request.userId);
  if (!currentUser) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const nextProfile = {
    first_name: currentUser.first_name,
    last_name: currentUser.last_name,
    bio: currentUser.bio,
  };

  for (const field of allowedFields) {
    if (!(field in fields)) continue;
    const rawValue = fields[field];
    if (typeof rawValue !== "string") {
      return response.status(400).json({ error: `${field} must be text.` });
    }

    const value = rawValue.trim();
    const limit = field === "bio" ? 200 : 40;
    if (value.length > limit) {
      return response.status(400).json({ error: `${field} must be ${limit} characters or fewer.` });
    }
    nextProfile[field] = value;
  }

  db.prepare(
    `UPDATE users SET first_name = ?, last_name = ?, bio = ?
     WHERE id = ? AND deleted_at IS NULL`,
  ).run(nextProfile.first_name, nextProfile.last_name, nextProfile.bio, request.userId);

  const updatedUser = getUserProfile(request.userId);
  if (!updatedUser) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  return response.json({
    id: updatedUser.id,
    username: updatedUser.username,
    first_name: updatedUser.first_name,
    last_name: updatedUser.last_name,
    bio: updatedUser.bio,
    deleted: updatedUser.deleted_at !== null,
  });
});

usersRouter.get("/users", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (!query) {
    return response.status(400).json({ error: "Enter a username to search." });
  }

  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const rows = searchActiveUsers.all(request.userId, `${escapedQuery}%`) as UserProfileRow[];

  return response.json(rows.map((user) => ({
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    bio: user.bio,
    deleted: user.deleted_at !== null,
  })));
});
