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
