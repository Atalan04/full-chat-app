import { Router } from "express";
import { requireAuth } from "./auth.js";
import { db } from "./db.js";
import type { ConversationSummary, Message, UserProfile } from "./types.js";

interface UserRow {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  deleted_at: string | null;
}

interface ConversationSummaryRow {
  id: number;
  peer_id: number;
  peer_username: string;
  peer_first_name: string;
  peer_last_name: string;
  peer_bio: string;
  peer_deleted_at: string | null;
  message_id: number | null;
  message_conversation_id: number | null;
  message_sender_id: number | null;
  message_content: string | null;
  message_created_at: string | null;
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

function toConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  const lastMessage: Message | null = row.message_id === null
    ? null
    : {
        id: row.message_id,
        conversation_id: row.message_conversation_id as number,
        sender_id: row.message_sender_id as number,
        content: row.message_content as string,
        created_at: row.message_created_at as string,
      };

  return {
    id: row.id,
    peer: {
      id: row.peer_id,
      username: row.peer_username,
      first_name: row.peer_first_name,
      last_name: row.peer_last_name,
      bio: row.peer_bio,
      deleted: row.peer_deleted_at !== null,
    },
    last_message: lastMessage,
  };
}

const summarySelect = `
  SELECT c.id,
         p.id AS peer_id,
         p.username AS peer_username,
         p.first_name AS peer_first_name,
         p.last_name AS peer_last_name,
         p.bio AS peer_bio,
         p.deleted_at AS peer_deleted_at,
         m.id AS message_id,
         m.conversation_id AS message_conversation_id,
         m.sender_id AS message_sender_id,
         m.content AS message_content,
         m.created_at AS message_created_at
  FROM conversations c
  JOIN users p ON p.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
  LEFT JOIN messages m ON m.id = (
    SELECT latest.id FROM messages latest
    WHERE latest.conversation_id = c.id
    ORDER BY latest.id DESC LIMIT 1
  )
`;

const findConversationSummary = db.prepare(
  `${summarySelect}
   WHERE c.id = ? AND (c.user_a = ? OR c.user_b = ?)`,
);

const listConversationSummaries = db.prepare(
  `${summarySelect}
   WHERE (c.user_a = ? OR c.user_b = ?)
     AND (c.created_by = ? OR m.id IS NOT NULL)
   ORDER BY COALESCE(m.created_at, c.created_at) DESC, COALESCE(m.id, 0) DESC, c.id DESC`,
);

const findUserByUsername = db.prepare(
  `SELECT id, username, first_name, last_name, bio, deleted_at
   FROM users WHERE username = ? COLLATE NOCASE`,
);

const findConversationByPair = db.prepare(
  `SELECT id FROM conversations WHERE user_a = ? AND user_b = ?`,
);

const createConversation = db.prepare(
  `INSERT OR IGNORE INTO conversations (user_a, user_b, created_by)
   VALUES (?, ?, ?)`,
);

const listRecentMessages = db.prepare(
  `SELECT id, conversation_id, sender_id, content, created_at
   FROM (
     SELECT id, conversation_id, sender_id, content, created_at
     FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 50
   ) ORDER BY id ASC`,
);
const findConversationMembership = db.prepare(
  "SELECT 1 AS found FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?)",
);
const findConversationExists = db.prepare("SELECT 1 AS found FROM conversations WHERE id = ?");

export const conversationsRouter = Router();

conversationsRouter.post("/conversations", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const body: unknown = request.body;
  if (!isRecord(body) || typeof body.username !== "string" || !body.username.trim()) {
    return response.status(400).json({ error: "A username is required." });
  }

  const peer = findUserByUsername.get(body.username.trim()) as UserRow | undefined;
  if (!peer) {
    return response.status(404).json({ error: "No active user has that username." });
  }
  if (peer.deleted_at !== null) {
    return response.status(409).json({ error: "That user is no longer available." });
  }
  if (peer.id === request.userId) {
    return response.status(400).json({ error: "You cannot start a conversation with yourself." });
  }

  const userA = Math.min(request.userId, peer.id);
  const userB = Math.max(request.userId, peer.id);
  const result = createConversation.run(userA, userB, request.userId);
  const conversation = findConversationByPair.get(userA, userB) as { id: number } | undefined;
  if (!conversation) {
    throw new Error("Conversation could not be loaded after creation.");
  }

  const summary = findConversationSummary.get(
    request.userId,
    conversation.id,
    request.userId,
    request.userId,
  ) as ConversationSummaryRow | undefined;
  if (!summary) {
    throw new Error("Conversation summary could not be loaded.");
  }

  return response.status(result.changes === 1 ? 201 : 200).json(toConversationSummary(summary));
});

conversationsRouter.get("/conversations", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const rows = listConversationSummaries.all(
    request.userId,
    request.userId,
    request.userId,
    request.userId,
  ) as ConversationSummaryRow[];

  return response.json(rows.map(toConversationSummary));
});

conversationsRouter.get("/conversations/:id/messages", requireAuth, (request, response) => {
  if (request.userId === undefined) {
    return response.status(401).json({ error: "Not authenticated." });
  }

  const rawConversationId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  if (!/^[1-9]\d*$/.test(rawConversationId)) {
    return response.status(400).json({ error: "The conversation id is invalid." });
  }
  const conversationId = Number(rawConversationId);
  if (!Number.isSafeInteger(conversationId)) {
    return response.status(400).json({ error: "The conversation id is invalid." });
  }
  if (!findConversationExists.get(conversationId)) {
    return response.status(404).json({ error: "Conversation not found." });
  }
  if (!findConversationMembership.get(conversationId, request.userId, request.userId)) {
    return response.status(403).json({ error: "You are not a participant in this conversation." });
  }

  return response.json(listRecentMessages.all(conversationId));
});
